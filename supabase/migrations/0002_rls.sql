-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users              enable row level security;
alter table public.auctions           enable row level security;
alter table public.teams              enable row level security;
alter table public.registrations      enable row level security;
alter table public.players            enable row level security;
alter table public.auction_players    enable row level security;
alter table public.bids               enable row level security;
alter table public.team_players       enable row level security;
alter table public.purse_ledger       enable row level security;
alter table public.audit_log          enable row level security;
alter table public.viewer_links       enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.settings           enable row level security;

-- Helper: current user's role
create or replace function public.current_role()
returns text language sql stable security definer as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_controller()
returns boolean language sql stable as $$
  select public.current_role() = 'MAIN_CONTROLLER';
$$;

create or replace function public.is_staff()
returns boolean language sql stable as $$
  select public.current_role() in ('MAIN_CONTROLLER','AUCTIONEER');
$$;

-- ---------- users ----------
create policy users_self_read on public.users
  for select using (id = auth.uid() or public.is_staff());

create policy users_self_update on public.users
  for update using (id = auth.uid() or public.is_controller());

create policy users_controller_all on public.users
  for all using (public.is_controller());

-- ---------- auctions ----------
create policy auctions_read on public.auctions
  for select using (auth.role() = 'authenticated' or true);
create policy auctions_write on public.auctions
  for all using (public.is_controller());

-- ---------- teams ----------
create policy teams_read on public.teams
  for select using (true);
create policy teams_write on public.teams
  for all using (public.is_controller());

-- ---------- registrations (controllers only) ----------
create policy regs_controller on public.registrations
  for all using (public.is_controller());

-- ---------- players ----------
-- Public read of safe fields happens via view; base table restricted.
create policy players_read_staff on public.players
  for select using (public.is_staff());

create policy players_read_captains_viewers on public.players
  for select using (auth.uid() is not null);  -- authenticated users

create policy players_write on public.players
  for all using (public.is_controller());

-- ---------- auction_players ----------
create policy ap_read on public.auction_players
  for select using (true);
create policy ap_write on public.auction_players
  for all using (public.is_staff());

-- ---------- bids ----------
create policy bids_read on public.bids
  for select using (true);
-- No INSERT/UPDATE policies → only the place_bid() RPC (SECURITY DEFINER) writes.

-- ---------- team_players ----------
create policy tp_read on public.team_players
  for select using (true);
create policy tp_write on public.team_players
  for all using (public.is_controller());

-- ---------- purse_ledger ----------
create policy pl_read_staff on public.purse_ledger
  for select using (public.is_staff());
create policy pl_write on public.purse_ledger
  for all using (public.is_controller());

-- ---------- audit_log ----------
create policy audit_read on public.audit_log
  for select using (public.is_staff());
create policy audit_insert on public.audit_log
  for insert with check (true);

-- ---------- viewer_links ----------
create policy vl_read on public.viewer_links
  for select using (true);
create policy vl_write on public.viewer_links
  for all using (public.is_controller());

-- ---------- push_subscriptions ----------
create policy push_self on public.push_subscriptions
  for all using (user_id = auth.uid());

-- ---------- settings ----------
create policy settings_read on public.settings
  for select using (true);
create policy settings_write on public.settings
  for all using (public.is_controller());