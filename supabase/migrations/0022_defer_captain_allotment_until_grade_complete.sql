-- 0022: Allow ordinary sales before category completion; enforce closure at transitions.
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
 ) then return jsonb_build_object('count',0,'assignments','[]'::jsonb); end if;
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
   if exists(select 1 from public.auction_players ap join public.players p on p.id=ap.player_id
      where ap.auction_id=p_auction_id and p.grade=v_grade and ap.status in ('PENDING','CURRENT')) then
      raise exception 'Complete category % before moving to another category',v_grade;
   end if;
   v_res:=public.allot_completed_captain_grade(p_auction_id,v_grade);
   v_count:=v_count+coalesce((v_res->>'count')::int,0);
 end loop;
 return jsonb_build_object('allotted',v_count);
end $$;

revoke all on function public.allot_completed_captain_grade(uuid,text) from public,anon,authenticated;
revoke all on function public.close_completed_captain_grades(uuid,text) from public,anon;
grant execute on function public.close_completed_captain_grades(uuid,text) to authenticated;
