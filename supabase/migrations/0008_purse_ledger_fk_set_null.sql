-- ============================================================
-- 0008 — PURSE_LEDGER FK: ON DELETE SET NULL
-- Deleting a bid no longer blocks on purse_ledger references.
-- The ledger row is preserved; its related_bid_id becomes NULL.
-- ============================================================

alter table public.purse_ledger
  drop constraint if exists purse_ledger_related_bid_id_fkey;

alter table public.purse_ledger
  add constraint purse_ledger_related_bid_id_fkey
  foreign key (related_bid_id) references public.bids(id)
  on delete set null;