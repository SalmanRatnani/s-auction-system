-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- ---------- Age calculation ----------
create or replace function public.calc_age(dob date)
returns int language sql immutable as $$
  select extract(year from age(current_date, dob))::int;
$$;

create or replace function public.set_player_age()
returns trigger language plpgsql as $$
begin
  if new.dob is not null then
    new.age := public.calc_age(new.dob);
  end if;
  return new;
end $$;

create trigger trg_players_age
  before insert or update of dob on public.players
  for each row execute function public.set_player_age();

create trigger trg_registrations_age
  before insert or update of dob on public.registrations
  for each row execute function public.set_player_age();

-- ---------- Auth user → public.users ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    case
      when new.email in ('s.ratnani786110@gmail.com',
                         'gojosatoru786110@gmail.com') then 'MAIN_CONTROLLER'
      else 'VIEWER'
    end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- place_bid (atomic) ----------
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
  v_team_id uuid;
  v_initial_purse bigint;
  v_spent bigint;
  v_remaining bigint;
  v_squad_count int;
  v_max_squad int := 18;
  v_highest bigint := 0;
  v_increment bigint := 5000;
  v_min_next bigint;
  v_bid_id uuid;
  v_captain_team_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock the auction_player row → serializes concurrent bids
  select auction_id, status
    into v_auction_id, v_player_status
  from public.auction_players
  where id = p_auction_player_id
  for update;

  if not found then
    raise exception 'Player not in auction';
  end if;

  if v_player_status <> 'CURRENT' then
    raise exception 'Player is not currently on the block';
  end if;

  -- Captain must own a team in this auction
  select id into v_captain_team_id
  from public.teams
  where auction_id = v_auction_id and captain_user_id = v_uid;

  if v_captain_team_id is null then
    raise exception 'You are not a captain in this auction';
  end if;

  v_team_id := v_captain_team_id;

  -- Squad size check
  select count(*) into v_squad_count
  from public.team_players
  where team_id = v_team_id and auction_id = v_auction_id;

  if v_squad_count >= v_max_squad then
    raise exception 'Squad is full (max %)', v_max_squad;
  end if;

  -- Purse check
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

  -- Current highest (ignore undone)
  select coalesce(max(amount),0) into v_highest
  from public.bids
  where auction_player_id = p_auction_player_id and is_undone = false;

  v_min_next := v_highest + v_increment;
  if v_highest = 0 then
    -- First bid: must be >= base price (from auction config)
    v_min_next := 0;  -- base price enforced client-side / auctioneer, keep flexible
  end if;

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

-- ---------- sell_player (auctioneer/controller confirms sale) ----------
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
begin
  select role into v_role from public.users where id = v_uid;
  if v_role not in ('MAIN_CONTROLLER','AUCTIONEER') then
    raise exception 'Only staff can confirm sales';
  end if;

  select * into v_ap from public.auction_players
    where id = p_auction_player_id for update;

  if v_ap.status <> 'CURRENT' then
    raise exception 'Player is not on the block';
  end if;

  select * into v_winning_bid
  from public.bids
  where auction_player_id = p_auction_player_id and is_undone = false
  order by amount desc, created_at asc
  limit 1;

  if not found then
    raise exception 'No bids placed';
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
          v_winning_bid.amount, case when v_ap.round > 1 then 'ROUND2' else 'BID' end);

  insert into public.purse_ledger (auction_id, team_id, delta, reason,
                                   related_bid_id, created_by)
  values (v_ap.auction_id, v_winning_bid.team_id, -v_winning_bid.amount,
          'BID_WON', v_winning_bid.id, v_uid);

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, payload)
  values (v_uid, 'PLAYER_SOLD', 'auction_player', p_auction_player_id,
          jsonb_build_object('team_id', v_winning_bid.team_id,
                             'amount', v_winning_bid.amount));

  return jsonb_build_object('sold_to', v_winning_bid.team_id,
                            'price', v_winning_bid.amount);
end $$;

grant execute on function public.sell_player(uuid) to authenticated;

-- ---------- mark_unsold ----------
create or replace function public.mark_unsold(p_auction_player_id uuid)
returns void language plpgsql security definer as $$
declare v_role text;
begin
  select role into v_role from public.users where id = auth.uid();
  if v_role not in ('MAIN_CONTROLLER','AUCTIONEER') then
    raise exception 'Only staff';
  end if;

  update public.auction_players
    set status = 'UNSOLD'
    where id = p_auction_player_id and status = 'CURRENT';

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id)
  values (auth.uid(), 'PLAYER_UNSOLD', 'auction_player', p_auction_player_id);
end $$;

grant execute on function public.mark_unsold(uuid) to authenticated;