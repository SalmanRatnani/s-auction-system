-- Isolated PG17 fixture: run after 0015-0017 and 0025, never in production.
insert into public.users (id,role,display_name) values
 ('10000000-0000-4000-8000-000000000001','MAIN_CONTROLLER','Controller'),
 ('10000000-0000-4000-8000-000000000002','CAPTAIN','Captain');
insert into public.auctions (id,status,config) values
 ('10000000-0000-4000-8000-00000000a001','LIVE',
  '{"basePrices":{"A1":10000},"increments":{"A1":2000},"maxSquad":2}');
insert into public.players (id,name,grade) values
 ('10000000-0000-4000-8000-00000000c001','Player 1','A1'),
 ('10000000-0000-4000-8000-00000000c002','Player 2','A1');
insert into public.teams (id,auction_id,name,captain_user_id,initial_purse)
values ('10000000-0000-4000-8000-00000000b001','10000000-0000-4000-8000-00000000a001',
 'Test Team','10000000-0000-4000-8000-000000000002',10000000000);
insert into public.auction_players (id,auction_id,player_id,round,status) values
 ('10000000-0000-4000-8000-00000000d001','10000000-0000-4000-8000-00000000a001',
  '10000000-0000-4000-8000-00000000c001',1,'CURRENT'),
 ('10000000-0000-4000-8000-00000000d002','10000000-0000-4000-8000-00000000a001',
  '10000000-0000-4000-8000-00000000c002',1,'PENDING');

create or replace function public.expect_failure(p_statement text,p_expected text)
returns void language plpgsql as $$
declare v_message text;
begin
  begin
    execute p_statement;
  exception when others then
    get stacked diagnostics v_message = MESSAGE_TEXT;
    if position(lower(p_expected) in lower(v_message)) > 0 then return; end if;
    raise exception 'Wrong error: % (expected %)',v_message,p_expected;
  end;
  raise exception 'Expected rejection, but succeeded: %',p_statement;
end $$;

select public.expect_failure(
 $$insert into public.bids(auction_id,auction_player_id,team_id,captain_user_id,amount)
 values('10000000-0000-4000-8000-00000000a001','10000000-0000-4000-8000-00000000d001',
 '10000000-0000-4000-8000-00000000b001','10000000-0000-4000-8000-000000000002',9999)$$,
 'Minimum allowed bid');
insert into public.bids(auction_id,auction_player_id,team_id,captain_user_id,amount)
values('10000000-0000-4000-8000-00000000a001','10000000-0000-4000-8000-00000000d001',
 '10000000-0000-4000-8000-00000000b001','10000000-0000-4000-8000-000000000002',10000);
select public.expect_failure(
 $$insert into public.bids(auction_id,auction_player_id,team_id,captain_user_id,amount)
 values('10000000-0000-4000-8000-00000000a001','10000000-0000-4000-8000-00000000d001',
 '10000000-0000-4000-8000-00000000b001','10000000-0000-4000-8000-000000000002',11000)$$,
 'Minimum allowed bid');
insert into public.bids(auction_id,auction_player_id,team_id,captain_user_id,amount)
values('10000000-0000-4000-8000-00000000a001','10000000-0000-4000-8000-00000000d001',
 '10000000-0000-4000-8000-00000000b001','10000000-0000-4000-8000-000000000002',12000);

select set_config('test.uid','10000000-0000-4000-8000-000000000001',false);
select public.expect_failure(
 $$select public.draw_next_auction_player('10000000-0000-4000-8000-00000000a001')$$,
 'Finish the current player');
update public.auction_players set status='SOLD'
 where id='10000000-0000-4000-8000-00000000d001';
select public.draw_next_auction_player('10000000-0000-4000-8000-00000000a001');
do $$ begin
 if (select count(*) from public.auction_players where status='CURRENT') <> 1
 then raise exception 'Expected exactly one drawn player'; end if;
end $$;
select public.expect_failure(
 $$select public.draw_next_auction_player('10000000-0000-4000-8000-00000000a001')$$,
 'Finish the current player');

update public.auctions set status='PAUSED'
 where id='10000000-0000-4000-8000-00000000a001';
select public.expect_failure(
 $$insert into public.bids(auction_id,auction_player_id,team_id,captain_user_id,amount)
 values('10000000-0000-4000-8000-00000000a001','10000000-0000-4000-8000-00000000d002',
 '10000000-0000-4000-8000-00000000b001','10000000-0000-4000-8000-000000000002',10000)$$,
 'Auction is not LIVE');
select 'PASS: virtual credits, configured increments, atomic draw and paused bids' as result;
