import { JSDOM } from "jsdom";

export function domFixture() {
  const dom = new JSDOM(
    '<html><head></head><body><div id="root"></div><button id="outside">Outside</button></body></html>',
    {
      url: "https://fixture.test",
      pretendToBeVisual: true,
    },
  );
  const previous = new Map();
  const globals = {
    window: dom.window,
    self: dom.window,
    document: dom.window.document,
    Node: dom.window.Node,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    localStorage: dom.window.localStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  };
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  }
  const media = new Map();
  dom.window.matchMedia = (query) => {
    if (!media.has(query)) {
      const listeners = new Set();
      media.set(query, {
        matches: query.includes("pointer: fine"),
        addEventListener: (_, listener) => listeners.add(listener),
        removeEventListener: (_, listener) => listeners.delete(listener),
        change(matches) {
          this.matches = matches;
          listeners.forEach((listener) => listener({ matches }));
        },
      });
    }
    return media.get(query);
  };
  return {
    dom,
    media,
    cleanup() {
      dom.window.close();
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    },
  };
}
