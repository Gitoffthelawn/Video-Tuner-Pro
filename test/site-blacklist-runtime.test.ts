// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockChrome } from "./mocks/chrome.js";

// The real content script, end to end: boot it against seeded storage, then flip the
// site blacklist the way the popup / options page do (a storage write that reaches the
// page as chrome.storage.onChanged) and watch what the page's media does. Everything
// is real except chrome.storage and the clock.
const ATTR = "data-vtp-audiorate";
// Test seam: the extension API the content script resolves from globalThis at import.
const globals = globalThis as unknown as { chrome: typeof chrome };

function video(rate: number): HTMLVideoElement {
  const v = document.createElement("video");
  v.playbackRate = rate;
  v.defaultPlaybackRate = rate;
  const rect = { left: 0, top: 0, width: 640, height: 360, right: 640, bottom: 360 } as DOMRect;
  v.getBoundingClientRect = () => rect;
  document.body.append(v);
  return v;
}

async function boot(settings: Record<string, unknown>) {
  vi.resetModules();
  const chrome = createMockChrome({ settings });
  globals.chrome = chrome;
  const { teardown } = await import("../src/content/index.js");
  const { S } = await import("../src/content/state.js");
  return { chrome, S, teardown };
}

// What another extension context writing the setting looks like to the page.
const writeBlacklist = (chrome: typeof globalThis.chrome, list: string[]) =>
  chrome.storage.sync.set({ siteBlacklist: list });

const press = (code: string) =>
  document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true }));

let stop: (() => void) | null = null;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
  document.documentElement.removeAttribute(ATTR);
  stop = null;
});
afterEach(() => {
  stop?.();
  vi.useRealTimers();
});

describe("content script on a site that is not blacklisted", () => {
  it("applies the saved speed, then hands the page back at 1× and back again without a reload", async () => {
    const v = video(1);
    const { chrome, S, teardown } = await boot({ globalSpeed: 1.5, audioSpeed: true });
    stop = teardown;
    expect(S.siteDisabled).toBe(false);
    expect(v.playbackRate).toBe(1.5);
    expect(document.documentElement.getAttribute(ATTR)).toBe("1.5");

    // Switched off from the popup: the page is handed back immediately.
    writeBlacklist(chrome, ["localhost"]);
    expect(S.siteDisabled).toBe(true);
    expect(v.playbackRate).toBe(1);
    expect(v.defaultPlaybackRate).toBe(1);
    expect(document.documentElement.hasAttribute(ATTR)).toBe(false);

    // …and from then on nothing of ours writes to it: not the page's own rate changes
    // (the per-element listeners outlive the switch-off), not the tick, not a hotkey.
    v.playbackRate = 3;
    v.dispatchEvent(new Event("ratechange"));
    v.dispatchEvent(new Event("play"));
    press("KeyD");
    await vi.advanceTimersByTimeAsync(40_000);
    expect(v.playbackRate).toBe(3);
    expect(document.querySelector("[data-vtp-badge]")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);

    // Switched back on: no reload — the saved speed returns, the tick runs again and the
    // hotkeys work.
    writeBlacklist(chrome, []);
    expect(S.siteDisabled).toBe(false);
    expect(v.playbackRate).toBe(1.5);
    v.playbackRate = 1;
    await vi.advanceTimersByTimeAsync(1100);
    expect(v.playbackRate).toBe(1.5);
    press("KeyD");
    expect(v.playbackRate).toBeCloseTo(1.55, 5);
  });

  it("a blacklist edit that does not cover the site changes nothing", async () => {
    const v = video(1);
    const { chrome, S, teardown } = await boot({ globalSpeed: 1.5 });
    stop = teardown;

    writeBlacklist(chrome, ["example.com", "notlocalhost", "a.localhost"]);

    expect(S.siteDisabled).toBe(false);
    expect(v.playbackRate).toBe(1.5);
  });

  it("a parent entry covers the site: localhost is off when `localhost` is listed", async () => {
    const v = video(1);
    const { chrome, S, teardown } = await boot({ globalSpeed: 1.5 });
    stop = teardown;

    writeBlacklist(chrome, ["https://LOCALHOST:3000/some/page"]); // normalized like the editor does

    expect(S.siteDisabled).toBe(true);
    expect(v.playbackRate).toBe(1);
  });
});

describe("content script on a blacklisted site", () => {
  it("boots without starting any timer or media tracking, and never touches the page's rate", async () => {
    const v = video(2);
    const { chrome, S, teardown } = await boot({
      siteBlacklist: ["localhost"],
      globalSpeed: 1.5,
      audioSpeed: true,
      overlayButton: "always",
    });
    stop = teardown;
    expect(S.siteDisabled).toBe(true);

    v.dispatchEvent(new Event("loadedmetadata"));
    v.dispatchEvent(new Event("play"));
    press("KeyD");
    document.body.append(document.createElement("video")); // a lazy player appears
    await vi.advanceTimersByTimeAsync(40_000);

    expect(v.playbackRate).toBe(2);
    expect(v.defaultPlaybackRate).toBe(2);
    expect(document.documentElement.hasAttribute(ATTR)).toBe(false);
    expect(document.querySelector("[data-vtp-badge]")).toBeNull();
    expect(document.querySelector("[data-vtp-launcher]")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);

    // The popup can still switch it on — from a clean start, without a reload.
    writeBlacklist(chrome, []);
    expect(S.siteDisabled).toBe(false);
    expect(v.playbackRate).toBe(1.5);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });
});
