import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/components/demo/demo-state.ts", import.meta.url),
  "utf8",
);
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const {
  createDemoState,
  demoReducer,
  nextDemoBid,
  DEMO_BASE_PRICE,
  DEMO_INCREMENT,
  DEMO_PURSE,
} = await import(
  `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
);
const action = (type, id = type) => ({
  type,
  id,
  at: "2026-10-27T12:00:00.000Z",
});

test("the demo opens at base price, then increments without changing earlier snapshots", () => {
  const empty = createDemoState();
  const first = demoReducer(empty, action("bid", "bid-1"));
  const second = demoReducer(first, action("bid", "bid-2"));
  assert.equal(first.bids[0].amount, DEMO_BASE_PRICE);
  assert.equal(second.bids[0].amount, DEMO_BASE_PRICE + DEMO_INCREMENT);
  assert.notEqual(first.bids[0].team_id, second.bids[0].team_id);
  assert.equal(empty.bids.length, 0);
  assert.equal(first.bids.length, 1);
});

test("paused and sold rooms reject queued bids and invalid sales", () => {
  const empty = createDemoState();
  assert.equal(demoReducer(empty, action("sell")), empty);
  const bidding = demoReducer(empty, action("bid"));
  const paused = demoReducer(bidding, action("pause"));
  assert.equal(nextDemoBid(paused), null);
  assert.equal(demoReducer(paused, action("bid")), paused);
  assert.equal(demoReducer(paused, action("sell")), paused);
  const resumed = demoReducer(paused, action("resume"));
  const sold = demoReducer(resumed, action("sell"));
  assert.equal(sold.status, "sold");
  for (const type of ["bid", "sell", "pause", "resume"])
    assert.equal(demoReducer(sold, action(type)), sold);
  assert.equal(sold.events[0].amount, bidding.bids[0].amount);
  assert.equal(sold.events[0].teamId, bidding.bids[0].team_id);
});

test("rapid repeated demo bids cannot exceed the purse or grow the activity feed indefinitely", () => {
  let state = createDemoState();
  for (let i = 0; i < 1000; i++)
    state = demoReducer(state, action("bid", `bid-${i}`));
  assert.equal(state.bids[0].amount, DEMO_PURSE);
  assert.equal(nextDemoBid(state), null);
  assert.equal(
    state.bids.length,
    (DEMO_PURSE - DEMO_BASE_PRICE) / DEMO_INCREMENT + 1,
  );
  assert.equal(state.events.length, 8);
  assert.equal(state.events[0].id, state.bids[0].id);
  const sold = demoReducer(state, action("sell"));
  assert.equal(DEMO_PURSE - sold.events[0].amount, 0);
});

test("reset clears sale, history and bids and restores the opening amount", () => {
  let state = demoReducer(createDemoState(), action("bid"));
  state = demoReducer(state, action("sell"));
  const reset = demoReducer(state, { type: "reset" });
  assert.deepEqual(reset, createDemoState());
  assert.equal(nextDemoBid(reset), DEMO_BASE_PRICE);
  assert.equal(state.status, "sold");
});
