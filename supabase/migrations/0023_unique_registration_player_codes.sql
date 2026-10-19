-- 0023: Prevent player-code reuse when QA/test player rows are deleted.
-- Player approval, code allocation, and audit now share one transaction.

create sequence if not exists public.sas_player_code_seq as bigint start with 1 increment by 1 minvalue 1;

-- Start after the largest code already present (do not use COUNT(*)).
-- Example: SAS-2026-0003 means the next allocation must be >= 0004.
select setval(
  'public.sas_player_code_seq'::regclass,
  coalesce(max(substring(player_code from '^SAS-[0-9]{4}-([0-9]+)$')::bigint),1),
  count(*) > 0
)
from public.players where player_code ~ '^SAS-[0-9]{4}-[0-9]+$';

-- One real registration corresponds to one player across all ingestion paths.
create unique index if not exists players_one_per_registration
  on public.players(registration_id) where registration_id is not null;

create or replace function public.approve_registration_player(
  p_registration_id uuid,
  p_grade text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_reg public.registrations%rowtype;
  v_player_id uuid;
  v_number bigint;
  v_code text;
begin
  if v_actor is null or not exists (
    select 1 from public.users u where u.id = v_actor and u.role = 'MAIN_CONTROLLER'
  ) then
    raise exception 'Only the Main Controller can approve registrations';
  end if;

  if p_grade is null or p_grade not in (
    'A+','A1','A2','A3','B1','B2','B3','B4','B5',
    'C1','C2','C3','C4','K1','K2','W1','W2','G1'
  ) then
    raise exception 'Invalid player grade';
  end if;

  -- Serializes duplicate clicks, retries, and simultaneous approvals
  -- of the same registration.
  select * into v_reg from public.registrations
  where id = p_registration_id for update;
  if not found then raise exception 'Registration not found'; end if;

  select p.id into v_player_id from public.players p
  where p.registration_id = p_registration_id
  limit 1;
  if v_player_id is not null then
    if v_reg.status = 'APPROVED' then return v_player_id; end if;
    raise exception 'A player already exists for this registration. Review it before approving again.';
  end if;
  if v_reg.status <> 'PENDING' then
    raise exception 'Registration is %, not PENDING', v_reg.status;
  end if;

  -- nextval is safe across simultaneous approvals. Never derive IDs from
  -- the number of currently stored players.
  loop
    v_number := nextval('public.sas_player_code_seq'::regclass);
    v_code := 'SAS-' || to_char(current_date, 'YYYY') || '-' ||
      lpad(v_number::text, greatest(4, length(v_number::text)), '0');
    exit when not exists (
      select 1 from public.players p where p.player_code = v_code
    );
  end loop;

  insert into public.players (
    player_code, registration_id, name, playing_hand, playing_centre,
    achievements, image_url, grade, status
  ) values (
    v_code, v_reg.id, v_reg.name, v_reg.playing_hand, v_reg.playing_centre,
    v_reg.achievements, v_reg.image_url, p_grade, 'IN_POOL'
  ) returning id into v_player_id;

  update public.registrations set
    status = 'APPROVED',
    reviewed_by = v_actor,
    reviewed_at = now()
  where id = p_registration_id;

  insert into public.audit_log(actor_user_id, action, entity_type, entity_id, payload)
  values(v_actor, 'REGISTRATION_APPROVED', 'registration', p_registration_id,
         jsonb_build_object('grade', p_grade, 'player_id', v_player_id, 'player_code', v_code));

  return v_player_id;
end $$;

revoke all on function public.approve_registration_player(uuid,text) from public,anon;
grant execute on function public.approve_registration_player(uuid,text) to authenticated;
