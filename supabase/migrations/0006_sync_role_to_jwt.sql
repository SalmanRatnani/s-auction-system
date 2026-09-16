-- ============================================================
-- 0006 — SYNC ROLE TO JWT
-- Mirrors public.users.role → auth.users.raw_app_meta_data.role
-- so middleware can read role from the JWT.
-- ============================================================

create or replace function public.sync_role_to_jwt()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update auth.users
    set raw_app_meta_data =
      coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', new.role)
  where id = new.id;
  return new;
end $$;

drop trigger if exists on_user_role_change on public.users;
create trigger on_user_role_change
  after insert or update of role on public.users
  for each row execute function public.sync_role_to_jwt();

-- Backfill any users that already exist
update auth.users u
set raw_app_meta_data =
  coalesce(u.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', p.role)
from public.users p
where p.id = u.id;