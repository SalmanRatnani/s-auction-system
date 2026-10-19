-- ============================================================
-- 0014 — BLOCK BIDS ON PLAYING CAPTAINS
-- Recommended companion to 0011/0012: a drawn playing captain is
-- assigned by the auctioneer, never bid on. The UI already disables
-- bidding; this makes place_bid refuse it server-side too.
-- Requires 0011 (category lock) and 0012 (teams.captain_player_id).
-- ============================================================

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

  -- Playing captains are assigned, not auctioned
  select exists (
    select 1 from public.teams
    where auction_id = v_auction_id and captain_player_id = v_player_id
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
  where auction_id = v_auction_id and captain_user_id = v_uid;

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

  -- Squad size
  select count(*) into v_squad_count
  from public.team_players
  where team_id = v_team_id and auction_id = v_auction_id;

  if v_squad_count >= v_max_squad then
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
