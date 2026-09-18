-- ============================================================
-- 0011 — ONE PLAYER PER CATEGORY PER TEAM
-- A team can have at most one player per category (A+, A1, … G1).
-- Enforced in place_bid (blocks the bid) and sell_player (final guard).
-- ============================================================

-- ---------- place_bid with category-lock ----------
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

  -- Get the current player's grade
  select grade into v_player_grade
  from public.players
  where id = v_player_id;

  -- Captain must own a team in this auction
  select id into v_captain_team_id
  from public.teams
  where auction_id = v_auction_id and captain_user_id = v_uid;

  if v_captain_team_id is null then
    raise exception 'You are not a captain in this auction';
  end if;

  v_team_id := v_captain_team_id;

  -- NEW: one player per category per team
  select count(*) into v_category_owned
  from public.team_players tp
  join public.players p on p.id = tp.player_id
  where tp.team_id = v_team_id
    and tp.auction_id = v_auction_id
    and p.grade = v_player_grade;

  if v_category_owned > 0 then
    raise exception 'Your team already has a % player. You can only own one player per category.', v_player_grade;
  end if;

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

  -- Highest bid check
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

-- ---------- sell_player with category-lock (defense in depth) ----------
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