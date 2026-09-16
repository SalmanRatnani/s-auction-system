-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public)
values ('player-images', 'player-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('age-proofs', 'age-proofs', false)   -- private
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;

-- player-images: public read, controller write
create policy "player_images_public_read"
  on storage.objects for select
  using (bucket_id = 'player-images');

create policy "player_images_staff_write"
  on storage.objects for insert
  with check (bucket_id = 'player-images' and public.is_staff());

-- age-proofs: controller-only read
create policy "age_proofs_controller_read"
  on storage.objects for select
  using (bucket_id = 'age-proofs' and public.is_controller());

create policy "age_proofs_staff_write"
  on storage.objects for insert
  with check (bucket_id = 'age-proofs');

-- team-logos: public read
create policy "team_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'team-logos');

create policy "team_logos_controller_write"
  on storage.objects for insert
  with check (bucket_id = 'team-logos' and public.is_controller());