import test from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { loadTs } from "./helpers/load-ts.mjs";
import { domFixture } from "./helpers/dom.mjs";

test("mobile navigation survives null-target blur and closes on selection, focus outside and Escape", async () => {
  const fixture = domFixture();
  const { MarketingHeader } = loadTs(
    "src/components/landing/MarketingHeader.tsx",
  );
  const { ThemeProvider } = loadTs("src/components/theme/ThemeProvider.tsx");
  const root = createRoot(document.getElementById("root"));
  try {
    await act(async () =>
      root.render(
        React.createElement(
          ThemeProvider,
          null,
          React.createElement(MarketingHeader),
        ),
      ),
    );
    const trigger = document.querySelector(".marketing-menu-toggle");
    const menu = document.getElementById("marketing-mobile-nav");
    await act(async () => trigger.click());
    await act(async () =>
      trigger.dispatchEvent(
        new window.FocusEvent("focusout", {
          bubbles: true,
          relatedTarget: null,
        }),
      ),
    );
    assert.equal(menu.hidden, false);
    const link = menu.querySelector("a");
    link.addEventListener("click", (event) => event.preventDefault());
    await act(async () => link.click());
    assert.equal(menu.hidden, true);
    await act(async () => trigger.click());
    await act(async () => document.getElementById("outside").focus());
    assert.equal(menu.hidden, true);
    await act(async () => trigger.click());
    await act(async () =>
      trigger.dispatchEvent(
        new window.KeyboardEvent("keydown", { bubbles: true, key: "Escape" }),
      ),
    );
    assert.equal(menu.hidden, true);
    assert.equal(document.activeElement, trigger);
    await act(async () => trigger.click());
    await act(async () =>
      document
        .querySelector(".theme-toggle")
        .dispatchEvent(new window.Event("pointerdown", { bubbles: true })),
    );
    assert.equal(
      menu.hidden,
      true,
      "navigation does not cover the theme picker",
    );
  } finally {
    await act(async () => root.unmount());
    fixture.cleanup();
  }
});

test("depth motion batches pointer frames, stops for focus/reduced motion and ignores touch", () => {
  const fixture = domFixture();
  const { attachDepthMotion } = loadTs(
    "src/components/motion/DepthSurface.tsx",
  );
  const saved = [
    globalThis.requestAnimationFrame,
    globalThis.cancelAnimationFrame,
  ];
  const frames = new Map();
  let sequence = 0;
  globalThis.requestAnimationFrame = (fn) => {
    frames.set(++sequence, fn);
    return sequence;
  };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  const host = document.createElement("div");
  const card = document.createElement("div");
  const control = document.createElement("button");
  card.append(control);
  host.append(card);
  document.body.append(host);
  host.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 200,
    height: 100,
  });
  const move = (type = "mouse") => {
    const event = new window.MouseEvent("pointermove", {
      clientX: 190,
      clientY: 10,
    });
    Object.defineProperty(event, "pointerType", { value: type });
    host.dispatchEvent(event);
  };
  const dispose = attachDepthMotion(host, card);
  try {
    move();
    move();
    move();
    assert.equal(frames.size, 1);
    const frame = [...frames.values()][0];
    frames.clear();
    frame();
    assert.equal(card.style.getPropertyValue("--depth-y"), "2.70deg");
    control.focus();
    assert.equal(card.style.getPropertyValue("--depth-y"), "");
    move();
    assert.equal(frames.size, 0);
    control.blur();
    window.matchMedia("(prefers-reduced-motion: reduce)").change(true);
    move();
    assert.equal(frames.size, 0);
    window.matchMedia("(prefers-reduced-motion: reduce)").change(false);
    move("touch");
    assert.equal(frames.size, 0);
    move();
    assert.equal(frames.size, 1);
    dispose();
    assert.equal(frames.size, 0);
    move();
    assert.equal(frames.size, 0);
  } finally {
    dispose();
    [globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame] = saved;
    fixture.cleanup();
  }
});

test("activity rows retain their nodes, move from their interrupted position, and stop for reduced motion", async () => {
  const fixture = domFixture();
  const { MotionList } = loadTs("src/components/motion/MotionList.tsx");
  const calls = [];
  Object.defineProperty(window.HTMLElement.prototype, "offsetTop", {
    configurable: true,
    get() {
      return Number(this.dataset.top ?? 0);
    },
  });
  window.HTMLElement.prototype.animate = function (frames) {
    const animation = {
      effect: { getComputedTiming: () => ({ progress: 0.5 }) },
      cancelled: false,
      cancel() {
        this.cancelled = true;
      },
    };
    calls.push({ id: this.dataset.motionId, frames, animation });
    return animation;
  };
  const root = createRoot(document.getElementById("root"));
  const render = async (ids) =>
    act(async () =>
      root.render(
        React.createElement(
          MotionList,
          { revision: ids.join(":") },
          ids.map((id, i) =>
            React.createElement(
              "li",
              { key: id, "data-motion-id": id, "data-top": i * 80 },
              id,
            ),
          ),
        ),
      ),
    );
  try {
    await render(["one"]);
    const first = document.querySelector("li");
    await render(["two", "one"]);
    assert.equal(document.querySelector('[data-motion-id="one"]'), first);
    // The first arrival was halfway from -12px; the next move starts from -86px.
    assert.equal(calls.at(-1).frames[0].transform, "translateY(-86px)");
    await render(["three", "two", "one"]);
    assert.equal(calls.at(-1).frames[0].transform, "translateY(-123px)");
    window.matchMedia("(prefers-reduced-motion: reduce)").change(true);
    assert.ok(calls.every((call) => call.animation.cancelled));
    const count = calls.length;
    await render(["four", "three", "two", "one"]);
    assert.equal(calls.length, count);
    assert.equal(document.querySelectorAll("li").length, 4);
  } finally {
    await act(async () => root.unmount());
    fixture.cleanup();
  }
});
