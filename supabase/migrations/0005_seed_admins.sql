-- ============================================================
-- SEED ADMINS
-- The handle_new_user trigger assigns MAIN_CONTROLLER to these emails
-- automatically at sign-in. This block is just a safeguard for users
-- who already exist in auth.users.
-- ============================================================

insert into public.settings (key, value)
values ('admin_emails', jsonb_build_array(
  's.ratnani786110@gmail.com',
  'gojosatoru786110@gmail.com'
))
on conflict (key) do update set value = excluded.value;