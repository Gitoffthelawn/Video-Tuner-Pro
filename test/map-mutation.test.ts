import { afterEach, describe, expect, it, vi } from "vitest";

type Response = { success?: boolean } | undefined;

async function loadWith(
  sendMessage: (message: unknown, callback: (response?: Response) => void) => unknown,
) {
  (globalThis as unknown as { browser?: unknown }).browser = undefined;
  (globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: { lastError: null, sendMessage },
  };
  vi.resetModules();
  return import("../src/shared/map-mutation.js");
}

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("atomic stored-map mutation messaging", () => {
  it("sends a merge/removal request and reports callback success", async () => {
    const sent: unknown[] = [];
    const { mutateStoredMap } = await loadWith((message, callback) => {
      sent.push(message);
      callback({ success: true });
    });
    const done = vi.fn();

    mutateStoredMap("viewerAutoSites", { example: "normal" }, ["legacy"], done);

    expect(sent).toEqual([
      {
        action: "mutateStoredMap",
        map: "viewerAutoSites",
        set: { example: "normal" },
        remove: ["legacy"],
      },
    ]);
    expect(done).toHaveBeenCalledOnce();
    expect(done).toHaveBeenCalledWith(true);
  });

  it("settles once when an API supplies both callback and Promise responses", async () => {
    const { mutateStoredMap } = await loadWith((_message, callback) => {
      callback({ success: true });
      return Promise.resolve({ success: false });
    });
    const done = vi.fn();

    mutateStoredMap("domains", { example: 2 }, [], done);
    await Promise.resolve();

    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith(true);
  });

  it("reports Promise rejection and synchronous extension failures", async () => {
    const rejected = await loadWith(() => Promise.reject(new Error("port closed")));
    const rejectedDone = vi.fn();
    rejected.mutateStoredMap("channels", {}, ["old"], rejectedDone);
    await Promise.resolve();
    await Promise.resolve();
    expect(rejectedDone).toHaveBeenCalledWith(false);

    const thrown = await loadWith(() => {
      throw new Error("context invalidated");
    });
    const thrownDone = vi.fn();
    thrown.mutateStoredMap("channels", {}, [], thrownDone);
    expect(thrownDone).toHaveBeenCalledWith(false);
  });

  it("clears a whole map through the same atomic background action", async () => {
    const sent: unknown[] = [];
    const { clearStoredMap } = await loadWith((message, callback) => {
      sent.push(message);
      callback({ success: true });
    });
    const done = vi.fn();

    clearStoredMap("overlayPanelPos", done);

    expect(sent).toEqual([{ action: "mutateStoredMap", map: "overlayPanelPos", clear: true }]);
    expect(done).toHaveBeenCalledWith(true);
  });
});
