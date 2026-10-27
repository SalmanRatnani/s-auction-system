-- Forward repair: no auction records are deleted or rewritten on deployment.
-- Test with the complete migration chain and deploy with the matching app release.
-- Existing owner APIs are retained internally; auction_command is the public staff API.
begin;

create or replace function public.current_role()
returns text language sql stable security definer set search_path=public,pg_temp as $$
  select role from public.users where id=(select auth.uid());
$$;
alter function public.is_controller() set search_path=public,pg_temp;
alter function public.is_staff() set search_path=public,pg_temp;
alter function public.calc_age(date) set search_path=public,pg_temp;
alter function public.set_player_age() set search_path=public,pg_temp;
alter function public.handle_new_user() set search_path=public,pg_temp;
alter function public.mark_unsold(uuid) set search_path=public,pg_temp;

-- Public token-based access is mediated by the server's validated viewer token.
revoke all on all tables in schema public from anon;
revoke insert,update,delete,truncate,references,trigger on all tables in schema public from authenticated;
revoke update(role),insert(role) on public.users from authenticated,anon;
drop policy if exists users_self_update on public.users;
drop policy if exists audit_insert on public.audit_log;
drop policy if exists players_read_captains_viewers on public.players;
drop policy if exists ap_write on public.auction_players;
drop policy if exists tp_write on public.team_players;
drop policy if exists pl_write on public.purse_ledger;
drop policy if exists vl_read on public.viewer_links;
drop policy if exists vl_write on public.viewer_links;
create policy viewer_links_controller_read on public.viewer_links
  for select to authenticated using ((select public.is_controller()));
grant select on public.viewer_links to authenticated;

-- These server-read projections cannot bypass base table policy or accept writes.
alter view public.players_public set (security_invoker=true);
alter view public.team_purses set (security_invoker=true);
revoke all on public.players_public,public.team_purses from authenticated,anon;
grant select on public.players_public,public.team_purses to service_role;
revoke select on public.teams from authenticated;
-- Explicit grants also support fresh projects with automatic API grants disabled.
grant select on public.users,public.auctions,public.registrations,public.players,
  public.auction_players,public.bids,public.team_players,public.purse_ledger,
  public.audit_log,public.settings to authenticated;
grant all on all tables in schema public to service_role;

-- Signed service-issued upload URLs remain supported; arbitrary proof uploads do not.
drop policy if exists age_proofs_staff_write on storage.objects;
drop policy if exists age_proofs_controller_write on storage.objects;
create policy age_proofs_controller_write on storage.objects for insert to authenticated
  with check(bucket_id='age-proofs' and (select public.is_controller()));
update storage.buckets set file_size_limit=5242880,
  allowed_mime_types=array['image/jpeg','image/png','image/webp']
  where id in ('player-images','team-logos');
update storage.buckets set file_size_limit=10485760,
  allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf']
  where id='age-proofs';

-- Keep the existing live unique-current index if its alternate name is present.
do $$ begin
  if not exists(select 1 from pg_indexes where schemaname='public'
    and indexname in ('one_current_auction_player','auction_players_one_current_per_auction')) then
    create unique index one_current_auction_player on public.auction_players(auction_id) where status='CURRENT';
  end if;
end $$;

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
  if new.amount < (case when v_highest = 0 then v_base else v_highest + v_increment end) then
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

