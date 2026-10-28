import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { loadTs } from "./helpers/load-ts.mjs";
import { domFixture } from "./helpers/dom.mjs";

const require = createRequire(import.meta.url);
const {
  AppRouterContext,
} = require("next/dist/shared/lib/app-router-context.shared-runtime");

test("mode switches recover from a lost connection and cannot bypass a pending auction action", async () => {
  const fixture = domFixture();
  const { AuctionControls } = loadTs(
    "src/app/(app)/admin/auction/AuctionControls.tsx",
  );
  const savedFetch = globalThis.fetch;
  const calls = [];
  let resolveRequest;
  let rejectRequest;
  globalThis.fetch = (url, options) => {
    calls.push({ url, options });
    return new Promise((resolve, reject) => {
      resolveRequest = resolve;
      rejectRequest = reject;
    });
  };
  let refreshes = 0;
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () =>
      root.render(
        React.createElement(
          AppRouterContext.Provider,
          { value: { refresh: () => refreshes++ } },
          React.createElement(AuctionControls, {
            auction: {
              id: "fixture-auction",
              status: "DRAFT",
              mode: "LIVE",
              state_version: 0,
            },
          }),
        ),
      ),
    );
    const button = (text) =>
      [...document.querySelectorAll("button")].find((node) =>
        node.textContent.includes(text),
      );
    const mode = button("Switch to DRY RUN");
    await act(async () => {
      mode.click();
      mode.click();
    });
    assert.equal(
      calls.length,
      1,
      "rapid taps cannot launch parallel mode updates",
    );
    assert.equal(mode.disabled, true);
    assert.ok(calls[0].options.signal);
    await act(async () => rejectRequest(new Error("lost connection")));
    assert.equal(
      mode.disabled,
      false,
      "network failure must release the busy state",
    );
    assert.match(
      document.body.textContent,
      /mode change could not be confirmed/,
    );
    assert.equal(refreshes, 1);
    await act(async () => mode.click());
    await act(async () => resolveRequest(new Response("{}", { status: 200 })));
    assert.equal(mode.disabled, false);
    assert.match(document.body.textContent, /Mode set to DRY_RUN/);
    await act(async () => button("Start auction").click());
    await act(async () =>
      rejectRequest(new Error("response lost after commit")),
    );
    assert.ok(
      button("Confirm previous action"),
      "pending receipt is rendered from React state",
    );
    const count = calls.length;
    await act(async () => mode.click());
    assert.equal(calls.length, count);
    assert.match(
      document.body.textContent,
      /Confirm the previous action before changing mode/,
    );
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = savedFetch;
    fixture.cleanup();
  }
});
