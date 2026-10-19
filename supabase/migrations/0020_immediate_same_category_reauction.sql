-- Immediate SAME-category retries plus captain base-price purse protection.
-- No existing auction or roster rows are altered by this migration.
-- Historical Round 2 auctions retain their original flow.

create or replace function public.playing_captain_base_reserve(p_team_id uuid)
returns bigint language sql stable security definer set search_path=public as $$
  select coalesce(sum(coalesce(
     nullif((a.config->'basePrices'->>p.grade)::bigint,0),
     case p.grade
       when 'A+' then 30000000
       when 'A1' then 20000000
       when 'A2' then 15000000
       when 'A3' then 15000000
       when 'B1' then 10000000
       when 'B2' then 10000000
       when 'B3' then 7500000
       when 'B4' then 7500000
       when 'B5' then 5000000
       when 'C1' then 3000000
       when 'C2' then 3000000
       when 'C3' then 1500000
       when 'C4' then 1500000
       when 'K1' then 2500000
       when 'K2' then 2500000
       when 'W1' then 10000000
       when 'W2' then 5000000
       when 'G1' then 1000000
       else null
     end
  )),0)::bigint
  from public.teams t
  join public.auctions a on a.id=t.auction_id
  join lateral (values(t.captain_player_id),(t.co_captain_player_id)) slots(player_id) on true
  join public.players p on p.id=slots.player_id
  where t.id=p_team_id
    and not exists(
      select 1 from public.team_players tp
      where tp.auction_id=t.auction_id and tp.player_id=p.id
    );
$$;
revoke all on function public.playing_captain_base_reserve(uuid) from public,anon,authenticated;

