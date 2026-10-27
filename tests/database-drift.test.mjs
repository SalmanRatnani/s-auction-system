import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase, asRole } from "./helpers/database.mjs";

test("forward repair also closes the observed legacy permission and trigger drift", async (t) => {
  const db = await createTestDatabase({
    skip: [
      "0024_harden_rls_and_current_player.sql",
      "0025_virtual_bids_atomic_draw.sql",
    ],
  });
  t.after(() => db.close());
  for (const sql of [
    "insert into public.players_public(id,name,player_code) values(gen_random_uuid(),'forged','forged')",
    "select * from public.viewer_links",
    "insert into public.audit_log(action) values('FORGED')",
    "select public.mark_unsold(gen_random_uuid())",
  ])
    await assert.rejects(
      () => asRole(db, "anon", null, () => db.query(sql)),
      /permission denied|row-level security/,
    );
  const grants = await db.query(
    "select has_column_privilege('authenticated','public.users','role','UPDATE') can_change_role",
  );
  assert.equal(grants.rows[0].can_change_role, false);
  const trigger = await db.query(
    "select count(*)::int n from pg_trigger t join pg_proc p on p.oid=t.tgfoid where p.proname='enforce_auction_bid_rules' and not t.tgisinternal",
  );
  assert.equal(trigger.rows[0].n, 1);
  const legacy = await db.query(
    "select count(*)::int n from pg_policies where schemaname='public' and policyname in ('users_self_update','vl_read','audit_insert','players_read_captains_viewers')",
  );
  assert.equal(legacy.rows[0].n, 0);
});
