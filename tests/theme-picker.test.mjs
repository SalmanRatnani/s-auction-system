import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { loadTs } from "./helpers/load-ts.mjs";

test("theme selection survives mobile blur, persists, closes outside and restores keyboard focus", async () => {
  const dom = new JSDOM(
    '<html><head><meta name="theme-color"></head><body><div id="root"></div><button id="outside">Outside</button></body></html>',
    { url: "https://fixture.test" },
  );
  const previous = new Map();
  for (const key of [
    "window",
    "document",
    "Node",
    "localStorage",
    "IS_REACT_ACT_ENVIRONMENT",
  ]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value: key === "IS_REACT_ACT_ENVIRONMENT" ? true : dom.window[key],
    });
  }
  dom.window.matchMedia = (query) => ({
    matches: query.includes("reduced-motion"),
    addEventListener() {},
    removeEventListener() {},
  });
  const { ThemeProvider } = loadTs("src/components/theme/ThemeProvider.tsx");
  const { ThemePicker } = loadTs("src/components/theme/ThemePicker.tsx");
  const { THEME_KEY } = loadTs("src/components/theme/theme.ts");
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () =>
      root.render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(ThemePicker),
        ),
      ),
    );
    const trigger = document.querySelector(".theme-toggle");
    await act(async () => trigger.click());
    assert.equal(trigger.getAttribute("aria-expanded"), "true");
    // Mobile WebKit can blur with no relatedTarget before delivering the option click.
    await act(async () =>
      trigger.dispatchEvent(
        new dom.window.FocusEvent("focusout", {
          bubbles: true,
          relatedTarget: null,
        }),
      ),
    );
    assert.equal(document.querySelector(".theme-menu").hidden, false);
    const dark = [...document.querySelectorAll(".theme-option")].find((b) =>
      b.textContent.includes("Dark"),
    );
    await act(async () => dark.click());
    assert.equal(document.documentElement.dataset.theme, "dark");
    assert.equal(localStorage.getItem(THEME_KEY), "dark");
    assert.equal(document.querySelector(".theme-menu").hidden, true);
    assert.equal(document.activeElement, trigger);
    await act(async () => trigger.click());
    await act(async () =>
      trigger.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
        }),
      ),
    );
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    await act(async () => trigger.click());
    await act(async () =>
      document
        .getElementById("outside")
        .dispatchEvent(new dom.window.Event("pointerdown", { bubbles: true })),
    );
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    await act(async () => trigger.click());
    const light = [...document.querySelectorAll(".theme-option")].find((b) =>
      b.textContent.includes("Light"),
    );
    await act(async () => light.click());
    assert.equal(document.documentElement.dataset.theme, "light");
    assert.equal(localStorage.getItem(THEME_KEY), "light");
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
