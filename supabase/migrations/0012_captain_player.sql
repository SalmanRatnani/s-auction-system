-- ============================================================
-- 0012 — PLAYING CAPTAIN
-- Links a team to the player who is also its playing captain.
-- That player is NOT bid on; the auctioneer assigns them to the
-- team at the average price of the other sold players in their
-- category (see /api/auction/[id]/assign-captain).
-- ============================================================

alter table public.teams
  add column if not exists captain_player_id uuid
  references public.players(id) on delete set null;
