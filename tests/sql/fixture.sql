-- Minimal PostgreSQL 17 fixture for migrations 0015-0017.
-- Isolated disposable CI database only, NEVER production.
create extension if not exists pgcrypto;
do $do$ begin
  if not exists(select 1 from pg_roles where rolname='authenticated') then
    create role authenticated nologin;
  end if;
  if not exists(select 1 from pg_roles where rolname='anon') then
    create role anon nologin;
  end if;
end $do$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid;
$$;

create table public.users(
  id uuid primary key, role text not null, display_name text
);
create table public.auctions(
  id uuid primary key default gen_random_uuid(),
  status text not null default 'DRAFT',
  config jsonb not null default '{}'::jsonb,
  mode text not null default 'DRY_RUN'
);
create table public.players(
  id uuid primary key default gen_random_uuid(),
  name text not null, grade text, status text not null default 'IN_POOL'
);
create table public.teams(
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id),
  name text not null,
  captain_user_id uuid references public.users(id),
  captain_player_id uuid references public.players(id),
  initial_purse bigint not null default 1000000
);
create table public.auction_players(
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id),
  player_id uuid not null references public.players(id),
  round integer not null default 1,
  status text not null default 'PENDING',
  order_index integer,
  sold_to_team_id uuid references public.teams(id),
  sold_price bigint,
  unique(auction_id,player_id,round)
);
create table public.bids(
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id),
  auction_player_id uuid not null references public.auction_players(id),
  team_id uuid not null references public.teams(id),
  captain_user_id uuid not null references public.users(id),
  amount bigint not null,
  is_undone boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.team_players(
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id),
  team_id uuid not null references public.teams(id),
  player_id uuid not null references public.players(id),
  price bigint not null,
  acquired_via text not null default 'BID',
  won_at timestamptz not null default now(),
  unique(auction_id,player_id)
);
create table public.purse_ledger(
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id),
  team_id uuid not null references public.teams(id),
  delta bigint not null,
  reason text not null,
  related_bid_id uuid references public.bids(id),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);
create table public.audit_log(
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Exact latest version of the existing sell_player API to be superseded.
create or replace function public.sell_player(p_auction_player_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  raise exception 'Legacy sell_player must be superseded by migration 0017';
end $$;
