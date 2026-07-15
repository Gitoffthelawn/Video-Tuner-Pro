// Provide a global `chrome` before any module that aliases it (platform/browser)
// is imported, so importing such modules in tests doesn't ReferenceError.
import { createMockChrome } from "./mocks/chrome.js";
import { act } from "react";

(globalThis as unknown as { chrome: typeof chrome }).chrome = createMockChrome();

// React 19 uses this flag to enable its act() test semantics. Without it the
// tests still pass, but every state update emits a warning and a real async UI
// regression can be hidden in that noise.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom has no canvas; return null so the graph code bails cleanly instead of
// logging a "Not implemented: getContext" warning on every popup test.
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
}

// jsdom deliberately leaves media playback unimplemented. Unit tests replace
// this with their own spies when they need rejection/fulfilment semantics; the
// default keeps incidental viewer startup from polluting the run with a
// non-actionable "Not implemented" error.
if (typeof HTMLMediaElement !== "undefined") {
  HTMLMediaElement.prototype.play = (() =>
    Promise.resolve()) as typeof HTMLMediaElement.prototype.play;
}

// jsdom has no ResizeObserver; Radix Slider (via react-use-size) needs it. A
// no-op stub is enough — the tests don't assert on measured sizes.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// jsdom lacks pointer capture; Radix Slider calls these when a drag is simulated.
if (typeof Element !== "undefined") {
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => {};
  if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {};
  // Return true so Radix's pointermove/up handlers (gated on capture) run in jsdom.
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => true;
}

// Popup integration specs intentionally use the browser-like `.click()` API
// directly. Make that native event boundary an act boundary so synchronous
// React handlers (including debounced-save state transitions) are observed by
// the test instead of leaking warnings into the runner output.
if (typeof HTMLElement !== "undefined" && !("__vtpActClick" in HTMLElement.prototype)) {
  const nativeClick = HTMLElement.prototype.click;
  const nativeDispatch = EventTarget.prototype.dispatchEvent;
  Object.defineProperty(HTMLElement.prototype, "__vtpActClick", { value: true });
  HTMLElement.prototype.click = function () {
    if (this instanceof HTMLAnchorElement) {
      // jsdom tries to navigate for programmatically clicked links (the
      // options export flow creates one). The test is asserting the handler,
      // not a second Document navigation, so cancel only the default action.
      act(() => {
        const event = new MouseEvent("click", { bubbles: true, cancelable: true });
        event.preventDefault();
        nativeDispatch.call(this, event);
      });
      return;
    }
    act(() => nativeClick.call(this));
  };
}

// The lower-level options/content specs also drive controls with
// `dispatchEvent` (keyboard, pointer and custom runtime events). Treat those
// synthetic browser events like Testing Library's fireEvent and flush their
// synchronous React work in the same act boundary.
if (typeof EventTarget !== "undefined" && !("__vtpActDispatch" in EventTarget.prototype)) {
  const nativeDispatch = EventTarget.prototype.dispatchEvent;
  Object.defineProperty(EventTarget.prototype, "__vtpActDispatch", { value: true });
  EventTarget.prototype.dispatchEvent = function (event: Event) {
    let result = false;
    act(() => {
      result = nativeDispatch.call(this, event);
    });
    return result;
  };
}

// jsdom has no matchMedia; report "reduced motion" so slider tweens settle
// synchronously and tests can read the final value right after an action.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((q: string) => ({
    matches: /prefers-reduced-motion/.test(q),
    media: q,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  })) as typeof window.matchMedia;
}
