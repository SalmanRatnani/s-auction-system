-- ============================================================
-- 0009 — TEAM FK CLEANUP
-- Two FKs referencing teams currently block team deletion with
-- NO ACTION. Set sensible cascade behaviors so deletes work.
-- ============================================================

-- 1) bids.team_id → teams
--    Deleting a team removes its bids (they're meaningless once the team is gone).
--    The audit_log still preserves the BID_PLACED history independently.
alter table public.bids
  drop constraint if exists bids_team_id_fkey;

alter table public.bids
  add constraint bids_team_id_fkey
  foreign key (team_id) references public.teams(id)
  on delete cascade;

-- 2) auction_players.sold_to_team_id → teams
--    If a team is deleted, void the sale reference but keep the
--    auction_players row intact (it stays as a historical record).
alter table public.auction_players
  drop constraint if exists auction_players_sold_to_team_id_fkey;

alter table public.auction_players
  add constraint auction_players_sold_to_team_id_fkey
  foreign key (sold_to_team_id) references public.teams(id)
  on delete set null;