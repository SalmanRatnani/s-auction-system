import test from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { loadTs } from "./helpers/load-ts.mjs";
import { domFixture } from "./helpers/dom.mjs";

const snapshot = (id) => ({
  auction: {
    id,
    name: "Test room",
    status: "LIVE",
    mode: "DRY_RUN",
    config: {},
    state_version: 1,
  },
  current: null,
  highestBid: null,
  lastSale: null,
  counts: {},
  teams: [],
});

test("auction failures stay stale, recover on success, clear revoked access and reset between rooms", async () => {
  const fixture = domFixture();
  const { useAuctionState } = loadTs("src/hooks/useAuctionState.ts");
  const saved = {
    fetch: globalThis.fetch,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
  };
  const intervals = new Map();
  let serial = 0;
  globalThis.setInterval = (callback) => {
    intervals.set(++serial, callback);
    return serial;
  };
  globalThis.clearInterval = (id) => intervals.delete(id);
  let response = () =>
    Promise.resolve(
      new Response(JSON.stringify({ code: "AUCTION_SETUP_REQUIRED" }), {
        status: 503,
      }),
    );
  globalThis.fetch = () => response();
  let latest;
  function Probe({ id }) {
    latest = useAuctionState(id, 15000, "fixture-viewer-link");
    return React.createElement(
      "div",
      null,
      latest.error ?? latest.state?.auction?.name ?? "Connecting",
    );
  }
  const root = createRoot(document.getElementById("root"));
  const tick = async () =>
    act(async () => intervals.forEach((callback) => callback()));
  const refreshWith = async (body, status = 200) => {
    response = () =>
      Promise.resolve(new Response(JSON.stringify(body), { status }));
    await act(async () => latest.refresh());
  };
  try {
    await act(async () =>
      root.render(React.createElement(Probe, { id: "one" })),
    );
    assert.equal(latest.loading, false);
    assert.equal(latest.stale, true);
    assert.match(latest.error, /organizer completes setup/);
    await refreshWith(snapshot("one"));
    assert.equal(latest.stale, false);
    assert.equal(latest.error, null);
    await refreshWith(
      { error: "private database internals must not reach the UI" },
      500,
    );
    assert.equal(
      latest.state.auction.id,
      "one",
      "retain the last snapshot during an outage",
    );
    await tick();
    assert.equal(
      latest.stale,
      true,
      "freshness timer must not re-enable controls after a failed request",
    );
    assert.equal(latest.error.includes("database internals"), false);
    await refreshWith(snapshot("one"));
    assert.equal(latest.stale, false);
    await refreshWith({}, 401);
    await tick();
    assert.equal(
      latest.state,
      null,
      "revocation removes previously authorized data",
    );
    assert.equal(latest.stale, true);
    assert.match(latest.error, /access has expired/);

    await refreshWith(snapshot("one"));
    let releaseOld;
    response = () =>
      new Promise((resolve) => {
        releaseOld = resolve;
      });
    let oldRequest;
    await act(async () => {
      oldRequest = latest.refresh();
    });
    let releaseNew;
    response = () =>
      new Promise((resolve) => {
        releaseNew = resolve;
      });
    await act(async () =>
      root.render(React.createElement(Probe, { id: "two" })),
    );
    await tick();
    assert.equal(latest.state, null);
    assert.equal(
      latest.stale,
      true,
      "new room must not inherit the last room's freshness",
    );
    await act(async () => {
      releaseOld(new Response(JSON.stringify(snapshot("one"))));
      await oldRequest;
    });
    assert.equal(
      latest.state,
      null,
      "late response from the old room is ignored",
    );
    await act(async () => {
      releaseNew(new Response(JSON.stringify(snapshot("two"))));
    });
    assert.equal(latest.state.auction.id, "two");
    assert.equal(latest.stale, false);
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, saved);
    fixture.cleanup();
  }
});
