-- ============================================================
-- 0010 — USERS FK CLEANUP
-- Deleting a user no longer fails on FK constraints.
-- Historical records (bids, ledger, audit) survive with NULL actor.
-- ============================================================

-- teams.captain_user_id → SET NULL (team survives, captain cleared)
alter table public.teams
  drop constraint if exists teams_captain_user_id_fkey;
alter table public.teams
  add constraint teams_captain_user_id_fkey
  foreign key (captain_user_id) references public.users(id)
  on delete set null;

-- bids.captain_user_id → SET NULL
alter table public.bids
  drop constraint if exists bids_captain_user_id_fkey;
alter table public.bids
  add constraint bids_captain_user_id_fkey
  foreign key (captain_user_id) references public.users(id)
  on delete set null;

-- purse_ledger.created_by → SET NULL
alter table public.purse_ledger
  drop constraint if exists purse_ledger_created_by_fkey;
alter table public.purse_ledger
  add constraint purse_ledger_created_by_fkey
  foreign key (created_by) references public.users(id)
  on delete set null;

-- audit_log.actor_user_id → SET NULL
alter table public.audit_log
  drop constraint if exists audit_log_actor_user_id_fkey;
alter table public.audit_log
  add constraint audit_log_actor_user_id_fkey
  foreign key (actor_user_id) references public.users(id)
  on delete set null;

-- registrations.reviewed_by → SET NULL
alter table public.registrations
  drop constraint if exists registrations_reviewed_by_fkey;
alter table public.registrations
  add constraint registrations_reviewed_by_fkey
  foreign key (reviewed_by) references public.users(id)
  on delete set null;

-- viewer_links.created_by → SET NULL
alter table public.viewer_links
  drop constraint if exists viewer_links_created_by_fkey;
alter table public.viewer_links
  add constraint viewer_links_created_by_fkey
  foreign key (created_by) references public.users(id)
  on delete set null;

-- auctions.created_by → SET NULL
alter table public.auctions
  drop constraint if exists auctions_created_by_fkey;
alter table public.auctions
  add constraint auctions_created_by_fkey
  foreign key (created_by) references public.users(id)
  on delete set null;

-- push_subscriptions.user_id → CASCADE (subscription dies with user)
alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_user_id_fkey;
alter table public.push_subscriptions
  add constraint push_subscriptions_user_id_fkey
  foreign key (user_id) references public.users(id)
  on delete cascade;