-- Executed only in a disposable PostgreSQL CI container.
create or replace function public.expect_error(p_statement text,p_message text)
returns void language plpgsql as $$
declare v_error text; v_failed boolean := false;
begin
  begin
    execute p_statement;
  exception when others then
    v_failed := true;
    get stacked diagnostics v_error = MESSAGE_TEXT;
    if position(lower(p_message) in lower(v_error)) = 0 then
      raise exception 'Expected error containing %, got %',p_message,v_error;
    end if;
  end;
  if not v_failed then raise exception 'Expected SQL to fail: %',p_statement; end if;
end $$;
create or replace function public.assert_test(p_ok boolean,p_message text)
returns void language plpgsql as $$
begin if p_ok is distinct from true then raise exception 'Test failure: %',p_message; end if; end $$;

insert into public.users(id,role,display_name) values
('00000000-0000-4000-8000-000000000001','MAIN_CONTROLLER','Controller'),
('00000000-0000-4000-8000-000000000002','CAPTAIN','Team1'),
('00000000-0000-4000-8000-000000000003','CAPTAIN','Team2 primary'),
('00000000-0000-4000-8000-000000000004','CAPTAIN','Team2 partner'),
('00000000-0000-4000-8000-000000000005','CAPTAIN','Team3');

select set_config('test.uid','00000000-0000-4000-8000-000000000001',false);
insert into public.auctions(id,status,config) values
('00000000-0000-4000-8000-00000000a001','DRAFT','{"basePrices":{"A1":7000}}'::jsonb),
('00000000-0000-4000-8000-00000000a002','DRAFT','{"basePrices":{"C1":10000}}'::jsonb);

insert into public.players(id,name,grade) values
('00000000-0000-4000-8000-00000000c001','Reserved Captain A+','A+'),
('00000000-0000-4000-8000-00000000c002','Reserved Captain A1','A1'),
('00000000-0000-4000-8000-00000000c003','Round 1 A+','A+'),
('00000000-0000-4000-8000-00000000c004','Unsold Round 1 A+','A+'),
('00000000-0000-4000-8000-00000000c005','Unsold A1','A1'),
('00000000-0000-4000-8000-00000000c006','Reserved Captain C1','C1'),
('00000000-0000-4000-8000-00000000c007','Ordinary C1','C1'),
('00000000-0000-4000-8000-00000000c008','Same Grade Test','A+');

insert into public.teams(id,auction_id,name,captain_user_id,captain_player_id,co_captain_player_id,initial_purse) values
('00000000-0000-4000-8000-00000000b001','00000000-0000-4000-8000-00000000a001','Team 1','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-00000000c001','00000000-0000-4000-8000-00000000c002',1000000),
('00000000-0000-4000-8000-00000000b002','00000000-0000-4000-8000-00000000a001','Team 2','00000000-0000-4000-8000-000000000003',null,null,1000000);
insert into public.teams(id,auction_id,name,captain_user_id,initial_purse) values
('00000000-0000-4000-8000-00000000b004','00000000-0000-4000-8000-00000000a001',
 'Team 3','00000000-0000-4000-8000-000000000005',1000000);
update public.teams set co_captain_user_id='00000000-0000-4000-8000-000000000004'
 where id='00000000-0000-4000-8000-00000000b002';

select public.expect_error(
  $$update public.teams set co_captain_player_id='00000000-0000-4000-8000-00000000c008'
    where id='00000000-0000-4000-8000-00000000b001'$$,
  'different categories');
select public.expect_error(
  $$insert into public.teams(auction_id,name,captain_user_id)
    values('00000000-0000-4000-8000-00000000a001','Invalid duplicate','00000000-0000-4000-8000-000000000004')$$,
  'already captains another team');

