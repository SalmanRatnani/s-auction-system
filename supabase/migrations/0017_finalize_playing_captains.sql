-- 0017: complete transactional round two and final playing captain allotment.
-- Migration depends on team_captain_partnerships and dual_playing_captain_slots.
-- The final allotment is one all-or-nothing database transaction.

alter table public.auctions
  add column if not exists captains_finalized_at timestamptz;
alter table public.auctions
  add column if not exists round_two_started_at timestamptz;

-- Stronger reservation rule: one grade per team, even across both playing captains.
create or replace function public.check_playing_captain_slots()
returns trigger language plpgsql set search_path=public as $$
declare v_first_grade text; v_second_grade text; v_status text;
begin
  perform pg_advisory_xact_lock(hashtext(new.auction_id::text));
  select status into v_status from public.auctions where id=new.auction_id;
  if v_status <> 'DRAFT' then
    raise exception 'Playing captain reservations can only change in DRAFT mode';
  end if;
  if new.captain_player_id is not null then
    select grade into v_first_grade from public.players where id=new.captain_player_id and status='IN_POOL';
    if v_first_grade is null then raise exception 'First playing captain must be a graded in-pool player'; end if;
  end if;
  if new.co_captain_player_id is not null then
    select grade into v_second_grade from public.players where id=new.co_captain_player_id and status='IN_POOL';
    if v_second_grade is null then raise exception 'Second playing captain must be a graded in-pool player'; end if;
  end if;
  if new.captain_player_id is not null and new.captain_player_id=new.co_captain_player_id then
    raise exception 'Playing captain slots must contain different players';
  end if;
  if v_first_grade is not null and v_first_grade=v_second_grade then
    raise exception 'The two playing captains must have different categories';
  end if;
  if exists(
    select 1 from public.teams t where t.id<>new.id
    and (new.captain_player_id is not null and
         (t.captain_player_id=new.captain_player_id or t.co_captain_player_id=new.captain_player_id)
      or new.co_captain_player_id is not null and
         (t.captain_player_id=new.co_captain_player_id or t.co_captain_player_id=new.co_captain_player_id))
  ) then raise exception 'Playing captain already reserved by another team'; end if;
  if exists(
    select 1 from public.team_players tp join public.players p on p.id=tp.player_id
    where tp.team_id=new.id and (p.grade=v_first_grade or p.grade=v_second_grade)
  ) then raise exception 'Team already owns a player in one of the reserved categories'; end if;
  return new;
end $$;

-- Round 2 uses the SAME registered players but new auction_player rows.
-- Round 1 bids/history remain attached to the previous round.
-- Two simultaneous draws cannot put separate players on the block.
-- This index will reject the migration if inconsistent CURRENT rows exist.
create unique index if not exists auction_players_one_current_per_auction
  on public.auction_players(auction_id) where status='CURRENT';

