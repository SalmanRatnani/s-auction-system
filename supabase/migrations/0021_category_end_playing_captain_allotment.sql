-- 0021: Immediately and transactionally allot playing captains when their grade closes.
-- Do not mutate existing auctions or player data on deployment.

create or replace function public.allot_completed_captain_grade(p_auction_id uuid,p_grade text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_config jsonb; v_status text; v_finalized timestamptz;
 v_reserved record; v_grade text; v_price bigint; v_average numeric; v_fallback bigint;
 v_remaining bigint; v_squad int; v_max_squad int; v_count int:=0;
 v_result jsonb:='[]'::jsonb; v_existing_ap uuid;
 p_default_base_prices jsonb := '{"A+":30000000,"A1":20000000,"A2":15000000,"A3":15000000,"B1":10000000,"B2":10000000,"B3":7500000,"B4":7500000,"B5":5000000,"C1":3000000,"C2":3000000,"C3":1500000,"C4":1500000,"K1":2500000,"K2":2500000,"W1":10000000,"W2":5000000,"G1":1000000}'::jsonb;
begin
 select status,config,captains_finalized_at into v_status,v_config,v_finalized
 from public.auctions where id=p_auction_id for update;
 if v_status is distinct from 'LIVE' then raise exception 'Auction must be LIVE for category allotment'; end if;
 if v_finalized is not null then return jsonb_build_object('count',0,'assignments','[]'::jsonb); end if;
 if exists (
   select 1 from public.auction_players ap join public.players p on p.id=ap.player_id
   where ap.auction_id=p_auction_id and p.grade=p_grade and ap.status in ('PENDING','CURRENT')
 ) then raise exception 'Category % still has ordinary players awaiting sale or skip',p_grade; end if;
 if exists (
   select 1 from public.auction_players first join public.players p on p.id=first.player_id
   where first.auction_id=p_auction_id and p.grade=p_grade and first.status='UNSOLD'
     and not exists (
       select 1 from public.auction_players retry
       where retry.auction_id=first.auction_id and retry.player_id=first.player_id
         and retry.round>first.round and retry.status in ('SOLD','SKIPPED')
     )
 ) then raise exception 'Category % has an unresolved unsold player',p_grade; end if;
  for v_reserved in
    select t.id as team_id,t.name as team_name,t.initial_purse,
      c.player_id,c.slot,p.grade,p.status as player_status
    from public.teams t
    cross join lateral (
      values(t.captain_player_id,1),(t.co_captain_player_id,2)
    ) c(player_id,slot)
    join public.players p on p.id=c.player_id
    where t.auction_id=p_auction_id and p.grade=p_grade
      and not exists (select 1 from public.team_players tp where tp.auction_id=p_auction_id and tp.player_id=c.player_id)
    order by t.id,c.slot
  loop
    v_grade:=v_reserved.grade;
    if v_grade is null or v_reserved.player_status <> 'IN_POOL' then
      raise exception 'Reserved playing captain must be a graded IN_POOL player';
    end if;
    if exists(select 1 from public.team_players where auction_id=p_auction_id and player_id=v_reserved.player_id) then
      raise exception 'Reserved captain already appears on a team roster';
    end if;
    if exists(select 1 from public.team_players tp
      join public.players p on p.id=tp.player_id
      where tp.auction_id=p_auction_id and tp.team_id=v_reserved.team_id and p.grade=v_grade) then
      raise exception 'Team % already owns category %',v_reserved.team_name,v_grade;
    end if;

    select round(avg(tp.price)) into v_average
      from public.team_players tp
      join public.players p on p.id=tp.player_id
      where tp.auction_id=p_auction_id and p.grade=v_grade
        and tp.acquired_via <> 'MANUAL_ALLOT';
    v_fallback:=(p_default_base_prices->>v_grade)::bigint;
    v_price:=coalesce(v_average::bigint,
      nullif((v_config->'basePrices'->>v_grade)::bigint,0),
      v_fallback);
    if v_price is null or v_price<=0 then
      raise exception 'No valid base or average price for grade %',v_grade;
    end if;

    select t.initial_purse+coalesce(sum(pl.delta),0) into v_remaining
      from public.teams t left join public.purse_ledger pl
      on pl.team_id=t.id and pl.auction_id=p_auction_id
      where t.id=v_reserved.team_id group by t.initial_purse;
    if v_price > v_remaining then
      raise exception 'Team % needs % paise for reserved captain but has only %',
        v_reserved.team_name,v_price,v_remaining;
    end if;

    select count(*) into v_squad from public.team_players where auction_id=p_auction_id and team_id=v_reserved.team_id;
    v_max_squad:=coalesce(nullif((v_config->>'maxSquad')::int,0),18);
    if v_squad >= v_max_squad then raise exception 'Team % has a full squad',v_reserved.team_name; end if;

    -- Historical, incorrectly seeded captains can have a PENDING queue row.
    select id into v_existing_ap from public.auction_players
      where auction_id=p_auction_id and player_id=v_reserved.player_id order by round desc limit 1 for update;
    if v_existing_ap is null then
      insert into public.auction_players(auction_id,player_id,round,status,sold_to_team_id,sold_price)
      values(p_auction_id,v_reserved.player_id,3,'SOLD',v_reserved.team_id,v_price);
    else
      update public.auction_players set status='SOLD',sold_to_team_id=v_reserved.team_id,sold_price=v_price
        where id=v_existing_ap and status in ('PENDING','UNSOLD');
      if not found then raise exception 'Reserved captain has an incompatible auction status'; end if;
    end if;
    insert into public.team_players(auction_id,team_id,player_id,price,acquired_via)
      values(p_auction_id,v_reserved.team_id,v_reserved.player_id,v_price,'MANUAL_ALLOT');
    insert into public.purse_ledger(auction_id,team_id,delta,reason,related_bid_id,created_by)
      values(p_auction_id,v_reserved.team_id,-v_price,'BID_WON',null,auth.uid());
    update public.players set status='SOLD' where id=v_reserved.player_id;
    insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
      values(auth.uid(),'CAPTAIN_ASSIGNED','player',v_reserved.player_id,
        jsonb_build_object('team_id',v_reserved.team_id,'slot',v_reserved.slot,
          'grade',v_grade,'price',v_price,
          'basis',case when v_average is null then 'base_price' else 'average' end));
    v_result:=v_result||jsonb_build_array(jsonb_build_object(
      'player_id',v_reserved.player_id,'team_id',v_reserved.team_id,'team_name',v_reserved.team_name,
      'slot',v_reserved.slot,'grade',v_grade,'price',v_price,
      'basis',case when v_average is null then 'base_price' else 'average' end));
    v_count:=v_count+1;
  end loop;

 if v_count>0 then
   insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
   values(auth.uid(),'CAPTAIN_GRADE_FINALIZED','auction',p_auction_id,
     jsonb_build_object('grade',p_grade,'count',v_count,'assignments',v_result));
 end if;
 return jsonb_build_object('count',v_count,'assignments',v_result);
end $$;
revoke all on function public.allot_completed_captain_grade(uuid,text) from public,anon,authenticated;

create or replace function public.close_completed_captain_grades(p_auction_id uuid,p_before_grade text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_grade text; v_order text[]:=array['A+','A1','A2','A3','B1','B2','B3','B4','B5','C1','C2','C3','C4','K1','K2','W1','W2','G1'];
 v_rank int; v_count int:=0; v_res jsonb;
begin
 if not exists(select 1 from public.users where id=auth.uid() and role in ('MAIN_CONTROLLER','AUCTIONEER')) then
  raise exception 'Auction staff required';
 end if;
 v_rank:=coalesce(array_position(v_order,p_before_grade),array_length(v_order,1)+1);
 if p_before_grade is not null and array_position(v_order,p_before_grade) is null then raise exception 'Invalid category'; end if;
 for v_grade in select unnest(v_order[1:v_rank-1]) loop
   v_res:=public.allot_completed_captain_grade(p_auction_id,v_grade);
   v_count:=v_count+coalesce((v_res->>'count')::int,0);
 end loop;
 return jsonb_build_object('allotted',v_count);
end $$;
revoke all on function public.close_completed_captain_grades(uuid,text) from public,anon;
grant execute on function public.close_completed_captain_grades(uuid,text) to authenticated;

create or replace function public.sell_player(
  p_auction_player_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_ap record;
  v_winning_bid record;
  v_player_grade text;
  v_category_owned int;
  v_remaining bigint;
  v_reserve bigint;
begin
  select role into v_role from public.users where id = v_uid;
  if v_role not in ('MAIN_CONTROLLER','AUCTIONEER') then
    raise exception 'Only staff can confirm sales';
  end if;

  select * into v_ap from public.auction_players
    where id = p_auction_player_id for update;

  if v_ap.status <> 'CURRENT' then raise exception 'Player is not on the block'; end if;
  if not exists (select 1 from public.auctions where id = v_ap.auction_id and status = 'LIVE' and captains_finalized_at is null)
    then raise exception 'Auction not live'; end if;
  if exists (select 1 from public.teams
    where auction_id = v_ap.auction_id and
     (captain_player_id = v_ap.player_id or co_captain_player_id = v_ap.player_id))
    then raise exception 'Reserved playing captains cannot be sold at auction'; end if;

  select * into v_winning_bid
  from public.bids
  where auction_player_id = p_auction_player_id and is_undone = false
  order by amount desc, created_at asc
  limit 1;

  if not found then
    raise exception 'No bids placed';
  end if;

  -- Get the current player's grade
  select grade into v_player_grade
  from public.players
  where id = v_ap.player_id;

  -- Guard: winning team must not already own this grade
  select count(*) into v_category_owned
  from public.team_players tp
  join public.players p on p.id = tp.player_id
  where tp.team_id = v_winning_bid.team_id
    and tp.auction_id = v_ap.auction_id
    and p.grade = v_player_grade;

  if exists(
    select 1 from public.teams t
    left join public.players p1 on p1.id = t.captain_player_id
    left join public.players p2 on p2.id = t.co_captain_player_id
    where t.id = v_winning_bid.team_id
      and (p1.grade = v_player_grade or p2.grade = v_player_grade)
  ) then raise exception 'The winning team has reserved this grade for a playing captain'; end if;

  if v_category_owned > 0 then
    raise exception 'Winning team already has a % player. Undo this bid or mark the player unsold.', v_player_grade;
  end if;

  select t.initial_purse + coalesce(sum(pl.delta),0) into v_remaining
    from public.teams t left join public.purse_ledger pl on pl.team_id=t.id and pl.auction_id=v_ap.auction_id
    where t.id=v_winning_bid.team_id group by t.initial_purse;
  v_reserve:=public.playing_captain_base_reserve(v_winning_bid.team_id);
  if v_winning_bid.amount > v_remaining - v_reserve then
    raise exception 'Sale would consume the protected playing-captain base-price reserve';
  end if;

  update public.auction_players
    set status = 'SOLD',
        sold_to_team_id = v_winning_bid.team_id,
        sold_price = v_winning_bid.amount
    where id = p_auction_player_id;

  update public.players set status = 'SOLD'
    where id = v_ap.player_id;

  insert into public.team_players (auction_id, team_id, player_id, price, acquired_via)
  values (v_ap.auction_id, v_winning_bid.team_id, v_ap.player_id,
          v_winning_bid.amount,
          case when v_ap.round > 1 then 'ROUND2' else 'BID' end);

  insert into public.purse_ledger (auction_id, team_id, delta, reason,
                                   related_bid_id, created_by)
  values (v_ap.auction_id, v_winning_bid.team_id, -v_winning_bid.amount,
          'BID_WON', v_winning_bid.id, v_uid);

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, payload)
  values (v_uid, 'PLAYER_SOLD', 'auction_player', p_auction_player_id,
          jsonb_build_object('team_id', v_winning_bid.team_id,
                             'amount', v_winning_bid.amount,
                             'grade', v_player_grade));

  -- Last ordinary player of this category has just sold: allot its captains.
  perform public.allot_completed_captain_grade(v_ap.auction_id,v_player_grade);
  return jsonb_build_object(
    'sold_to', v_winning_bid.team_id,
    'price', v_winning_bid.amount
  );
end $$;


create or replace function public.skip_reauctioned_player(p_auction_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_role text; v_status text; v_current public.auction_players%rowtype; v_grade text;
begin
 select role into v_role from public.users where id=auth.uid();
 if v_role is distinct from 'MAIN_CONTROLLER' then raise exception 'Only the Main Controller may skip a player'; end if;
 select status into v_status from public.auctions where id=p_auction_id for update;
 if v_status is distinct from 'LIVE' then raise exception 'Auction must be LIVE'; end if;
 select * into v_current from public.auction_players
   where auction_id=p_auction_id and status='CURRENT' for update;
 if not found then raise exception 'No current player to skip'; end if;
 if v_current.round <= 1 then raise exception 'Player must be re-auctioned at least once before being skipped'; end if;
 if exists(select 1 from public.teams
   where auction_id=p_auction_id and
     (captain_player_id=v_current.player_id or co_captain_player_id=v_current.player_id)) then
   raise exception 'Playing captains cannot be skipped through ordinary auction';
 end if;
 update public.auction_players set status='SKIPPED' where id=v_current.id;
 update public.players set status='UNSOLD' where id=v_current.player_id;
 select grade into v_grade from public.players where id=v_current.player_id;
 perform public.allot_completed_captain_grade(p_auction_id,v_grade);
 insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
 values(auth.uid(),'REAUCTION_SKIPPED','auction_player',v_current.id,
   jsonb_build_object('attempt',v_current.round));
 return jsonb_build_object('ok',true,'skipped',true);
end $$;

revoke all on function public.sell_player(uuid) from public,anon;
grant execute on function public.sell_player(uuid) to authenticated;
revoke all on function public.skip_reauctioned_player(uuid) from public,anon;
grant execute on function public.skip_reauctioned_player(uuid) to authenticated;

-- Final action is now only an end-of-auction reconciliation, not the first
-- time captains are charged. Remaining grade slots are handled once each.
create or replace function public.finalize_playing_captains(p_auction_id uuid,p_default_base_prices jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_role text; v_status text; v_done timestamptz; v_rows int; v_result jsonb;
begin
 select role into v_role from public.users where id=auth.uid();
 if v_role is distinct from 'MAIN_CONTROLLER' then raise exception 'Only controller may finalize'; end if;
 select status,captains_finalized_at into v_status,v_done from public.auctions where id=p_auction_id for update;
 if v_status is distinct from 'LIVE' then raise exception 'Auction must be LIVE'; end if;
 if v_done is not null then raise exception 'Auction already finalized'; end if;
 if not exists(select 1 from public.auction_players where auction_id=p_auction_id and round=1) then
   raise exception 'Auction has not started';
 end if;
 if exists(select 1 from public.auction_players where auction_id=p_auction_id and status in ('PENDING','CURRENT')) then
   raise exception 'Ordinary player auctions are incomplete';
 end if;
 -- Fail atomically for any unresolved retries; no extra allotments sneak in.
 if exists (
  select 1 from public.auction_players x
  where x.auction_id=p_auction_id and x.status='UNSOLD'
    and not exists(
     select 1 from public.auction_players newer
     where newer.auction_id=x.auction_id and newer.player_id=x.player_id
       and newer.round>x.round and newer.status in ('SOLD','SKIPPED')
    )
 ) then raise exception 'Complete or skip every unsold player'; end if;
 v_result:=public.close_completed_captain_grades(p_auction_id,null);
 if exists(select 1 from public.teams t cross join lateral(values(t.captain_player_id),(t.co_captain_player_id)) slot(player_id)
   where t.auction_id=p_auction_id and slot.player_id is not null and
   not exists(select 1 from public.team_players tp where tp.auction_id=p_auction_id and tp.player_id=slot.player_id)) then
   raise exception 'One or more playing captains were not allotted';
 end if;
 update public.auctions set captains_finalized_at=now() where id=p_auction_id;
 insert into public.audit_log(actor_user_id,action,entity_type,entity_id,payload)
 values(auth.uid(),'PLAYING_CAPTAINS_FINALIZED','auction',p_auction_id,v_result);
 return jsonb_build_object('count',coalesce((v_result->>'allotted')::int,0),'assignments','[]'::jsonb);
end $$;
revoke all on function public.finalize_playing_captains(uuid,jsonb) from public,anon;
grant execute on function public.finalize_playing_captains(uuid,jsonb) to authenticated;