update public.auctions set status='LIVE' where id='00000000-0000-4000-8000-00000000a001';
insert into public.auction_players(id,auction_id,player_id,round,status) values
('00000000-0000-4000-8000-00000000d003','00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-00000000c003',1,'CURRENT'),
('00000000-0000-4000-8000-00000000d004','00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-00000000c004',1,'PENDING'),
('00000000-0000-4000-8000-00000000d005','00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-00000000c005',1,'PENDING');

select set_config('test.uid','00000000-0000-4000-8000-000000000002',false);
select public.expect_error(
  $$select public.place_bid('00000000-0000-4000-8000-00000000d003',20000)$$,'reserved');
select set_config('test.uid','00000000-0000-4000-8000-000000000003',false);
select public.assert_test((public.place_bid('00000000-0000-4000-8000-00000000d003',20000)->>'team_id')::uuid =
 '00000000-0000-4000-8000-00000000b002'::uuid, 'Primary captain bid ownership');
select set_config('test.uid','00000000-0000-4000-8000-000000000004',false);
select public.assert_test((public.place_bid('00000000-0000-4000-8000-00000000d003',25000)->>'team_id')::uuid =
 '00000000-0000-4000-8000-00000000b002'::uuid, 'Partner shares team');
select public.assert_test(
  (select count(distinct captain_user_id)=2 and count(distinct team_id)=1 from public.bids
     where auction_player_id='00000000-0000-4000-8000-00000000d003'), 'One team / two bidders');

select set_config('test.uid','00000000-0000-4000-8000-000000000001',false);
select public.assert_test((public.sell_player('00000000-0000-4000-8000-00000000d003')->>'price')::bigint=25000,
  'Round 1 sale winner');
insert into public.auction_players(auction_id,player_id,status) values
 ('00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-00000000c008','CURRENT');
select public.expect_error(
  $insert into public.auction_players(auction_id,player_id,status) values
    ('00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-00000000c001','CURRENT')$,
  'duplicate key');
delete from public.auction_players where player_id='00000000-0000-4000-8000-00000000c008';
-- The sole-CURRENT guard is enforced by a partial unique index.
-- Check the second reserved player via a temporary CURRENT row; the old
-- assign-captain API must never be required.
insert into public.auction_players(id,auction_id,player_id,status)
values('00000000-0000-4000-8000-00000000d002','00000000-0000-4000-8000-00000000a001',
 '00000000-0000-4000-8000-00000000c002','CURRENT');
select set_config('test.uid','00000000-0000-4000-8000-000000000004',false);
select public.expect_error(
  $$select public.place_bid('00000000-0000-4000-8000-00000000d002',1000)$$, 'cannot be bid on');
select set_config('test.uid','00000000-0000-4000-8000-000000000001',false);
delete from public.auction_players where id='00000000-0000-4000-8000-00000000d002';

select public.expect_error(
  $$select public.start_round_two('00000000-0000-4000-8000-00000000a001')$$,
  'Complete all Round 1');
update public.auction_players set status='UNSOLD'
 where id in ('00000000-0000-4000-8000-00000000d004','00000000-0000-4000-8000-00000000d005');
update public.players set status='UNSOLD'
 where id in ('00000000-0000-4000-8000-00000000c004','00000000-0000-4000-8000-00000000c005');

select public.assert_test(
 (public.start_round_two('00000000-0000-4000-8000-00000000a001')->>'requeued')::int=2,
 'Requeued exactly two unsold players');
select public.assert_test(
 (select count(*)=2 from public.auction_players
   where auction_id='00000000-0000-4000-8000-00000000a001' and round=2 and status='PENDING'),
 'Fresh round-two queue');
select public.assert_test(
 (select count(*)=2 from public.auction_players
   where auction_id='00000000-0000-4000-8000-00000000a001' and round=1 and status='UNSOLD'),
 'Round 1 rows preserved');
select public.expect_error(
 $$select public.start_round_two('00000000-0000-4000-8000-00000000a001')$$,
 'already started');