create or replace function public.start_round_two(p_auction_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_role text; v_status text; v_count int; v_round_two_started_at timestamptz;
begin
  select role into v_role from public.users where id=auth.uid();
  if v_role <> 'MAIN_CONTROLLER' then raise exception 'Only controller can start Round 2'; end if;
  select status,round_two_started_at into v_status,v_round_two_started_at
    from public.auctions where id=p_auction_id for update;
  if v_status is distinct from 'LIVE' then raise exception 'Auction must be LIVE'; end if;
  if v_round_two_started_at is not null then raise exception 'Round 2 has already started'; end if;
  if exists(select 1 from public.auction_players
    where auction_id=p_auction_id and status in ('PENDING','CURRENT'))
    then raise exception 'Complete all Round 1 draws before beginning Round 2'; end if;
  select count(*) into v_count from public.auction_players
    where auction_id=p_auction_id and status='UNSOLD' and round=1;
  if v_count=0 then raise exception 'No Round 1 unsold players to re-auction'; end if;
  insert into public.auction_players(auction_id,player_id,round,status,order_index)
  select auction_id,player_id,2,'PENDING',order_index
  from public.auction_players where auction_id=p_auction_id and status='UNSOLD' and round=1;
  update public.players p set status='IN_POOL'
    where exists(select 1 from public.auction_players ap where ap.auction_id=p_auction_id
    and ap.round=1 and ap.status='UNSOLD' and ap.player_id=p.id);
  update public.auctions set round_two_started_at=now() where id=p_auction_id;
  insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
    values(auth.uid(),'ROUND2_STARTED','auction',p_auction_id,jsonb_build_object('requeued',v_count));
  return jsonb_build_object('requeued',v_count);
end $$;

-- Supply base-price defaults from the server's one source of truth:
-- src/constants/categories.ts; the auction config can override them.
create or replace function public.finalize_playing_captains(
  p_auction_id uuid, p_default_base_prices jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_role text; v_status text; v_config jsonb; v_finalized timestamptz; v_round_two_started_at timestamptz;
  v_grade text; v_price bigint; v_average numeric; v_fallback bigint;
  v_remaining bigint; v_squad int; v_max_squad int; v_count int:=0;
  v_reserved record; v_result jsonb:='[]'::jsonb;
  v_existing_ap uuid;
begin
  select role into v_role from public.users where id=auth.uid();
  if v_role <> 'MAIN_CONTROLLER' then raise exception 'Only controller can finalize playing captains'; end if;
  select status,config,captains_finalized_at,round_two_started_at into v_status,v_config,v_finalized,v_round_two_started_at
    from public.auctions where id=p_auction_id for update;
  if not found then raise exception 'Auction not found'; end if;
  if v_status is distinct from 'LIVE' then raise exception 'Auction must be LIVE'; end if;
  if v_finalized is not null then raise exception 'Playing captains already finalized'; end if;
  if not exists(select 1 from public.auction_players where auction_id=p_auction_id and round=1) then
    raise exception 'Cannot finalize before Round 1 has started';
  end if;

  if exists(select 1 from public.auction_players
      where auction_id=p_auction_id and status in ('PENDING','CURRENT')) then
    raise exception 'Complete all ordinary auction draws before final allotment';
  end if;
  if exists(select 1 from public.auction_players
      where auction_id=p_auction_id and round=1 and status='UNSOLD')
    and v_round_two_started_at is null then
    raise exception 'Round 1 has unsold players. Complete Round 2 before final allotment';
  end if;

  for v_reserved in
    select t.id as team_id,t.name as team_name,t.initial_purse,
      c.player_id,c.slot,p.grade,p.status as player_status
    from public.teams t
    cross join lateral (
      values(t.captain_player_id,1),(t.co_captain_player_id,2)
    ) c(player_id,slot)
    join public.players p on p.id=c.player_id
    where t.auction_id=p_auction_id
    order by t.id,c.slot
  loop
    v_grade:=v_reserved.grade;
    if v_grade is null or v_reserved.player_status <> 'IN_POOL' then
      raise exception 'Reserved playing captain must be a graded IN_POOL player';
    end if;
    if exists(select 1 from public.team_players where auction_id=p_auction_id and player_id=v_reserved.player_id) then
      raise exception 'Reserved captain already appears on a team roster';
    end if;
    if exists(select 1 from public.team_players tp
      join public.players p on p.id=tp.player_id
      where tp.auction_id=p_auction_id and tp.team_id=v_reserved.team_id and p.grade=v_grade) then
      raise exception 'Team % already owns category %',v_reserved.team_name,v_grade;
    end if;

    select round(avg(tp.price)) into v_average
      from public.team_players tp
      join public.players p on p.id=tp.player_id
      where tp.auction_id=p_auction_id and p.grade=v_grade
        and tp.acquired_via <> 'MANUAL_ALLOT';
    v_fallback:=(p_default_base_prices->>v_grade)::bigint;
    v_price:=coalesce(v_average::bigint,
      nullif((v_config->'basePrices'->>v_grade)::bigint,0),
      v_fallback);
    if v_price is null or v_price<=0 then
      raise exception 'No valid base or average price for grade %',v_grade;
    end if;

    select t.initial_purse+coalesce(sum(pl.delta),0) into v_remaining
      from public.teams t left join public.purse_ledger pl
      on pl.team_id=t.id and pl.auction_id=p_auction_id
      where t.id=v_reserved.team_id group by t.initial_purse;
    if v_price > v_remaining then
      raise exception 'Team % needs % paise for reserved captain but has only %',
        v_reserved.team_name,v_price,v_remaining;
    end if;

    select count(*) into v_squad from public.team_players where auction_id=p_auction_id and team_id=v_reserved.team_id;
    v_max_squad:=coalesce(nullif((v_config->>'maxSquad')::int,0),18);
    if v_squad >= v_max_squad then raise exception 'Team % has a full squad',v_reserved.team_name; end if;

    -- Historical, incorrectly seeded captains can have a PENDING queue row.
    select id into v_existing_ap from public.auction_players
      where auction_id=p_auction_id and player_id=v_reserved.player_id order by round desc limit 1 for update;
    if v_existing_ap is null then
      insert into public.auction_players(auction_id,player_id,round,status,sold_to_team_id,sold_price)
      values(p_auction_id,v_reserved.player_id,3,'SOLD',v_reserved.team_id,v_price);
    else
      update public.auction_players set status='SOLD',sold_to_team_id=v_reserved.team_id,sold_price=v_price
        where id=v_existing_ap and status in ('PENDING','UNSOLD');
      if not found then raise exception 'Reserved captain has an incompatible auction status'; end if;
    end if;
    insert into public.team_players(auction_id,team_id,player_id,price,acquired_via)
      values(p_auction_id,v_reserved.team_id,v_reserved.player_id,v_price,'MANUAL_ALLOT');
    insert into public.purse_ledger(auction_id,team_id,delta,reason,related_bid_id,created_by)
      values(p_auction_id,v_reserved.team_id,-v_price,'BID_WON',null,auth.uid());
    update public.players set status='SOLD' where id=v_reserved.player_id;
    insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
      values(auth.uid(),'CAPTAIN_ASSIGNED','player',v_reserved.player_id,
        jsonb_build_object('team_id',v_reserved.team_id,'slot',v_reserved.slot,
          'grade',v_grade,'price',v_price,
          'basis',case when v_average is null then 'base_price' else 'average' end));
    v_result:=v_result||jsonb_build_array(jsonb_build_object(
      'player_id',v_reserved.player_id,'team_id',v_reserved.team_id,'team_name',v_reserved.team_name,
      'slot',v_reserved.slot,'grade',v_grade,'price',v_price,
      'basis',case when v_average is null then 'base_price' else 'average' end));
    v_count:=v_count+1;
  end loop;

  update public.auctions set captains_finalized_at=now() where id=p_auction_id;
  insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
    values(auth.uid(),'PLAYING_CAPTAINS_FINALIZED','auction',p_auction_id,
      jsonb_build_object('count',v_count,'assignments',v_result));
  return jsonb_build_object('count',v_count,'assignments',v_result);
end $$;

-- Restrict privileged entry points to authenticated users; each RPC also
-- independently validates the controlling role via auth.uid().
revoke all on function public.start_round_two(uuid) from public,anon;
grant execute on function public.start_round_two(uuid) to authenticated;
revoke all on function public.finalize_playing_captains(uuid,jsonb) from public,anon;
grant execute on function public.finalize_playing_captains(uuid,jsonb) to authenticated;

-- Defense in depth: both playing captains and both reserved grades are
-- blocked from bidding and from being sold through the normal RPC.
create or replace function public.place_bid(
  p_auction_player_id uuid,
  p_amount bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_auction_id uuid;
  v_player_status text;
  v_player_grade text;
  v_player_id uuid;
  v_team_id uuid;
  v_initial_purse bigint;
  v_spent bigint;
  v_remaining bigint;
  v_squad_count int;
  v_max_squad int := 18;
  v_highest bigint := 0;
  v_bid_id uuid;
  v_captain_team_id uuid;
  v_category_owned int;
  v_is_playing_captain boolean;
  v_reserved_grades int;
  v_reserved_slots int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock the auction_player row → serializes concurrent bids
  select auction_id, status, player_id
    into v_auction_id, v_player_status, v_player_id
  from public.auction_players
  where id = p_auction_player_id
  for update;

  if not found then
    raise exception 'Player not in auction';
  end if;

  if v_player_status <> 'CURRENT' then
    raise exception 'Player is not currently on the block';
  end if;
  if not exists(select 1 from public.auctions where id = v_auction_id and status = 'LIVE' and captains_finalized_at is null) then
    raise exception 'Auction is not LIVE or playing captains have been finalized';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Bid amount must be positive';
  end if;

  -- Playing captains are assigned, not auctioned
  select exists (
    select 1 from public.teams
    where auction_id = v_auction_id
      and (captain_player_id = v_player_id or co_captain_player_id = v_player_id)
  ) into v_is_playing_captain;

  if v_is_playing_captain then
    raise exception 'This player is a team captain and cannot be bid on';
  end if;

  -- Current player's grade
  select grade into v_player_grade
  from public.players
  where id = v_player_id;

  -- Bidder must captain a team in this auction
  select id into v_captain_team_id
  from public.teams
  where auction_id = v_auction_id
    and (captain_user_id = v_uid or co_captain_user_id = v_uid);

  if v_captain_team_id is null then
    raise exception 'You are not a captain in this auction';
  end if;

  v_team_id := v_captain_team_id;

  -- One player per category per team
  select count(*) into v_category_owned
  from public.team_players tp
  join public.players p on p.id = tp.player_id
  where tp.team_id = v_team_id
    and tp.auction_id = v_auction_id
    and p.grade = v_player_grade;

  if v_category_owned > 0 then
    raise exception 'Your team already has a % player. You can only own one player per category.', v_player_grade;
  end if;

  -- Do not sell the grade reserved for either playing captain.
  select count(*) into v_reserved_grades from public.teams t
  left join public.players p1 on p1.id = t.captain_player_id
  left join public.players p2 on p2.id = t.co_captain_player_id
  where t.id = v_team_id and (p1.grade = v_player_grade or p2.grade = v_player_grade);
  if v_reserved_grades > 0 then
    raise exception 'This grade is reserved for a playing captain on your team';
  end if;

  -- Reserve roster capacity for preselected playing captains.
  select (case when captain_player_id is not null then 1 else 0 end) +
         (case when co_captain_player_id is not null then 1 else 0 end)
  into v_reserved_slots from public.teams where id = v_team_id;

  -- Squad size
  select count(*) into v_squad_count
  from public.team_players
  where team_id = v_team_id and auction_id = v_auction_id;

  if v_squad_count + v_reserved_slots >= v_max_squad then
    raise exception 'Squad is full (max %)', v_max_squad;
  end if;

  -- Purse
  select t.initial_purse, coalesce(sum(pl.delta),0)
    into v_initial_purse, v_spent
  from public.teams t
  left join public.purse_ledger pl on pl.team_id = t.id
  where t.id = v_team_id
  group by t.initial_purse;

  v_remaining := v_initial_purse + v_spent;

  if p_amount > v_remaining then
    raise exception 'Insufficient purse. Remaining: %', v_remaining;
  end if;

  -- Highest bid
  select coalesce(max(amount),0) into v_highest
  from public.bids
  where auction_player_id = p_auction_player_id and is_undone = false;

  if p_amount <= v_highest then
    raise exception 'Bid must exceed current highest (%)', v_highest;
  end if;

  insert into public.bids (auction_id, auction_player_id, team_id,
                           captain_user_id, amount)
  values (v_auction_id, p_auction_player_id, v_team_id, v_uid, p_amount)
  returning id into v_bid_id;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, payload)
  values (v_uid, 'BID_PLACED', 'auction_player', p_auction_player_id,
          jsonb_build_object('amount', p_amount, 'team_id', v_team_id));

  return jsonb_build_object(
    'bid_id', v_bid_id,
    'team_id', v_team_id,
    'amount', p_amount,
    'leader', true
  );
end $$;

grant execute on function public.place_bid(uuid, bigint) to authenticated;


create or replace function public.sell_player(
  p_auction_player_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_ap record;
  v_winning_bid record;
  v_player_grade text;
  v_category_owned int;
begin
  select role into v_role from public.users where id = v_uid;
  if v_role not in ('MAIN_CONTROLLER','AUCTIONEER') then
    raise exception 'Only staff can confirm sales';
  end if;

  select * into v_ap from public.auction_players
    where id = p_auction_player_id for update;

  if v_ap.status <> 'CURRENT' then raise exception 'Player is not on the block'; end if;
  if not exists (select 1 from public.auctions where id = v_ap.auction_id and status = 'LIVE' and captains_finalized_at is null)
    then raise exception 'Auction not live'; end if;
  if exists (select 1 from public.teams
    where auction_id = v_ap.auction_id and
     (captain_player_id = v_ap.player_id or co_captain_player_id = v_ap.player_id))
    then raise exception 'Reserved playing captains cannot be sold at auction'; end if;

  select * into v_winning_bid
  from public.bids
  where auction_player_id = p_auction_player_id and is_undone = false
  order by amount desc, created_at asc
  limit 1;

  if not found then
    raise exception 'No bids placed';
  end if;

  -- Get the current player's grade
  select grade into v_player_grade
  from public.players
  where id = v_ap.player_id;

  -- Guard: winning team must not already own this grade
  select count(*) into v_category_owned
  from public.team_players tp
  join public.players p on p.id = tp.player_id
  where tp.team_id = v_winning_bid.team_id
    and tp.auction_id = v_ap.auction_id
    and p.grade = v_player_grade;

  if exists(
    select 1 from public.teams t
    left join public.players p1 on p1.id = t.captain_player_id
    left join public.players p2 on p2.id = t.co_captain_player_id
    where t.id = v_winning_bid.team_id
      and (p1.grade = v_player_grade or p2.grade = v_player_grade)
  ) then raise exception 'The winning team has reserved this grade for a playing captain'; end if;

  if v_category_owned > 0 then
    raise exception 'Winning team already has a % player. Undo this bid or mark the player unsold.', v_player_grade;
  end if;

  update public.auction_players
    set status = 'SOLD',
        sold_to_team_id = v_winning_bid.team_id,
        sold_price = v_winning_bid.amount
    where id = p_auction_player_id;

  update public.players set status = 'SOLD'
    where id = v_ap.player_id;

  insert into public.team_players (auction_id, team_id, player_id, price, acquired_via)
  values (v_ap.auction_id, v_winning_bid.team_id, v_ap.player_id,
          v_winning_bid.amount,
          case when v_ap.round > 1 then 'ROUND2' else 'BID' end);

  insert into public.purse_ledger (auction_id, team_id, delta, reason,
                                   related_bid_id, created_by)
  values (v_ap.auction_id, v_winning_bid.team_id, -v_winning_bid.amount,
          'BID_WON', v_winning_bid.id, v_uid);

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, payload)
  values (v_uid, 'PLAYER_SOLD', 'auction_player', p_auction_player_id,
          jsonb_build_object('team_id', v_winning_bid.team_id,
                             'amount', v_winning_bid.amount,
                             'grade', v_player_grade));

  return jsonb_build_object(
    'sold_to', v_winning_bid.team_id,
    'price', v_winning_bid.amount
  );
end $$;

grant execute on function public.sell_player(uuid) to authenticated;
revoke all on function public.place_bid(uuid,bigint) from public,anon;
grant execute on function public.place_bid(uuid,bigint) to authenticated;
revoke all on function public.sell_player(uuid) from public,anon;
grant execute on function public.sell_player(uuid) to authenticated;
