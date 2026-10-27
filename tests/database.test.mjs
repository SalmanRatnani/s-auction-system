import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID as uuid } from "node:crypto";
import { createTestDatabase, asRole } from "./helpers/database.mjs";

test("complete schema: permissions, six-team auction, receipts, and rollback", async (t) => {
  const db = await createTestDatabase();
  t.after(() => db.close());
  const people = {
    controller: uuid(),
    staff: uuid(),
    viewer: uuid(),
    captains: Array.from({ length: 6 }, uuid),
  };
  for (const [id, role] of [
    [people.controller, "MAIN_CONTROLLER"],
    [people.staff, "AUCTIONEER"],
    [people.viewer, "VIEWER"],
    ...people.captains.map((id) => [id, "CAPTAIN"]),
  ]) {
    await db.query("insert into auth.users(id,email) values($1,$2)", [
      id,
      `${id}@example.test`,
    ]);
    await db.query("update public.users set role=$2 where id=$1", [id, role]);
  }
  const auction = uuid(),
    teams = Array.from({ length: 6 }, uuid);
  await db.query(
    "insert into public.auctions(id,name,mode,config) values($1,'Isolated rehearsal','DRY_RUN',$2)",
    [auction, { maxSquad: 18 }],
  );
  for (let i = 0; i < 6; i++)
    await db.query(
      "insert into public.teams(id,auction_id,name,captain_user_id,initial_purse) values($1,$2,$3,$4,1000000000)",
      [teams[i], auction, `Team ${i + 1}`, people.captains[i]],
    );
  const playerIds = Array.from({ length: 8 }, uuid),
    grades = ["A+", "A+", "A+", "A1", "A1", "A1", "A2", "A2"];
  for (let i = 0; i < 8; i++)
    await db.query(
      "insert into public.players(id,player_code,name,grade) values($1,$2,$3,$4)",
      [playerIds[i], `QA-20261019-${i}`, `Fixture ${i}`, grades[i]],
    );
  await db.query(
    "update public.teams set captain_player_id=$2,co_captain_player_id=$3 where id=$1",
    [teams[0], playerIds[0], playerIds[3]],
  );
  const query = (sql, args = []) => db.query(sql, args);
  const acting = (who, fn) => asRole(db, "authenticated", who, fn);
  const version = async () =>
    (
      await query("select state_version from public.auctions where id=$1", [
        auction,
      ])
    ).rows[0].state_version;
  const snapshot = async () =>
    (await query("select public.auction_snapshot($1) s", [auction])).rows[0].s;
  async function command(
    name,
    extra = {},
    actionId = uuid(),
    actor = people.controller,
  ) {
    const s = await snapshot();
    const payload = {
      expectedVersion: s.auction.state_version,
      expectedPlayerId: s.current?.id ?? null,
      expectedBidId: s.highestBid?.id ?? null,
      ...extra,
    };
    const call = () =>
      acting(actor, () =>
        query("select public.auction_command($1,$2,$3,$4) r", [
          auction,
          name,
          actionId,
          payload,
        ]),
      );
    return { result: (await call()).rows[0].r, call, payload, actionId };
  }
  await t.test(
    "ordinary users and anonymous clients cannot bypass trusted operations",
    async () => {
      await assert.rejects(
        () =>
          acting(people.viewer, () =>
            query(
              "update public.users set role='MAIN_CONTROLLER' where id=$1",
              [people.viewer],
            ),
          ),
        /permission denied/,
      );
      for (const sql of [
        "insert into public.players_public(id,name,player_code) values(gen_random_uuid(),'forged','forged')",
        "update public.players_public set name='forged'",
        "delete from public.players_public",
        "select * from public.viewer_links",
        "insert into public.audit_log(action) values('FORGED')",
        "select public.mark_unsold(gen_random_uuid())",
        "insert into storage.objects(bucket_id,name) values('age-proofs','forged.pdf')",
      ]) {
        await assert.rejects(
          () => asRole(db, "anon", null, () => query(sql)),
          /permission denied|row-level security/,
        );
      }
      const privateRows = await acting(people.viewer, () =>
        query("select age_proof_url,dob from public.players"),
      );
      assert.equal(privateRows.rows.length, 0);
      await assert.rejects(
        () =>
          acting(people.viewer, () =>
            query("select public.sell_player(gen_random_uuid())"),
          ),
        /permission denied/,
      );
      assert.equal(
        (
          await query("select role from public.users where id=$1", [
            people.viewer,
          ])
        ).rows[0].role,
        "VIEWER",
      );
    },
  );
  await t.test(
    "start and draw bind to exact versions; below-base and small raises are rejected",
    async () => {
      const start = await command("start");
      assert.equal(start.result.seeded, 6);
      await command("next-player", { category: "A+" }, uuid(), people.staff);
      let s = await snapshot();
      await assert.rejects(
        () =>
          acting(people.captains[0], () =>
            query("select public.place_bid($1,30000000)", [s.current.id]),
          ),
        /reserved/,
      );
      await assert.rejects(
        () =>
          acting(people.captains[1], () =>
            query("select public.place_bid($1,1)", [s.current.id]),
          ),
        /Minimum allowed bid/,
      );
      await acting(people.captains[1], () =>
        query("select public.place_bid($1,30000000)", [s.current.id]),
      );
      await assert.rejects(
        () =>
          acting(people.captains[2], () =>
            query("select public.place_bid($1,30000001)", [s.current.id]),
          ),
        /Minimum allowed bid/,
      );
      await command("pause", {}, uuid(), people.staff);
      await assert.rejects(
        () =>
          acting(people.captains[2], () =>
            query("select public.place_bid($1,32500000)", [s.current.id]),
          ),
        /not LIVE/,
      );
      await command("resume", {}, uuid(), people.staff);
    },
  );
  await t.test(
    "demoted captains lose bidding rights even while membership remains",
    async () => {
      const s = await snapshot();
      await query("update public.users set role='VIEWER' where id=$1", [
        people.captains[2],
      ]);
      await assert.rejects(
        () =>
          acting(people.captains[2], () =>
            query("select public.place_bid($1,32500000)", [s.current.id]),
          ),
        /authorization/,
      );
      await assert.rejects(
        () =>
          acting(people.captains[2], () =>
            query("select public.update_team_config($1,$2)", [
              teams[2],
              { name: "Unexpected" },
            ]),
          ),
        /authorization/,
      );
      await query("update public.users set role='CAPTAIN' where id=$1", [
        people.captains[2],
      ]);
    },
  );
  await t.test(
    "sale is idempotent and an old screen cannot sell the next player",
    async () => {
      const before = await snapshot();
      const sold = await command("sell", {}, uuid(), people.staff);
      assert.deepEqual((await sold.call()).rows[0].r, sold.result);
      assert.equal(
        (
          await query(
            "select count(*)::int n from public.purse_ledger where auction_id=$1",
            [auction],
          )
        ).rows[0].n,
        1,
      );
      await command("next-player");
      await assert.rejects(
        () =>
          acting(people.staff, () =>
            query("select public.auction_command($1,$2,$3,$4)", [
              auction,
              "sell",
              uuid(),
              {
                expectedVersion: before.auction.state_version,
                expectedPlayerId: before.current.id,
                expectedBidId: before.highestBid.id,
              },
            ]),
          ),
        /Auction changed/,
      );
      const after = await snapshot();
      assert.ok(after.current);
      assert.equal(after.current.status, "CURRENT");
    },
  );
  await t.test(
    "same-category retry, undo, captain averages and final reconciliation work together",
    async () => {
      const before = await snapshot();
      await command("unsold");
      let s = await snapshot();
      assert.equal(s.current.player.id, before.current.player.id);
      assert.equal(s.current.round, 2);
      let didUndo = false;
      while (s.current || s.pending.length) {
        if (!s.current) {
          await command("next-player");
          s = await snapshot();
        }
        const grade = s.current.player.grade;
        const winner = teams.findIndex(
          (team, i) =>
            i > 0 &&
            !s.rosters.some((r) => r.team_id === team && r.grade === grade),
        );
        assert.ok(winner > 0);
        const base =
          grade === "A+" ? 30000000 : grade === "A1" ? 20000000 : 15000000;
        await acting(people.captains[winner], () =>
          query("select public.place_bid($1,$2)", [s.current.id, base]),
        );
        if (!didUndo) {
          await command("undo-bid");
          assert.equal((await snapshot()).highestBid, null);
          await acting(people.captains[winner], () =>
            query("select public.place_bid($1,$2)", [s.current.id, base]),
          );
          didUndo = true;
        }
        await command("sell");
        s = await snapshot();
      }
      const captains = s.rosters.filter((r) => r.team_id === teams[0]);
      assert.equal(captains.length, 2);
      assert.deepEqual(
        captains.map((r) => Number(r.price)).sort(),
        [20000000, 30000000],
      );
      await command("end");
      assert.equal((await snapshot()).auction.status, "ENDED");
      await assert.rejects(() => command("reset"), /Reset is available only/);
    },
  );
  await t.test(
    "two already-allotted captains do not consume two extra squad slots",
    async () => {
      const a = uuid(),
        team = uuid(),
        ap = uuid(),
        p = uuid();
      await query(
        "insert into public.auctions(id,name,status,mode,config) values($1,'Capacity','LIVE','DRY_RUN','{\"maxSquad\":18}')",
        [a],
      );
      await query(
        "insert into public.teams(id,auction_id,name,captain_user_id,initial_purse) values($1,$2,'Capacity', $3,1000000000)",
        [team, a, people.captains[0]],
      );
      const allGrades = [
        "A+",
        "A1",
        "A2",
        "A3",
        "B1",
        "B2",
        "B3",
        "B4",
        "B5",
        "C1",
        "C2",
        "C3",
        "C4",
        "K1",
        "K2",
        "W1",
      ];
      const roster = [];
      for (const grade of allGrades) {
        const id = uuid();
        roster.push(id);
        await query(
          "insert into public.players(id,name,player_code,grade,status) values($1::uuid,'Roster',$1::uuid::text,$2,'SOLD')",
          [id, grade],
        );
        await query(
          "insert into public.team_players(auction_id,team_id,player_id,price) values($1,$2,$3,1)",
          [a, team, id],
        );
      }
      await query(
        "update public.teams set captain_player_id=$2,co_captain_player_id=$3 where id=$1",
        [team, roster[0], roster[1]],
      );
      await query(
        "insert into public.players(id,name,player_code,grade) values($1::uuid,'Remaining',$1::uuid::text,'G1')",
        [p],
      );
      await query(
        "insert into public.auction_players(id,auction_id,player_id,status) values($1,$2,$3,'CURRENT')",
        [ap, a, p],
      );
      await acting(people.captains[0], () =>
        query("select public.place_bid($1,1000000)", [ap]),
      );
      await query(
        "update public.auctions set config='{\"maxSquad\":16}' where id=$1",
        [a],
      );
      await assert.rejects(
        () =>
          acting(people.captains[0], () =>
            query("select public.place_bid($1,1100000)", [ap]),
          ),
        /Squad is full/,
      );
    },
  );
  await t.test(
    "top-up receipts cannot double-credit and reset failures roll back all deletes",
    async () => {
      // Keep the completed event untouched; use a separate rehearsal.
      const a = uuid(),
        team = uuid(),
        action = uuid();
      await query(
        "insert into public.auctions(id,name,status) values($1,'Rollback','PAUSED')",
        [a],
      );
      await query(
        "insert into public.teams(id,auction_id,name,initial_purse) values($1,$2,'Rollback',1000)",
        [team, a],
      );
      const payload = { teamId: team, amount: 12345 };
      const topup = () =>
        acting(people.controller, () =>
          query("select public.auction_command($1,'topup',$2,$3)", [
            a,
            action,
            payload,
          ]),
        );
      await topup();
      await topup();
      assert.equal(
        (
          await query(
            "select sum(delta)::int n from public.purse_ledger where auction_id=$1",
            [a],
          )
        ).rows[0].n,
        12345,
      );
      await assert.rejects(
        () =>
          acting(people.controller, () =>
            query("select public.auction_command($1,'topup',$2,$3)", [
              a,
              action,
              { ...payload, amount: 50 },
            ]),
          ),
        /different input/,
      );
      await db.exec(
        "create function public.fail_reset_audit() returns trigger language plpgsql as $$ begin if new.action='AUCTION_RESET' then raise exception 'Injected audit failure'; end if;return new;end $$; create trigger fail_reset before insert on public.audit_log for each row execute function public.fail_reset_audit();",
      );
      const v = (
        await query("select state_version from public.auctions where id=$1", [
          a,
        ])
      ).rows[0].state_version;
      await assert.rejects(
        () =>
          acting(people.controller, () =>
            query("select public.auction_command($1,'reset',$2,$3)", [
              a,
              uuid(),
              { expectedVersion: v },
            ]),
          ),
        /Injected audit failure/,
      );
      assert.equal(
        (
          await query(
            "select count(*)::int n from public.purse_ledger where auction_id=$1",
            [a],
          )
        ).rows[0].n,
        1,
      );
      assert.equal(
        (
          await query("select state_version from public.auctions where id=$1", [
            a,
          ])
        ).rows[0].state_version,
        v,
      );
      await db.exec(
        "drop trigger fail_reset on public.audit_log;drop function public.fail_reset_audit();",
      );
    },
  );
  await t.test(
    "captain settlement shortfalls roll back the sale and recover after an explicit top-up",
    async () => {
      const a = uuid(),
        ap = uuid(),
        player = uuid(),
        captain = uuid(),
        reservedTeam = uuid(),
        winner = uuid();
      await query(
        "insert into public.auctions(id,name,status,mode,config) values($1,'Settlement recovery','LIVE','DRY_RUN','{}')",
        [a],
      );
      for (const [id, name] of [
        [player, "Auction player"],
        [captain, "Playing captain"],
      ])
        await query(
          "insert into public.players(id,player_code,name,grade) values($1::uuid,$1::uuid::text,$2,'A+')",
          [id, name],
        );
      await query(
        "insert into public.teams(id,auction_id,name,captain_user_id,captain_player_id,initial_purse) values($1,$2,'Reserved captain',$3,$4,30000000)",
        [reservedTeam, a, people.captains[0], captain],
      );
      await query(
        "insert into public.teams(id,auction_id,name,captain_user_id,initial_purse) values($1,$2,'Winning team',$3,1000000000)",
        [winner, a, people.captains[1]],
      );
      await query(
        "insert into public.auction_players(id,auction_id,player_id,status) values($1,$2,$3,'CURRENT')",
        [ap, a, player],
      );
      await acting(people.captains[1], () =>
        query("select public.place_bid($1,60000000)", [ap]),
      );
      const snap = async () =>
        (await query("select public.auction_snapshot($1) s", [a])).rows[0].s;
      const sell = async () => {
        const s = await snap();
        return acting(people.staff, () =>
          query("select public.auction_command($1,'sell',$2,$3)", [
            a,
            uuid(),
            {
              expectedVersion: s.auction.state_version,
              expectedPlayerId: ap,
              expectedBidId: s.highestBid.id,
            },
          ]),
        );
      };
      await assert.rejects(sell, /needs 60000000 paise.*has only 30000000/i);
      assert.equal((await snap()).current.id, ap);
      assert.equal(
        (
          await query(
            "select count(*)::int n from public.team_players where auction_id=$1",
            [a],
          )
        ).rows[0].n,
        0,
      );
      assert.equal(
        (
          await query(
            "select count(*)::int n from public.purse_ledger where auction_id=$1",
            [a],
          )
        ).rows[0].n,
        0,
      );
      await acting(people.controller, () =>
        query("select public.auction_command($1,'topup',$2,$3)", [
          a,
          uuid(),
          { teamId: reservedTeam, amount: 30000000 },
        ]),
      );
      await sell();
      const result = await snap();
      assert.equal(result.rosters.length, 2);
      assert.equal(result.current, null);
      assert.equal(
        Number(
          result.purses.find((p) => p.team_id === reservedTeam).remaining_purse,
        ),
        0,
      );
    },
  );
  await t.test(
    "role changes, draft-team limits and viewer-link revocation are authoritative",
    async () => {
      const a = uuid();
      await query(
        "insert into public.auctions(id,name,mode,config) values($1,'Administration','DRY_RUN','{}')",
        [a],
      );
      await assert.rejects(
        () =>
          acting(people.viewer, () =>
            query("select public.set_user_role($1,'MAIN_CONTROLLER')", [
              people.viewer,
            ]),
          ),
        /authorization/,
      );
      await acting(people.controller, () =>
        query("select public.set_user_role($1,'CAPTAIN')", [people.viewer]),
      );
      assert.equal(
        (
          await query("select role from public.users where id=$1", [
            people.viewer,
          ])
        ).rows[0].role,
        "CAPTAIN",
      );
      await assert.rejects(
        () =>
          acting(people.controller, () =>
            query("select public.set_user_role($1,'VIEWER')", [
              people.controller,
            ]),
          ),
        /own role/,
      );
      for (let i = 0; i < 6; i++)
        await acting(people.controller, () =>
          query("select public.manage_draft_team($1)", [a]),
        );
      await assert.rejects(
        () =>
          acting(people.controller, () =>
            query("select public.manage_draft_team($1)", [a]),
          ),
        /Maximum six/,
      );
      const link = (
        await acting(people.controller, () =>
          query("select public.manage_viewer_link($1) result", [a]),
        )
      ).rows[0].result;
      assert.equal(
        (
          await acting(people.viewer, () =>
            query("select * from public.viewer_links"),
          )
        ).rows.length,
        0,
      );
      await acting(people.controller, () =>
        query("select public.manage_viewer_link($1,12,$2)", [a, link.id]),
      );
      assert.equal(
        (
          await query(
            "select expires_at<=now() expired from public.viewer_links where id=$1",
            [link.id],
          )
        ).rows[0].expired,
        true,
      );
      await query("update public.auctions set status='LIVE' where id=$1", [a]);
      await assert.rejects(
        () =>
          acting(people.controller, () =>
            query("select public.manage_draft_team($1)", [a]),
          ),
        /only before/,
      );
      await assert.rejects(
        () =>
          acting(people.viewer, () =>
            query(
              "insert into storage.objects(bucket_id,name) values('age-proofs','forged.pdf')",
            ),
          ),
        /row-level security/,
      );
    },
  );
  await t.test(
    "parallel bids, sale versus undo, and duplicate credits serialize without deadlocks",
    async (t) => {
      if (!db.connectPeer) {
        t.skip(
          "Native PostgreSQL CI covers independent concurrent connections",
        );
        return;
      }
      const peers = await Promise.all([db.connectPeer(), db.connectPeer()]);
      t.after(() => Promise.all(peers.map((p) => p.close())));
      for (const p of peers)
        await p.exec("set statement_timeout='5s';set lock_timeout='4s';");
      const a = uuid(),
        ap = uuid(),
        player = uuid(),
        pair = [uuid(), uuid()];
      await query(
        "insert into public.auctions(id,name,status,mode,config) values($1,'Concurrent rehearsal','LIVE','DRY_RUN','{}')",
        [a],
      );
      for (let i = 0; i < 2; i++)
        await query(
          "insert into public.teams(id,auction_id,name,captain_user_id,initial_purse) values($1,$2,$3,$4,1000000000)",
          [pair[i], a, `Concurrent ${i}`, people.captains[i + 1]],
        );
      await query(
        "insert into public.players(id,name,player_code,grade) values($1::uuid,'Concurrent player',$1::uuid::text,'A+')",
        [player],
      );
      await query(
        "insert into public.auction_players(id,auction_id,player_id,status) values($1,$2,$3,'CURRENT')",
        [ap, a, player],
      );
      const bids = await Promise.allSettled(
        peers.map((p, i) =>
          asRole(p, "authenticated", people.captains[i + 1], () =>
            p.query("select public.place_bid($1,30000000)", [ap]),
          ),
        ),
      );
      assert.equal(bids.filter((r) => r.status === "fulfilled").length, 1);
      assert.match(
        bids.find((r) => r.status === "rejected").reason.message,
        /Minimum allowed bid|greater than|must exceed/,
      );
      const snap = (await query("select public.auction_snapshot($1) s", [a]))
        .rows[0].s;
      const payload = {
        expectedVersion: snap.auction.state_version,
        expectedPlayerId: ap,
        expectedBidId: snap.highestBid.id,
      };
      const raced = await Promise.allSettled(
        ["sell", "undo-bid"].map((command, i) =>
          asRole(peers[i], "authenticated", people.staff, () =>
            peers[i].query("select public.auction_command($1,$2,$3,$4)", [
              a,
              command,
              uuid(),
              payload,
            ]),
          ),
        ),
      );
      assert.equal(raced.filter((r) => r.status === "fulfilled").length, 1);
      assert.match(
        raced.find((r) => r.status === "rejected").reason.message,
        /Auction changed/,
      );
      const after = (await query("select public.auction_snapshot($1) s", [a]))
        .rows[0].s;
      const sold = after.rosters.length;
      assert.equal(
        (
          await query(
            "select count(*)::int n from public.purse_ledger where auction_id=$1 and reason='BID_WON'",
            [a],
          )
        ).rows[0].n,
        sold,
      );
      assert.ok(
        sold === 1 ? after.current === null : after.highestBid === null,
      );
      const action = uuid(),
        topup = { teamId: pair[0], amount: 12345 };
      const credits = await Promise.all(
        peers.map((p) =>
          asRole(p, "authenticated", people.controller, () =>
            p.query("select public.auction_command($1,'topup',$2,$3) result", [
              a,
              action,
              topup,
            ]),
          ),
        ),
      );
      assert.deepEqual(credits[0].rows, credits[1].rows);
      assert.equal(
        (
          await query(
            "select count(*)::int n from public.purse_ledger where auction_id=$1 and reason='TOPUP'",
            [a],
          )
        ).rows[0].n,
        1,
      );
    },
  );
});