select public.expect_error(
 $$select public.finalize_playing_captains('00000000-0000-4000-8000-00000000a001',
    '{"A+":10000,"A1":5000}'::jsonb)$$,
 'Complete all ordinary auction draws');

update public.auction_players set status='CURRENT'
 where auction_id='00000000-0000-4000-8000-00000000a001' and round=2
 and player_id='00000000-0000-4000-8000-00000000c004';
select set_config('test.uid','00000000-0000-4000-8000-000000000005',false);
select public.assert_test((public.place_bid(
  (select id from public.auction_players where player_id='00000000-0000-4000-8000-00000000c004' and round=2),
  40000)->>'team_id')::uuid='00000000-0000-4000-8000-00000000b004'::uuid,'Round 2 bid from another team');
select set_config('test.uid','00000000-0000-4000-8000-000000000001',false);
select public.assert_test((public.sell_player(
  (select id from public.auction_players where player_id='00000000-0000-4000-8000-00000000c004' and round=2)
)->>'price')::bigint=40000,'Round 2 price');
update public.auction_players set status='UNSOLD'
 where auction_id='00000000-0000-4000-8000-00000000a001' and round=2
 and player_id='00000000-0000-4000-8000-00000000c005';

select public.assert_test(
 (public.finalize_playing_captains('00000000-0000-4000-8000-00000000a001',
    '{"A+":10000,"A1":5000}'::jsonb)->>'count')::int=2,
 'Both playing captain slots finalize');
select public.assert_test(
 (select count(*)=2 from public.team_players where team_id='00000000-0000-4000-8000-00000000b001'
    and acquired_via='MANUAL_ALLOT'), 'Both captains on same roster');
select public.assert_test(
 (select price=32500 from public.team_players
    where player_id='00000000-0000-4000-8000-00000000c001'), 'Both rounds average A+ = 32500');
select public.assert_test(
 (select price=7000 from public.team_players
    where player_id='00000000-0000-4000-8000-00000000c002'), 'A1 configured base price fallback');
select public.assert_test(
 (select sum(delta)=-39500 from public.purse_ledger where team_id='00000000-0000-4000-8000-00000000b001'),
 'Final captain prices deducted from one team purse');
select public.assert_test(
 (select count(*)=2 from public.bids where auction_player_id='00000000-0000-4000-8000-00000000d003'),
 'Original bid history retained');
select public.expect_error(
 $$select public.finalize_playing_captains('00000000-0000-4000-8000-00000000a001',
    '{"A+":10000,"A1":5000}'::jsonb)$$, 'already finalized');

-- Separate auction checks full transaction rollback on insufficient funds.
insert into public.teams(id,auction_id,name,captain_user_id,captain_player_id,initial_purse)
values('00000000-0000-4000-8000-00000000b003','00000000-0000-4000-8000-00000000a002',
  'Poor team','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-00000000c006',1000);
update public.auctions set status='LIVE' where id='00000000-0000-4000-8000-00000000a002';
insert into public.auction_players(auction_id,player_id,round,status)
values('00000000-0000-4000-8000-00000000a002','00000000-0000-4000-8000-00000000c007',1,'SOLD');
select public.expect_error(
 $$select public.finalize_playing_captains('00000000-0000-4000-8000-00000000a002',
    '{"C1":500}'::jsonb)$$, 'needs');
select public.assert_test(
 (select captains_finalized_at is null from public.auctions where id='00000000-0000-4000-8000-00000000a002'),
 'Insufficient purse rolls back finalization flag');
select public.assert_test(
 (select count(*)=0 from public.team_players where auction_id='00000000-0000-4000-8000-00000000a002'),
 'Insufficient purse leaves no partial roster');
select public.assert_test(
 (select count(*)=0 from public.purse_ledger where auction_id='00000000-0000-4000-8000-00000000a002'),
 'Insufficient purse leaves no partial ledger');
select 'PASS: partnered bidding, grade reservations, Round 2, final pricing and rollback' as integration_result;
