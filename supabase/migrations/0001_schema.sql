-- ============================================================
-- S AUCTION SYSTEM — SCHEMA
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- users ----------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  role text not null default 'VIEWER'
    check (role in ('MAIN_CONTROLLER','AUCTIONEER','CAPTAIN','VIEWER')),
  created_at timestamptz not null default now()
);

-- ---------- auctions ----------
create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mode text not null default 'DRY_RUN' check (mode in ('DRY_RUN','LIVE')),
  status text not null default 'DRAFT' check (status in ('DRAFT','LIVE','PAUSED','ENDED')),
  config jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- teams ----------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  name text not null,
  logo_url text,
  captain_user_id uuid references public.users(id),
  initial_purse bigint not null default 10000000,  -- 1 Cr in paise
  created_at timestamptz not null default now(),
  unique (auction_id, name),
  unique (auction_id, captain_user_id)
);

-- ---------- registrations (raw, from Google Form webhook) ----------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  google_response_id text unique,
  raw jsonb not null,
  name text, dob date, age int,
  phone text,
  playing_centre text,
  participation_history text,
  played_mira_bhayandar boolean,
  achievements text,
  image_url text,
  age_proof_url text,
  age_proof_type text,
  status text not null default 'PENDING'
    check (status in ('PENDING','APPROVED','REJECTED','DUPLICATE')),
  duplicate_group_id uuid,
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  submitted_at timestamptz default now()
);

create index on public.registrations (status);
create index on public.registrations (duplicate_group_id);

-- ---------- players (approved) ----------
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  player_code text unique not null,
  registration_id uuid references public.registrations(id),
  name text not null,
  dob date, age int,
  image_url text,
  achievements text,
  playing_centre text,
  participation_history text,
  played_mira_bhayandar boolean,
  age_proof_url text,
  age_proof_type text,
  grade text check (grade in ('A+','A1','A2','A3',
                              'B1','B2','B3','B4','B5',
                              'C1','C2','C3','C4',
                              'K1','K2','W1','W2','G1')),
  status text not null default 'IN_POOL'
    check (status in ('IN_POOL','UNSOLD','SOLD','WITHDRAWN')),
  created_at timestamptz not null default now()
);

create index on public.players (grade);
create index on public.players (status);

-- ---------- auction_players (queue per auction) ----------
create table if not exists public.auction_players (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  round int not null default 1,
  status text not null default 'PENDING'
    check (status in ('PENDING','CURRENT','SOLD','UNSOLD','SKIPPED')),
  sold_to_team_id uuid references public.teams(id),
  sold_price bigint,
  order_index int,
  created_at timestamptz not null default now(),
  unique (auction_id, player_id, round)
);

create index on public.auction_players (auction_id, status);

-- ---------- bids (append-only) ----------
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  auction_player_id uuid not null references public.auction_players(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  captain_user_id uuid not null references public.users(id),
  amount bigint not null check (amount > 0),
  is_undone boolean not null default false,
  created_at timestamptz not null default now()
);

create index on public.bids (auction_player_id, created_at desc);
create index on public.bids (auction_id, created_at desc);

-- ---------- team_players (final rosters) ----------
create table if not exists public.team_players (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id),
  price bigint not null,
  acquired_via text not null default 'BID'
    check (acquired_via in ('BID','ROUND2','MANUAL_ALLOT')),
  won_at timestamptz not null default now(),
  unique (auction_id, player_id)
);

-- ---------- purse_ledger (source of truth) ----------
create table if not exists public.purse_ledger (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  delta bigint not null,
  reason text not null check (reason in ('BID_WON','TOPUP','REFUND')),
  related_bid_id uuid references public.bids(id),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index on public.purse_ledger (auction_id, team_id);

-- ---------- audit_log ----------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index on public.audit_log (created_at desc);

-- ---------- viewer_links ----------
create table if not exists public.viewer_links (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz not null,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

-- ---------- push_subscriptions ----------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null,
  keys jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- ---------- settings (global key-value) ----------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- DERIVED VIEWS
-- ============================================================

create or replace view public.team_purses as
select
  t.id as team_id,
  t.auction_id,
  t.name,
  t.initial_purse,
  t.initial_purse + coalesce(sum(pl.delta), 0) as remaining_purse,
  coalesce(sum(case when pl.reason = 'BID_WON' then -pl.delta else 0 end), 0) as spent,
  (select count(*) from public.team_players tp
    where tp.team_id = t.id and tp.auction_id = t.auction_id) as squad_count
from public.teams t
left join public.purse_ledger pl on pl.team_id = t.id
group by t.id;

-- Public-safe player view (viewers/captains see this only)
create or replace view public.players_public as
select id, player_code, name, image_url, grade, achievements, playing_centre
from public.players
where status in ('IN_POOL','UNSOLD','SOLD');