create or replace function public.place_bid(
  p_auction_player_id uuid,
  p_amount bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
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

  if not exists(select 1 from public.users where id=v_uid and role in ('CAPTAIN','MAIN_CONTROLLER')) then
    raise exception 'Current captain authorization required';
  end if;
  select auction_id into v_auction_id from public.auction_players where id=p_auction_player_id;
  -- All commands acquire the auction lock BEFORE any attempt/team locks.
  perform 1 from public.auctions where id=v_auction_id for update;
  select coalesce((config->>'maxSquad')::int,18) into v_max_squad
    from public.auctions where id=v_auction_id;
  -- Lock the attempt after the auction.
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
  if p_amount is null or p_amount <= 0 or p_amount > 100000000000 then
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
  select count(*) into v_reserved_slots from public.teams t
  cross join lateral (values(t.captain_player_id),(t.co_captain_player_id)) slots(player_id)
  where t.id=v_team_id and slots.player_id is not null
    and not exists(select 1 from public.team_players tp
      where tp.auction_id=v_auction_id and tp.player_id=slots.player_id);

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
set search_path = public, pg_temp
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
  if v_uid is null or coalesce(v_role,'') not in ('MAIN_CONTROLLER','AUCTIONEER') then
    raise exception 'Only staff can confirm sales';
  end if;

  perform 1 from public.auctions where id=(
    select auction_id from public.auction_players where id=p_auction_player_id
  ) for update;
  select * into v_ap from public.auction_players
    where id = p_auction_player_id for update;

  if v_ap.status is distinct from 'CURRENT' then raise exception 'Player is not on the block'; end if;
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

  -- Last ordinary player of this category has just sold: allot its captains.
  perform public.allot_completed_captain_grade(v_ap.auction_id,v_player_grade);
  return jsonb_build_object(
    'sold_to', v_winning_bid.team_id,
    'price', v_winning_bid.amount
  );
end $$;



alter table public.auctions add column if not exists state_version bigint not null default 0;
create table public.auction_actions (
  auction_id uuid not null references public.auctions(id) on delete cascade,
  actor_id uuid not null references public.users(id),
  action_id uuid not null,
  command text not null,
  payload jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(auction_id,actor_id,action_id)
);
alter table public.auction_actions enable row level security;
revoke all on public.auction_actions from public,anon,authenticated;
grant all on public.auction_actions to service_role;
create index bids_actor_created_idx on public.bids(captain_user_id,created_at desc);

-- Changes in an auction share a monotonically increasing version, including bids.
create or replace function public.record_bid_version()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if (select count(*) from public.bids where captain_user_id=new.captain_user_id
      and created_at>clock_timestamp()-interval '2 seconds') >= 12 then
    raise exception 'Too many bids. Wait a moment and refresh.';
  end if;
  update public.auctions set state_version=state_version+1 where id=new.auction_id;
  return new;
end $$;
create trigger record_bid_version after insert on public.bids
  for each row execute function public.record_bid_version();

create or replace function public.auction_command(
  p_auction_id uuid,p_command text,p_action_id uuid,p_payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_actor uuid:=auth.uid(); v_role text; v_auction public.auctions%rowtype;
  v_previous public.auction_actions%rowtype; v_result jsonb:='{"ok":true}'::jsonb;
  v_current public.auction_players%rowtype; v_bid public.bids%rowtype;
  v_count int; v_ids uuid[]; v_reserved uuid[]; v_team uuid;
  v_amount bigint; v_defaults jsonb:='{"A+":30000000,"A1":20000000,"A2":15000000,"A3":15000000,"B1":10000000,"B2":10000000,"B3":7500000,"B4":7500000,"B5":5000000,"C1":3000000,"C2":3000000,"C3":1500000,"C4":1500000,"K1":2500000,"K2":2500000,"W1":10000000,"W2":5000000,"G1":1000000}';
begin
  select role into v_role from public.users where id=v_actor;
  if v_actor is null or coalesce(v_role,'') not in ('MAIN_CONTROLLER','AUCTIONEER') then
    raise exception 'Auction staff authorization required' using errcode='42501';
  end if;
  if p_command not in ('next-player','sell','undo-bid','unsold','pause','resume','start','end','reset','skip-player','round2','finalize-captains','topup') then
    raise exception 'Unknown auction command';
  end if;
  if p_command in ('start','end','reset','skip-player','round2','finalize-captains','topup')
      and v_role <> 'MAIN_CONTROLLER' then raise exception 'Controller authorization required' using errcode='42501'; end if;
  if p_action_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'An action ID and object payload are required'; end if;
  select * into v_auction from public.auctions where id=p_auction_id for update;
  if not found then raise exception 'Auction not found'; end if;
  select * into v_previous from public.auction_actions
    where auction_id=p_auction_id and actor_id=v_actor and action_id=p_action_id;
  if found then
    if v_previous.command<>p_command or v_previous.payload<>p_payload then
      raise exception 'Action ID already used for different input';
    end if;
    return v_previous.result;
  end if;
  if p_command<>'topup' and (
    not (p_payload ? 'expectedVersion') or
    (p_payload->>'expectedVersion')::bigint is distinct from v_auction.state_version
  ) then raise exception 'Auction changed. Refresh and confirm the action again.' using errcode='40001'; end if;
  if p_command in ('sell','undo-bid','unsold','skip-player') then
    select * into v_current from public.auction_players
      where auction_id=p_auction_id and status='CURRENT' for update;
    if v_current.id is null or v_current.id is distinct from (p_payload->>'expectedPlayerId')::uuid then
      raise exception 'Player changed. Refresh before continuing.' using errcode='40001';
    end if;
    select * into v_bid from public.bids where auction_player_id=v_current.id and not is_undone
      order by amount desc,created_at,id limit 1;
    if not (p_payload ? 'expectedBidId') or v_bid.id is distinct from (p_payload->>'expectedBidId')::uuid then
      raise exception 'Leading bid changed. Refresh before continuing.' using errcode='40001';
    end if;
  end if;
  case p_command
  when 'sell' then
    v_result:=jsonb_build_object('ok',true,'sale',public.sell_player(v_current.id));
  when 'undo-bid' then
    if v_auction.status<>'LIVE' or v_bid.id is null then raise exception 'A live auction with a bid is required'; end if;
    update public.bids set is_undone=true where id=v_bid.id;
    v_result:=jsonb_build_object('ok',true,'undone',to_jsonb(v_bid));
  when 'unsold' then
    v_result:=public.retry_unsold_same_category(p_auction_id);
  when 'skip-player' then
    v_result:=public.skip_reauctioned_player(p_auction_id);
  when 'next-player' then
    v_result:=public.draw_next_auction_player(p_auction_id,p_payload->>'category');
  when 'pause' then
    if v_auction.status<>'LIVE' then raise exception 'Only LIVE auctions can be paused'; end if;
    update public.auctions set status='PAUSED' where id=p_auction_id;
  when 'resume' then
    if v_auction.status<>'PAUSED' then raise exception 'Only PAUSED auctions can be resumed'; end if;
    update public.auctions set status='LIVE' where id=p_auction_id;
  when 'round2' then
    v_result:=public.start_round_two(p_auction_id);
  when 'finalize-captains' then
    v_result:=public.finalize_playing_captains(p_auction_id,v_defaults);
  when 'end' then
    if v_auction.status<>'LIVE' then raise exception 'Resume the auction before ending it'; end if;
    if v_auction.captains_finalized_at is null then
      perform public.finalize_playing_captains(p_auction_id,v_defaults);
    end if;
    update public.auctions set status='ENDED',ended_at=now() where id=p_auction_id;
  when 'topup' then
    if v_auction.status='ENDED' then raise exception 'Completed auction purses are locked'; end if;
    v_team:=(p_payload->>'teamId')::uuid;
    v_amount:=(p_payload->>'amount')::bigint;
    if v_amount is null or v_amount<=0 or v_amount>100000000000 then raise exception 'Invalid top-up amount'; end if;
    perform 1 from public.teams where id=v_team and auction_id=p_auction_id for update;
    if not found then raise exception 'Team does not belong to this auction'; end if;
    insert into public.purse_ledger(auction_id,team_id,delta,reason,created_by)
      values(p_auction_id,v_team,v_amount,'TOPUP',v_actor);
  when 'start' then
    if v_auction.status<>'DRAFT' then raise exception 'Only DRAFT auctions can start'; end if;
    select count(*) into v_count from public.teams where auction_id=p_auction_id;
    if v_count<>6 then raise exception 'Exactly six teams are required'; end if;
    if exists(select 1 from public.teams t left join public.users u on u.id=t.captain_user_id
      where t.auction_id=p_auction_id and (u.id is null or u.role not in ('CAPTAIN','MAIN_CONTROLLER'))) then
      raise exception 'Assign an authorized captain to every team before starting';
    end if;
    select coalesce(array_agg(s.player_id),'{}'::uuid[]) into v_reserved
      from public.teams t cross join lateral (values(t.captain_player_id),(t.co_captain_player_id)) s(player_id)
      where t.auction_id=p_auction_id and s.player_id is not null;
    if exists(select 1 from public.players where id=any(v_reserved) and
      (status<>'IN_POOL' or grade is null or
      ((player_code like 'QA-%' and registration_id is null) <> (v_auction.mode='DRY_RUN')))) then
      raise exception 'Playing captains must be graded pool players matching the auction mode';
    end if;
    insert into public.auction_players(auction_id,player_id,round,status,order_index)
      select p_auction_id,p.id,1,'PENDING',row_number() over(order by p.id)
      from public.players p where p.status='IN_POOL' and p.grade is not null
        and not(p.id=any(v_reserved)) and
        case when v_auction.mode='DRY_RUN' then p.player_code like 'QA-20261019-%' and p.registration_id is null
          else p.player_code not like 'QA-%' end
      on conflict(auction_id,player_id,round) do nothing;
    get diagnostics v_count=row_count;
    if not exists(select 1 from public.auction_players where auction_id=p_auction_id and status='PENDING') then
      raise exception 'No eligible players available';
    end if;
    update public.auctions set status='LIVE',started_at=now() where id=p_auction_id;
    v_result:=jsonb_build_object('ok',true,'seeded',v_count);
  when 'reset' then
    -- Historical/live event records cannot be wiped by a stale or mistaken click.
    if v_auction.mode<>'DRY_RUN' or v_auction.status not in ('DRAFT','PAUSED') then
      raise exception 'Reset is available only for a DRAFT or PAUSED rehearsal';
    end if;
    select coalesce(array_agg(distinct player_id),'{}'::uuid[]) into v_ids from (
      select player_id from public.auction_players where auction_id=p_auction_id
      union select player_id from public.team_players where auction_id=p_auction_id
    ) p;
    delete from public.purse_ledger where auction_id=p_auction_id;
    delete from public.bids where auction_id=p_auction_id;
    delete from public.team_players where auction_id=p_auction_id;
    delete from public.auction_players where auction_id=p_auction_id;
    update public.players p set status='IN_POOL' where p.id=any(v_ids) and p.status<>'WITHDRAWN'
      and not exists(select 1 from public.team_players tp where tp.player_id=p.id);
    update public.auctions set status='DRAFT',started_at=null,ended_at=null,
      captains_finalized_at=null,round_two_started_at=null where id=p_auction_id;
    -- Keep configured purses and captain selections; reset only this rehearsal's results.
    v_result:=jsonb_build_object('ok',true,'cleared',cardinality(v_ids));
  end case;
  update public.auctions set state_version=state_version+1 where id=p_auction_id
    returning state_version into v_count;
  v_result:=v_result||jsonb_build_object('actionId',p_action_id,'version',v_count);
  insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
    values(v_actor,'AUCTION_'||upper(replace(p_command,'-','_')),'auction',p_auction_id,
      jsonb_build_object('actionId',p_action_id,'input',p_payload,'result',v_result));
  insert into public.auction_actions(auction_id,actor_id,action_id,command,payload,result)
    values(p_auction_id,v_actor,p_action_id,p_command,p_payload,v_result);
  return v_result;
end $$;

-- A compact, atomic read eliminates multi-request snapshots and API result caps.
-- Only the trusted server calls this; it performs audience filtering after authorization.
create or replace function public.auction_snapshot(p_auction_id uuid)
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'auction',(select to_jsonb(a) from public.auctions a where a.id=p_auction_id),
    'current',(select to_jsonb(ap)||jsonb_build_object('player',jsonb_build_object(
      'id',p.id,'player_code',p.player_code,'name',p.name,'grade',p.grade,'image_url',p.image_url,
      'achievements',p.achievements,'playing_centre',p.playing_centre,'playing_hand',p.playing_hand))
      from public.auction_players ap join public.players p on p.id=ap.player_id
      where ap.auction_id=p_auction_id and ap.status='CURRENT'),
    'highestBid',(select jsonb_build_object('id',b.id,'amount',b.amount,'team_id',b.team_id,'created_at',b.created_at)
      from public.bids b join public.auction_players ap on ap.id=b.auction_player_id
      where ap.auction_id=p_auction_id and ap.status='CURRENT' and not b.is_undone
      order by b.amount desc,b.created_at,b.id limit 1),
    'teams',(select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at),'[]') from public.teams t where auction_id=p_auction_id),
    'purses',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.team_purses t where auction_id=p_auction_id),
    'rosters',(select coalesce(jsonb_agg(jsonb_build_object('team_id',tp.team_id,'player_id',tp.player_id,
      'price',tp.price,'acquired_via',tp.acquired_via,'grade',p.grade)),'[]')
      from public.team_players tp join public.players p on p.id=tp.player_id where tp.auction_id=p_auction_id),
    'pending',(select coalesce(jsonb_agg(jsonb_build_object('player_id',p.id,'grade',p.grade)),'[]')
      from public.auction_players ap join public.players p on p.id=ap.player_id where ap.auction_id=p_auction_id and ap.status='PENDING'),
    'captains',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'grade',p.grade)),'[]') from public.players p
      where exists(select 1 from public.teams t where t.auction_id=p_auction_id and p.id in (t.captain_player_id,t.co_captain_player_id))),
    'lastSale',(select jsonb_build_object('id',tp.id,'price',tp.price,'acquired_via',tp.acquired_via,'won_at',tp.won_at,
      'player_name',p.name,'grade',p.grade,'image_url',p.image_url,'team_name',t.name)
      from public.team_players tp join public.players p on p.id=tp.player_id join public.teams t on t.id=tp.team_id
      where tp.auction_id=p_auction_id order by tp.won_at desc,tp.id limit 1)
  );
