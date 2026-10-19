-- Optional second registered playing captain. Independent from captain login roles.
-- Existing team/player records remain unchanged.
alter table public.teams add column if not exists co_captain_player_id uuid
  references public.players(id) on delete set null;
alter table public.teams drop constraint if exists team_distinct_playing_captains;
alter table public.teams add constraint team_distinct_playing_captains
  check (co_captain_player_id is null or co_captain_player_id is distinct from captain_player_id);
create unique index if not exists teams_unique_second_playing_captain
  on public.teams(co_captain_player_id) where co_captain_player_id is not null;

-- Prevent a player from being selected in either slot on multiple teams.
create or replace function public.check_playing_captain_slots()
returns trigger language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.auction_id::text));
  if new.captain_player_id is not null and new.captain_player_id = new.co_captain_player_id then
    raise exception 'The two playing captain slots must refer to different players';
  end if;
  if exists (
    select 1 from public.teams t where t.id <> new.id
      and (new.captain_player_id is not null and
          (t.captain_player_id = new.captain_player_id or t.co_captain_player_id = new.captain_player_id)
        or new.co_captain_player_id is not null and
          (t.captain_player_id = new.co_captain_player_id or t.co_captain_player_id = new.co_captain_player_id))
  ) then raise exception 'Playing captain is already reserved for another team';
  end if;
  return new;
end $$;
drop trigger if exists check_playing_captain_slots on public.teams;
create trigger check_playing_captain_slots before insert or update of captain_player_id, co_captain_player_id
on public.teams for each row execute function public.check_playing_captain_slots();
