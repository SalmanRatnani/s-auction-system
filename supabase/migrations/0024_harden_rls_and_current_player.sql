-- 0024: Remove public Data API permissions that bypass trusted server-side flows.
-- Apply in a STAGING Supabase project after 0001-0023, with a fresh backup.
-- Next.js API routes use the service-role client for privileged mutations.
-- SECURITY DEFINER auction RPCs continue to execute as their function owner.

-- A self-editable role was a privilege-escalation path (sync_role_to_jwt
-- copied users.role to app_metadata). Profile changes go through /api/users/me.
drop policy if exists users_self_update on public.users;
revoke insert, update, delete on public.users from anon, authenticated;

-- Viewer tokens must never be enumerable via PostgREST.
drop policy if exists vl_read on public.viewer_links;
revoke select, insert, update, delete on public.viewer_links from anon, authenticated;

-- A client must never be allowed to forge audit records.
drop policy if exists audit_insert on public.audit_log;
revoke insert, update, delete on public.audit_log from anon, authenticated;

-- Remove the broad authenticated players policy: the base table contains
-- registration and proof details. Staff retains players_read_staff.
drop policy if exists players_read_captains_viewers on public.players;

-- RLS is row-oriented, not a substitute for controlling write privileges.
-- Mutations to the auction/roster/ledger must use audited server endpoints
-- or the restricted SECURITY DEFINER RPCs, never client-side table writes.
drop policy if exists ap_write on public.auction_players;
drop policy if exists tp_write on public.team_players;
drop policy if exists pl_write on public.purse_ledger;
revoke insert, update, delete on
  public.auctions, public.teams, public.registrations, public.players,
  public.auction_players, public.bids, public.team_players,
  public.purse_ledger, public.settings
from anon, authenticated;

-- A private proof must only be uploaded by a controller or by the
-- service-role-issued signed upload URL flow.
drop policy if exists "age_proofs_staff_write" on storage.objects;
create policy "age_proofs_controller_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'age-proofs' and public.is_controller());

-- Even if concurrent auctioneers race, the DB may expose only one player
-- on the block per auction. Migration intentionally fails if pre-existing
-- data violates this rule; resolve in staging rather than discarding data.
create unique index if not exists one_current_auction_player
  on public.auction_players(auction_id)
  where status = 'CURRENT';
