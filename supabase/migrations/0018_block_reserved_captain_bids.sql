-- Hotfix: a preselected playing captain in EITHER slot must never receive bids.
-- This INSERT/UPDATE trigger is intentionally separate from the place_bid RPC
-- to protect against any other caller capable of writing to public.bids.
-- Existing bids and team records are not changed.
create or replace function public.reject_reserved_playing_captain_bid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_auction_id uuid;
begin
  select ap.player_id, ap.auction_id
    into v_player_id, v_auction_id
  from public.auction_players ap
  where ap.id = new.auction_player_id;

  if v_player_id is null then
    raise exception 'Auction player not found';
  end if;

  if exists (
    select 1 from public.teams t
    where t.auction_id = v_auction_id
      and (t.captain_player_id = v_player_id
           or t.co_captain_player_id = v_player_id)
  ) then
    raise exception 'Reserved playing captains cannot receive bids';
  end if;

  return new;
end
$$;

drop trigger if exists reject_reserved_playing_captain_bid on public.bids;
create trigger reject_reserved_playing_captain_bid
before insert or update of auction_player_id on public.bids
for each row execute function public.reject_reserved_playing_captain_bid();
