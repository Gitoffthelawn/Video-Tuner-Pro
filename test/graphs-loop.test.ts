// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

function canvas(id: string): HTMLCanvasElement {
  const el = document.createElement("canvas");
  el.id = id;
  el.getContext = vi.fn(() => ({})) as unknown as HTMLCanvasElement["getContext"];
  document.body.appendChild(el);
  return el;
}

describe("setupGraphs", () => {
  it("does not start polling when the required canvases are not mounted yet", async () => {
    const startPoll = vi.fn(() => () => {});
    vi.doMock("../src/popup/graphs/poll.js", () => ({ startPoll }));
    const { setupGraphs } = await import("../src/popup/graphs/index.js");

    const stop = setupGraphs(
      () => 1,
      () => {},
      () => {},
    );
    stop();

    expect(startPoll).not.toHaveBeenCalled();
  });

  it("backs off drawing while every graph is idle", async () => {
    vi.useFakeTimers();
    const drawAudio = vi.fn();
    const drawBuffer = vi.fn();
    const drawAutoSlow = vi.fn();
    vi.doMock("../src/popup/graphs/audio-meter.js", () => ({ drawAudio }));
    vi.doMock("../src/popup/graphs/latency-graph.js", () => ({ drawBuffer }));
    vi.doMock("../src/popup/graphs/autoslow-graph.js", () => ({ drawAutoSlow }));
    vi.doMock("../src/popup/graphs/poll.js", () => ({ startPoll: () => () => {} }));
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((cb: FrameRequestCallback) => Number(setTimeout(() => cb(Date.now()), 16))),
    );
    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn((id: number) => clearTimeout(id)),
    );
    canvas("audioMeter");
    canvas("bufferMeter");
    canvas("autoSlowMeter");
    const { setupGraphs } = await import("../src/popup/graphs/index.js");

    const stop = setupGraphs(
      () => 1,
      () => {},
      () => {},
    );
    await vi.advanceTimersByTimeAsync(1000);
    stop();

    expect(drawAudio.mock.calls.length).toBeLessThanOrEqual(5);
    expect(drawBuffer.mock.calls.length).toBe(drawAudio.mock.calls.length);
    expect(drawAutoSlow.mock.calls.length).toBe(drawAudio.mock.calls.length);
  });

  it("keeps an active graph on the animation-frame path and tears it down", async () => {
    vi.useFakeTimers();
    const drawAudio = vi.fn();
    const drawBuffer = vi.fn();
    const drawAutoSlow = vi.fn();
    const startPoll = vi.fn((state: { audioActive: boolean; audioEnabled: boolean }) => {
      state.audioActive = true;
      state.audioEnabled = true;
      return vi.fn();
    });
    vi.doMock("../src/popup/graphs/audio-meter.js", () => ({ drawAudio }));
    vi.doMock("../src/popup/graphs/latency-graph.js", () => ({ drawBuffer }));
    vi.doMock("../src/popup/graphs/autoslow-graph.js", () => ({ drawAutoSlow }));
    vi.doMock("../src/popup/graphs/poll.js", () => ({ startPoll }));
    const raf = vi.fn((cb: FrameRequestCallback) => Number(setTimeout(() => cb(Date.now()), 16)));
    const cancel = vi.fn((id: number) => clearTimeout(id));
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", cancel);
    canvas("audioMeter");
    canvas("bufferMeter");
    canvas("autoSlowMeter");

    const { setupGraphs } = await import("../src/popup/graphs/index.js");
    const stop = setupGraphs(
      () => 1,
      () => {},
      () => {},
    );
    await vi.advanceTimersByTimeAsync(100);
    const frames = drawAudio.mock.calls.length;
    stop();
    await vi.advanceTimersByTimeAsync(100);

    expect(startPoll).toHaveBeenCalledTimes(1);
    expect(frames).toBeGreaterThan(3);
    expect(drawBuffer).toHaveBeenCalledTimes(frames);
    expect(drawAutoSlow).toHaveBeenCalledTimes(frames);
    expect(cancel).toHaveBeenCalled();
    expect(drawAudio.mock.calls.length).toBe(frames);
  });
});
