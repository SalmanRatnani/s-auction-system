import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const { allRows } = loadTs("src/lib/pagination.ts");
const { validateAuctionConfig } = loadTs("src/lib/security/auction-config.ts");
const { projectAuctionSnapshot } = loadTs("src/lib/auction-snapshot.ts");
const { sendAction } = loadTs("src/lib/action-request.ts");

test("exports exhaust an API cap smaller than the requested page and fail on partial errors", async () => {
  const source = Array.from({ length: 1203 }, (_, id) => ({ id }));
  const rows = await allRows(async (from, to) => ({
    data: source.slice(from, Math.min(to + 1, from + 137)),
    error: null,
  }));
  assert.deepEqual(rows, source);
  await assert.rejects(
    () =>
      allRows(async (from) =>
        from === 0
          ? { data: source.slice(0, 137), error: null }
          : { data: null, error: { message: "lost connection" } },
      ),
    /could not be loaded/,
  );
});
test("configuration rejects unsupported automation, malformed amounts and unknown settings", () => {
  assert.equal(
    validateAuctionConfig({
      maxSquad: 18,
      basePrices: { "A+": 30000000 },
      showPurseToViewers: false,
    }),
    null,
  );
  for (const config of [
    { maxSquad: 0 },
    { basePrices: { "A+": 1.5 } },
    { increments: { "A+": -1 } },
    { showPoolCounts: "false" },
    { timer: { enabled: true, autoSellOnExpiry: true, seconds: 30 } },
    { unknown: true },
  ])
    assert.ok(validateAuctionConfig(config));
});
test("audience snapshots enforce purse visibility and exclude allotted captain slots", () => {
  const raw = {
    auction: {
      id: "event",
      config: {
        showPurseToCaptains: false,
        showPurseToViewers: false,
        showPoolCounts: false,
      },
      state_version: 3,
    },
    current: null,
    highestBid: null,
    lastSale: null,
    teams: [
      {
        id: "team",
        name: "One",
        captain_user_id: "captain",
        captain_player_id: "player",
        initial_purse: 1000,
      },
    ],
    purses: [
      { team_id: "team", remaining_purse: 800, spent: 200, squad_count: 1 },
    ],
    rosters: [
      {
        team_id: "team",
        player_id: "player",
        grade: "A+",
        price: 200,
        acquired_via: "MANUAL_ALLOT",
      },
    ],
    captains: [{ id: "player", grade: "A+" }],
    pending: [{ player_id: "other", grade: "A1" }],
  };
  const viewer = projectAuctionSnapshot(raw, "VIEWER", null);
  assert.equal(viewer.teams[0].remaining_purse, 0);
  assert.equal(viewer.teams[0].purse_visible, false);
  assert.equal(viewer.teams[0].captain_user_id, null);
  assert.deepEqual(viewer.counts, {});
  const own = projectAuctionSnapshot(raw, "CAPTAIN", "captain");
  assert.equal(own.teams[0].remaining_purse, 800);
  assert.equal(own.teams[0].reserved_slots, 0);
  assert.equal(
    projectAuctionSnapshot(raw, "CAPTAIN", "other").teams[0].purse_visible,
    false,
  );
  assert.equal(
    projectAuctionSnapshot(raw, "AUCTIONEER", "staff").teams[0].remaining_purse,
    800,
  );
  raw.auction.config.showPurseToViewers = true;
  assert.equal(
    projectAuctionSnapshot(raw, "VIEWER", null).teams[0].remaining_purse,
    800,
  );
  raw.purses = [];
  assert.throws(
    () => projectAuctionSnapshot(raw, "VIEWER", null),
    /Incomplete/,
  );
});
test("lost action responses reuse the exact request ID and input", async (t) => {
  const original = globalThis.fetch;
  t.after(() => (globalThis.fetch = original));
  const requests = [];
  let fail = true;
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    if (fail) {
      fail = false;
      throw new Error("response lost");
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const pending = { current: null };
  await assert.rejects(
    () => sendAction("/sell", { expectedVersion: 1 }, pending),
    /response lost/,
  );
  await assert.rejects(() => sendAction("/reset", {}, pending), /Retry/);
  await sendAction("/sell", { expectedVersion: 2 }, pending);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(pending.current, null);
});
