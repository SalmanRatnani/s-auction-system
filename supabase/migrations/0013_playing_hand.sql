-- ============================================================
-- 0013 — PLAYING HAND
-- New Google Form field (Right / Left). DOB, phone, age proof,
-- Mira Bhayandar and participation history are no longer collected;
-- their columns are left in place (nullable) so old rows keep working.
-- ============================================================

alter table public.registrations add column if not exists playing_hand text;
alter table public.players       add column if not exists playing_hand text;

-- Expose playing_hand in the public-safe view (new column appended last,
-- which is what CREATE OR REPLACE VIEW allows).
create or replace view public.players_public as
select id, player_code, name, image_url, grade, achievements, playing_centre,
       playing_hand
from public.players
where status in ('IN_POOL','UNSOLD','SOLD');
