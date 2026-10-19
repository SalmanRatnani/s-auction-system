-- Block ordinary bids in either registered playing captain's category.
-- One category per team, even before the captain is finalized.
create or replace function public.reject_reserved_playing_captain_bid()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_player_id uuid; v_auction_id uuid; v_grade text; v_reserved_grade text;
begin
  select ap.player_id,ap.auction_id,p.grade into v_player_id,v_auction_id,v_grade
  from public.auction_players ap join public.players p on p.id=ap.player_id
  where ap.id=new.auction_player_id;
  if v_player_id is null then raise exception 'Auction player not found'; end if;
  if new.auction_id is distinct from v_auction_id then
    raise exception 'Bid auction does not match player auction';
  end if;
  if exists(select 1 from public.teams t where t.auction_id=v_auction_id
   and (t.captain_player_id=v_player_id or t.co_captain_player_id=v_player_id)) then
    raise exception 'Reserved playing captains cannot receive bids';
  end if;
  select p.grade into v_reserved_grade from public.teams t
  join public.players p on p.id in (t.captain_player_id,t.co_captain_player_id)
  where t.id=new.team_id and t.auction_id=v_auction_id and p.grade=v_grade limit 1;
  if found then raise exception
    'Your team already reserves category % for a playing captain; cannot bid on another % player',
    v_grade,v_grade;
  end if;
  return new;
end $$;

create or replace function public.check_playing_captain_slots()
returns trigger language plpgsql set search_path=public as $$
declare v_first_grade text; v_second_grade text;
begin
  perform pg_advisory_xact_lock(hashtext(new.auction_id::text));
  if new.captain_player_id is not null and new.captain_player_id=new.co_captain_player_id then
    raise exception 'Both playing captains must be different players';
  end if;
  select grade into v_first_grade from public.players where id=new.captain_player_id;
  select grade into v_second_grade from public.players where id=new.co_captain_player_id;
  if v_first_grade is not null and v_second_grade is not null and v_first_grade=v_second_grade then
    raise exception 'Both playing captains cannot belong to the same category %',v_first_grade;
  end if;
  if exists(select 1 from public.teams t where t.id<>new.id and (
    (new.captain_player_id is not null and
      (t.captain_player_id=new.captain_player_id or t.co_captain_player_id=new.captain_player_id))
    or
    (new.co_captain_player_id is not null and
      (t.captain_player_id=new.co_captain_player_id or t.co_captain_player_id=new.co_captain_player_id))
  )) then raise exception 'Playing captain already reserved for another team'; end if;
  if exists(select 1 from public.team_players tp
    join public.players p on p.id=tp.player_id where tp.team_id=new.id
    and tp.auction_id=new.auction_id
    and (p.grade=v_first_grade or p.grade=v_second_grade)
    and tp.player_id is distinct from new.captain_player_id
    and tp.player_id is distinct from new.co_captain_player_id) then
      raise exception 'This team already owns a player in the selected captain category';
  end if;
  return new;
end $$;
