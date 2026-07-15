// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  abortListener: null as (() => void) | null,
  signal: null as unknown as AbortSignal,
}));

vi.mock("../src/content/lifecycle.js", () => ({
  contentSignal: h.signal,
  listenerOptions: (options?: unknown) => options ?? {},
}));

const load = async () => {
  vi.resetModules();
  return import("../src/content/pointer.js");
};

beforeEach(() => {
  h.abortListener = null;
  h.signal = {
    addEventListener: (_type: string, listener: () => void) => {
      h.abortListener = listener;
    },
  } as unknown as AbortSignal;
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((cb: FrameRequestCallback) => {
      (globalThis as { __vtpPointerFrame?: FrameRequestCallback }).__vtpPointerFrame = cb;
      return 17;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  delete (globalThis as { __vtpPointerFrame?: FrameRequestCallback }).__vtpPointerFrame;
  vi.unstubAllGlobals();
});

describe("pointer move coalescing", () => {
  it("publishes only the last coordinates once per animation frame", async () => {
    const { subscribePointerMove } = await load();
    const first = vi.fn();
    const second = vi.fn();
    subscribePointerMove(first);
    subscribePointerMove(second);

    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 10, clientY: 20 }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 30, clientY: 40 }));
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();

    (globalThis as { __vtpPointerFrame?: FrameRequestCallback }).__vtpPointerFrame?.(0);
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledWith({ x: 30, y: 40 });
    expect(first).toHaveBeenCalledWith({ x: 30, y: 40 });
  });

  it("hooks the document once and cancels a pending frame on teardown", async () => {
    const add = vi.spyOn(document, "addEventListener");
    const { subscribePointerMove } = await load();
    subscribePointerMove(() => {});
    subscribePointerMove(() => {});
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 1, clientY: 2 }));
    h.abortListener?.();

    expect(add.mock.calls.filter(([type]) => type === "mousemove")).toHaveLength(1);
    expect(vi.mocked(cancelAnimationFrame)).toHaveBeenCalledWith(17);
    add.mockRestore();
  });
});