$$;

create or replace function public.update_team_config(p_team_id uuid,p_changes jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid();v_role text;v_auction uuid;v_status text;v_team public.teams%rowtype;v_new public.teams%rowtype;
begin
 select role into v_role from public.users where id=v_actor;
 if v_actor is null or coalesce(v_role,'') not in ('MAIN_CONTROLLER','CAPTAIN') then raise exception 'Captain authorization required' using errcode='42501'; end if;
 if p_changes is null or jsonb_typeof(p_changes)<>'object' or exists(select 1 from jsonb_object_keys(p_changes) k where k not in ('name','captain_user_id','co_captain_user_id','captain_player_id','co_captain_player_id')) then raise exception 'Invalid team fields'; end if;
 select auction_id into v_auction from public.teams where id=p_team_id;
 select status into v_status from public.auctions where id=v_auction for update;
 select * into v_team from public.teams where id=p_team_id for update;
 if not found then raise exception 'Team not found'; end if;
 if v_role<>'MAIN_CONTROLLER' and v_actor is distinct from v_team.captain_user_id and v_actor is distinct from v_team.co_captain_user_id then raise exception 'This is not your team' using errcode='42501'; end if;
 if (p_changes-'name')<>'{}'::jsonb then
   if v_role<>'MAIN_CONTROLLER' then raise exception 'Only the controller can assign captains' using errcode='42501'; end if;
   if v_status<>'DRAFT' then raise exception 'Captain assignments are locked after the auction starts'; end if;
 end if;
 v_new:=jsonb_populate_record(v_team,p_changes);
 if v_new.name is null or length(trim(v_new.name)) not between 2 and 40 then raise exception 'Team name must be 2–40 characters'; end if;
 if exists(select 1 from public.players p where p.id in (v_new.captain_player_id,v_new.co_captain_player_id)
   and p.id not in (select unnest(array_remove(array[v_team.captain_player_id,v_team.co_captain_player_id],null)))
   and (p.status<>'IN_POOL' or p.grade is null)) then raise exception 'Playing captains must be graded pool players'; end if;
 if exists(select 1 from public.users where id in (v_new.captain_user_id,v_new.co_captain_user_id) and role='AUCTIONEER') then
   raise exception 'Assign a captain login instead of an auctioneer login';
 end if;
 update public.teams set name=trim(v_new.name),captain_user_id=v_new.captain_user_id,
   co_captain_user_id=v_new.co_captain_user_id,captain_player_id=v_new.captain_player_id,
   co_captain_player_id=v_new.co_captain_player_id where id=p_team_id returning * into v_new;
 update public.users set role='CAPTAIN' where id in (v_new.captain_user_id,v_new.co_captain_user_id) and role='VIEWER';
 update public.auctions set state_version=state_version+1 where id=v_auction;
 insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
 values(v_actor,'TEAM_UPDATED','team',p_team_id,jsonb_build_object('before',to_jsonb(v_team),'after',to_jsonb(v_new)));
 return to_jsonb(v_new);
end $$;

create or replace function public.configure_auction(p_auction_id uuid,p_actor uuid,p_changes jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_auction public.auctions%rowtype;v_config jsonb;v_value jsonb;v_key text;
begin
 if not exists(select 1 from public.users where id=p_actor and role='MAIN_CONTROLLER') then raise exception 'Controller required'; end if;
 select * into v_auction from public.auctions where id=p_auction_id for update;
 if not found then raise exception 'Auction not found'; end if;
 if v_auction.status<>'DRAFT' then raise exception 'Settings are locked after the auction starts'; end if;
 if p_changes ? 'mode' and p_changes->>'mode' not in ('DRY_RUN','LIVE') then raise exception 'Invalid auction mode'; end if;
 v_config:=v_auction.config||coalesce(p_changes->'config','{}');
 if jsonb_typeof(v_config)<>'object' then raise exception 'Invalid configuration'; end if;
 if (v_config->>'maxSquad')::int not between 1 and 100 then raise exception 'Invalid maximum squad size'; end if;
 if (v_config->>'initialPurse')::bigint not between 1 and 100000000000 then raise exception 'Invalid starting purse'; end if;
 if coalesce((v_config->'timer'->>'enabled')::boolean,false) or coalesce((v_config->'timer'->>'autoSellOnExpiry')::boolean,false) then
   raise exception 'Automatic timers are not available; confirm sales manually';
 end if;
 for v_key,v_value in select * from jsonb_each(coalesce(v_config->'basePrices','{}')) union all select * from jsonb_each(coalesce(v_config->'increments','{}')) loop
   if jsonb_typeof(v_value)<>'number' or v_value::text !~ '^[0-9]+$' or (v_value::text)::bigint not between 1 and 100000000000 then raise exception 'Invalid category amount'; end if;
 end loop;
 update public.auctions set config=v_config,name=coalesce(nullif(trim(p_changes->>'name'),''),name),
   mode=coalesce(p_changes->>'mode',mode),state_version=state_version+1
   where id=p_auction_id returning * into v_auction;
 if (p_changes->'config') ? 'initialPurse' then
   update public.teams set initial_purse=(v_config->>'initialPurse')::bigint where auction_id=p_auction_id;
 end if;
 insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
   values(p_actor,'AUCTION_CONFIG_UPDATED','auction',p_auction_id,p_changes);
 return to_jsonb(v_auction);
end $$;

-- Administrative writes keep authorization, changes, and audit in one transaction.
create or replace function public.set_user_role(p_user_id uuid,p_role text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid();v_before text;
begin
 perform pg_advisory_xact_lock(710247019);
 if v_actor is null or not exists(select 1 from public.users where id=v_actor and role='MAIN_CONTROLLER') then raise exception 'Controller authorization required' using errcode='42501'; end if;
 if p_role is null or p_role not in ('MAIN_CONTROLLER','AUCTIONEER','CAPTAIN','VIEWER') then raise exception 'Invalid role'; end if;
 if p_user_id=v_actor and p_role<>'MAIN_CONTROLLER' then raise exception 'You cannot change your own role'; end if;
 select role into v_before from public.users where id=p_user_id for update;
 if not found then raise exception 'User not found'; end if;
 if v_before='MAIN_CONTROLLER' and p_role<>'MAIN_CONTROLLER' and (select count(*) from public.users where role='MAIN_CONTROLLER')<=1 then raise exception 'Cannot demote the last Main Controller'; end if;
 update public.users set role=p_role where id=p_user_id;
 insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
 values(v_actor,'ROLE_CHANGED','user',p_user_id,jsonb_build_object('from',v_before,'to',p_role));
end $$;

create or replace function public.manage_draft_team(p_auction_id uuid,p_team_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid();v_auction public.auctions%rowtype;v_team public.teams%rowtype;v_count int;
begin
 if v_actor is null or not exists(select 1 from public.users where id=v_actor and role='MAIN_CONTROLLER') then raise exception 'Controller authorization required' using errcode='42501'; end if;
 select * into v_auction from public.auctions where id=p_auction_id for update;
 if not found then raise exception 'Auction not found'; end if;
 if v_auction.status<>'DRAFT' then raise exception 'Teams can be added or removed only before the auction starts'; end if;
 if p_team_id is null then
   select count(*) into v_count from public.teams where auction_id=p_auction_id;
   if v_count>=6 then raise exception 'Maximum six teams'; end if;
   insert into public.teams(auction_id,name,initial_purse)
   values(p_auction_id,'Team '||(v_count+1),coalesce((v_auction.config->>'initialPurse')::bigint,1000000000)) returning * into v_team;
 else
   select * into v_team from public.teams where id=p_team_id and auction_id=p_auction_id for update;
   if not found then raise exception 'Team not found'; end if;
   if exists(select 1 from public.team_players where team_id=p_team_id) or exists(select 1 from public.purse_ledger where team_id=p_team_id) then raise exception 'Cannot remove a team with players or purse transactions'; end if;
   delete from public.teams where id=p_team_id;
 end if;
 update public.auctions set state_version=state_version+1 where id=p_auction_id;
 insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
 values(v_actor,case when p_team_id is null then 'TEAM_CREATED' else 'TEAM_DELETED' end,'team',v_team.id,to_jsonb(v_team));
 return to_jsonb(v_team);
end $$;

create or replace function public.manage_viewer_link(p_auction_id uuid,p_hours int default 12,p_link_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid();v_link public.viewer_links%rowtype;v_config jsonb;
begin
 if v_actor is null or not exists(select 1 from public.users where id=v_actor and role='MAIN_CONTROLLER') then raise exception 'Controller authorization required' using errcode='42501'; end if;
 select config into v_config from public.auctions where id=p_auction_id for update;
 if not found then raise exception 'Auction not found'; end if;
 if p_link_id is null then
   if coalesce(v_config->>'viewerMode','PUBLIC_LINK')='LOGIN_REQUIRED' then raise exception 'Public links are disabled for this auction'; end if;
   if p_hours is null or p_hours not between 1 and 72 then raise exception 'Link duration must be 1–72 hours'; end if;
   insert into public.viewer_links(auction_id,token,expires_at,created_by)
   values(p_auction_id,replace(gen_random_uuid()::text,'-',''),now()+make_interval(hours=>p_hours),v_actor) returning * into v_link;
 else
   update public.viewer_links set expires_at=least(expires_at,now()) where id=p_link_id and auction_id=p_auction_id returning * into v_link;
   if not found then raise exception 'Viewer link not found'; end if;
 end if;
 insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
 values(v_actor,case when p_link_id is null then 'VIEWER_LINK_CREATED' else 'VIEWER_LINK_REVOKED' end,'viewer_link',v_link.id,jsonb_build_object('auction_id',p_auction_id,'expires_at',v_link.expires_at));
 return jsonb_build_object('id',v_link.id,'token',v_link.token,'expires_at',v_link.expires_at);
end $$;

-- The allowed RPC list is explicit. Legacy entry points remain usable internally only.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.current_role(),public.is_controller(),public.is_staff() to authenticated,anon;
grant execute on function public.place_bid(uuid,bigint),public.auction_command(uuid,text,uuid,jsonb),
  public.approve_registration_player(uuid,text),public.update_team_config(uuid,jsonb),
  public.set_user_role(uuid,text),public.manage_draft_team(uuid,uuid),public.manage_viewer_link(uuid,int,uuid) to authenticated;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public revoke execute on functions from public,anon,authenticated;
alter default privileges in schema public revoke all on tables from anon,authenticated;

commit;
