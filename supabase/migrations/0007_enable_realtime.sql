-- ============================================================
-- 0007 — ENABLE REALTIME
-- Adds auction tables to the supabase_realtime publication so
-- Postgres Changes events are broadcast to subscribed clients.
-- ============================================================

-- Guard: only add if not already in the publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bids'
  ) then
    alter publication supabase_realtime add table public.bids;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'auction_players'
  ) then
    alter publication supabase_realtime add table public.auction_players;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'auctions'
  ) then
    alter publication supabase_realtime add table public.auctions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'purse_ledger'
  ) then
    alter publication supabase_realtime add table public.purse_ledger;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'team_players'
  ) then
    alter publication supabase_realtime add table public.team_players;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'teams'
  ) then
    alter publication supabase_realtime add table public.teams;
  end if;
end $$;

-- Replica identity FULL so UPDATE / DELETE events carry complete row data.
-- Required for filters to work reliably on updates.
alter table public.bids            replica identity full;
alter table public.auction_players replica identity full;
alter table public.auctions        replica identity full;
alter table public.purse_ledger    replica identity full;
alter table public.team_players    replica identity full;
alter table public.teams           replica identity full;