create or replace function public.retry_unsold_same_category(p_auction_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_role text; v_status text; v_round2_started timestamptz;
 v_current public.auction_players%rowtype;
 v_next_id uuid; v_next_round integer;
 v_reserved boolean;
begin
 select role into v_role from public.users where id=auth.uid();
 if v_role not in ('MAIN_CONTROLLER','AUCTIONEER') then
   raise exception 'Only auction staff may re-auction unsold players';
 end if;
 select status,round_two_started_at into v_status,v_round2_started
   from public.auctions where id=p_auction_id for update;
 if v_status is distinct from 'LIVE' then raise exception 'Auction must be LIVE'; end if;
 select * into v_current from public.auction_players
   where auction_id=p_auction_id and status='CURRENT' for update;
 if not found then raise exception 'No current player to re-auction'; end if;
 if exists(select 1 from public.teams
    where auction_id=p_auction_id
     and (captain_player_id=v_current.player_id or co_captain_player_id=v_current.player_id)) then
   raise exception 'Playing captains cannot be re-auctioned';
 end if;
 -- Historical Round 2 auctions can continue with their original rules.
 if v_round2_started is not null then
   update public.auction_players set status='UNSOLD' where id=v_current.id;
   update public.players set status='UNSOLD' where id=v_current.player_id;
   insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
     values(auth.uid(),'PLAYER_UNSOLD','auction_player',v_current.id,jsonb_build_object('legacy_round2',true));
   return jsonb_build_object('ok',true,'retry',false,'legacy_round2',true);
 end if;
 v_next_round:=v_current.round+1;
 if v_next_round>100 then raise exception 'Too many retries. Ask the controller to explicitly skip the player'; end if;
 update public.auction_players set status='UNSOLD' where id=v_current.id;
 -- A distinct auction-player row has a fresh bid history. The previous bids
 -- remain attached to the previous attempt for auditing.
 insert into public.auction_players(auction_id,player_id,round,status,order_index)
   values(p_auction_id,v_current.player_id,v_next_round,'CURRENT',v_current.order_index)
   returning id into v_next_id;
 update public.players set status='IN_POOL' where id=v_current.player_id;
 insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
 values(auth.uid(),'PLAYER_REAUCTIONED','auction_player',v_next_id,
    jsonb_build_object('previous_attempt_id',v_current.id,'retry_attempt',v_next_round,
       'same_category',true));
 return jsonb_build_object('ok',true,'retry',true,'auctionPlayerId',v_next_id,'attempt',v_next_round);
end $$;
revoke all on function public.retry_unsold_same_category(uuid) from public,anon;
grant execute on function public.retry_unsold_same_category(uuid) to authenticated;

create or replace function public.skip_reauctioned_player(p_auction_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_role text; v_status text; v_current public.auction_players%rowtype;
begin
 select role into v_role from public.users where id=auth.uid();
 if v_role is distinct from 'MAIN_CONTROLLER' then raise exception 'Only the Main Controller may skip a player'; end if;
 select status into v_status from public.auctions where id=p_auction_id for update;
 if v_status is distinct from 'LIVE' then raise exception 'Auction must be LIVE'; end if;
 select * into v_current from public.auction_players
   where auction_id=p_auction_id and status='CURRENT' for update;
 if not found then raise exception 'No current player to skip'; end if;
 if v_current.round <= 1 then raise exception 'Player must be re-auctioned at least once before being skipped'; end if;
 if exists(select 1 from public.teams
   where auction_id=p_auction_id and
     (captain_player_id=v_current.player_id or co_captain_player_id=v_current.player_id)) then
   raise exception 'Playing captains cannot be skipped through ordinary auction';
 end if;
 update public.auction_players set status='SKIPPED' where id=v_current.id;
 update public.players set status='UNSOLD' where id=v_current.player_id;
 insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
 values(auth.uid(),'REAUCTION_SKIPPED','auction_player',v_current.id,
   jsonb_build_object('attempt',v_current.round));
 return jsonb_build_object('ok',true,'skipped',true);
end $$;
revoke all on function public.skip_reauctioned_player(uuid) from public,anon;
grant execute on function public.skip_reauctioned_player(uuid) to authenticated;

-- Prevent controllers from starting a SECOND global Round 2 once
-- same-grade re-auction attempts are already underway.
create or replace function public.start_round_two(p_auction_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_role text; v_status text; v_count int; v_round_two_started_at timestamptz;
begin
 select role into v_role from public.users where id=auth.uid();
 if v_role is distinct from 'MAIN_CONTROLLER' then raise exception 'Only controller can start Round 2'; end if;
 select status,round_two_started_at into v_status,v_round_two_started_at
   from public.auctions where id=p_auction_id for update;
 if v_status is distinct from 'LIVE' then raise exception 'Auction must be LIVE'; end if;
 if v_round_two_started_at is not null then raise exception 'Round 2 has already started'; end if;
 if exists(select 1 from public.auction_players where auction_id=p_auction_id and round>1) then
   raise exception 'This auction uses immediate same-category retries; global Round 2 is not available';
 end if;
 if exists(select 1 from public.auction_players where auction_id=p_auction_id and status in ('PENDING','CURRENT')) then
   raise exception 'Complete all Round 1 draws before beginning Round 2';
 end if;
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
revoke all on function public.start_round_two(uuid) from public,anon;
grant execute on function public.start_round_two(uuid) to authenticated;

-- Honor same-grade retry completion during captain final allotment.
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
  -- Same-category retries may have original UNSOLD rows. Every such player
  -- must be SOLD or explicitly SKIPPED in a later attempt before finalizing.
  if v_round_two_started_at is null and exists (
    select 1 from public.auction_players first
    where first.auction_id=p_auction_id and first.round=1 and first.status='UNSOLD'
      and not exists (
        select 1 from public.auction_players retry
        where retry.auction_id=first.auction_id and retry.player_id=first.player_id
          and retry.round>1 and retry.status in ('SOLD','SKIPPED')
      )
  ) then
    raise exception 'Re-auction or explicitly skip each unsold ordinary player before final allotment';
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


-- Reserve at least the base prices of both unallotted playing captains.
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
  v_captain_reserve bigint;
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
  -- Keep the configured BASE amount for each unallotted playing captain.
  -- An above-base final grade average can still require a controller top-up.
  v_captain_reserve := public.playing_captain_base_reserve(v_team_id);
  if p_amount > v_remaining - v_captain_reserve then
    raise exception 'Insufficient bidding purse after reserving % paise for playing captains. Available: %',
      v_captain_reserve, greatest(v_remaining-v_captain_reserve,0);
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
  v_remaining bigint;
  v_reserve bigint;
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

  select t.initial_purse + coalesce(sum(pl.delta),0) into v_remaining
    from public.teams t left join public.purse_ledger pl on pl.team_id=t.id and pl.auction_id=v_ap.auction_id
    where t.id=v_winning_bid.team_id group by t.initial_purse;
  v_reserve:=public.playing_captain_base_reserve(v_winning_bid.team_id);
  if v_winning_bid.amount > v_remaining - v_reserve then
    raise exception 'Sale would consume the protected playing-captain base-price reserve';
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

revoke all on function public.place_bid(uuid,bigint) from public,anon;
grant execute on function public.place_bid(uuid,bigint) to authenticated;
revoke all on function public.sell_player(uuid) from public,anon;
grant execute on function public.sell_player(uuid) to authenticated;
