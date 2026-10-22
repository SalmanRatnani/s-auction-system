-- 0025: Authoritative virtual-credit bidding and serialized player draws.
-- Paise are accounting units for virtual credits, never actual payments.
-- Requires 0020-0024 (especially close_completed_captain_grades).
-- Apply in a disposable staging Supabase DB before deploying Next.js changes.

create or replace function public.enforce_auction_bid_rules()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  v_status text;
  v_config jsonb;
  v_grade text;
  v_auction_id uuid;
  v_player_status text;
  v_highest bigint;
  v_base bigint;
  v_increment bigint;
  v_team_auction uuid;
  v_max_squad integer;
  v_roster_size integer;
  v_reserved_slots integer;
begin
  select ap.auction_id, ap.status, p.grade
    into v_auction_id, v_player_status, v_grade
  from public.auction_players ap
  join public.players p on p.id = ap.player_id
  where ap.id = new.auction_player_id;

  if v_auction_id is null or new.auction_id is distinct from v_auction_id
      or v_player_status is distinct from 'CURRENT' then
    raise exception 'Only the CURRENT auction player may receive bids';
  end if;

  -- Lock the auction state so PAUSE/END cannot commit during a bid.
  select a.status, a.config into v_status, v_config
  from public.auctions a where a.id = v_auction_id for share;
  if v_status is distinct from 'LIVE' then
    raise exception 'Auction is not LIVE; bidding is closed';
  end if;

  select t.auction_id into v_team_auction
  from public.teams t where t.id = new.team_id;
  if v_team_auction is distinct from v_auction_id then
    raise exception 'Bid team belongs to a different auction';
  end if;

  if new.amount is null or new.amount <= 0 then
    raise exception 'Bid must be a positive virtual-credit amount';
  end if;

  v_base := case v_grade
    when 'A+' then 30000000 when 'A1' then 20000000
    when 'A2' then 15000000 when 'A3' then 15000000
    when 'B1' then 10000000 when 'B2' then 10000000
    when 'B3' then 7500000 when 'B4' then 7500000
    when 'B5' then 5000000 when 'C1' then 3000000
    when 'C2' then 3000000 when 'C3' then 1500000
    when 'C4' then 1500000 when 'K1' then 2500000
    when 'K2' then 2500000 when 'W1' then 10000000
    when 'W2' then 5000000 when 'G1' then 1000000
    else null end;

  v_increment := case v_grade
    when 'A+' then 2500000 when 'A1' then 2000000
    when 'A2' then 1500000 when 'A3' then 1500000
    when 'B1' then 1000000 when 'B2' then 1000000
    when 'B3' then 1000000 when 'B4' then 1000000
    when 'B5' then 500000 when 'C1' then 500000
    when 'C2' then 500000 when 'C3' then 250000
    when 'C4' then 250000 when 'K1' then 250000
    when 'K2' then 250000 when 'W1' then 1000000
    when 'W2' then 500000 when 'G1' then 100000
    else null end;

  if v_base is null then raise exception 'Unsupported auction grade %', v_grade; end if;
  v_base := coalesce((v_config->'basePrices'->>v_grade)::bigint, v_base);
  v_increment := coalesce((v_config->'increments'->>v_grade)::bigint, v_increment);

  if v_base <= 0 or v_increment <= 0 then
    raise exception 'Base price and increment must be positive for %', v_grade;
  end if;

  select coalesce(max(b.amount), 0) into v_highest
  from public.bids b where b.auction_player_id = new.auction_player_id
    and not b.is_undone;
  if new.amount < case when v_highest = 0 then v_base else v_highest + v_increment end then
    raise exception 'Minimum allowed bid is % paise (virtual credits)',
      case when v_highest = 0 then v_base else v_highest + v_increment end;
  end if;

  v_max_squad := coalesce((v_config->>'maxSquad')::integer, 18);
  if v_max_squad < 1 or v_max_squad > 100 then
    raise exception 'Invalid configured maxSquad';
  end if;

  select count(*) into v_roster_size from public.team_players
    where team_id = new.team_id and auction_id = v_auction_id;

  select count(*) into v_reserved_slots
  from public.teams t
  cross join lateral (values(t.captain_player_id),(t.co_captain_player_id)) slots(player_id)
  where t.id = new.team_id and slots.player_id is not null
    and not exists (
      select 1 from public.team_players tp
      where tp.auction_id = v_auction_id and tp.player_id = slots.player_id
    );

  if v_roster_size + v_reserved_slots >= v_max_squad then
    raise exception 'Squad is full including reserved playing captains (max %)', v_max_squad;
  end if;
  return new;
end $$;

drop trigger if exists enforce_auction_bid_rules on public.bids;
create trigger enforce_auction_bid_rules
before insert on public.bids for each row
execute function public.enforce_auction_bid_rules();

-- Draw and captain-grade closure commit together, or neither commits.
-- The auction row serializes two auctioneer clicks; the 0024 unique index
-- adds independent defense against a second CURRENT row.
create or replace function public.draw_next_auction_player(
  p_auction_id uuid, p_requested_grade text default null
)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_picked_id uuid;
  v_grade text;
  v_order text[] := array[
    'A+','A1','A2','A3','B1','B2','B3','B4','B5',
    'C1','C2','C3','C4','K1','K2','W1','W2','G1'
  ];
begin
  if v_actor is null or not exists (
    select 1 from public.users where id=v_actor
    and role in ('MAIN_CONTROLLER','AUCTIONEER')
  ) then raise exception 'Auction staff authorization required'; end if;

  select status into v_status from public.auctions
    where id=p_auction_id for update;
  if v_status is distinct from 'LIVE' then raise exception 'Auction must be LIVE'; end if;

  if exists(select 1 from public.auction_players
     where auction_id=p_auction_id and status='CURRENT') then
    raise exception 'Finish the current player before drawing another';
  end if;

  -- Find the earliest remaining grade; randomize only within that grade.
  select ap.id, p.grade into v_picked_id, v_grade
  from public.auction_players ap
  join public.players p on p.id=ap.player_id
  where ap.auction_id=p_auction_id and ap.status='PENDING'
    and array_position(v_order,p.grade) is not null
    and not exists (
      select 1 from public.teams t
      where t.auction_id=p_auction_id
        and (t.captain_player_id=ap.player_id or t.co_captain_player_id=ap.player_id)
    )
  order by array_position(v_order,p.grade), random()
  limit 1 for update of ap;

  if v_picked_id is null then raise exception 'No eligible pending players'; end if;
  if p_requested_grade is not null and p_requested_grade <> 'ANY'
      and p_requested_grade <> v_grade then
    raise exception 'Complete category % before drawing %', v_grade,p_requested_grade;
  end if;

  -- A failure to assign a playing captain prevents advancing a grade.
  perform public.close_completed_captain_grades(p_auction_id,v_grade);

  update public.auction_players set status='CURRENT'
  where id=v_picked_id and status='PENDING';
  if not found then raise exception 'Player draw conflict'; end if;

  insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
  values(v_actor,'PLAYER_DRAWN','auction_player',v_picked_id,
    jsonb_build_object('category',v_grade));

  return jsonb_build_object('ok',true,'auctionPlayerId',v_picked_id,'category',v_grade);
end $$;

revoke all on function public.draw_next_auction_player(uuid,text) from public, anon;
grant execute on function public.draw_next_auction_player(uuid,text) to authenticated;
