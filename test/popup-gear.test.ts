// @vitest-environment jsdom
// The header gear opens the options page. From the on-video overlay the popup is an
// embedded iframe (window.top !== window), where openOptionsPage() is a no-op on
// Firefox — so it must route through the background via runtime.sendMessage instead.
import { describe, it, expect, vi, afterEach } from "vitest";
import { mountApp, byId, flush } from "./mocks/mount-popup.js";

const EX = { id: 9, url: "https://example.com/" };

describe("popup gear → options", () => {
  const realTop = Object.getOwnPropertyDescriptor(window, "top");
  afterEach(() => {
    if (realTop) Object.defineProperty(window, "top", realTop);
  });

  it("routes through the background when embedded as the overlay iframe", async () => {
    await mountApp({ tab: EX });
    const send = vi.spyOn(globalThis.chrome.runtime, "sendMessage");
    Object.defineProperty(window, "top", { value: {}, configurable: true }); // pretend: iframe
    byId("openOptions").click();
    await flush();
    expect(send).toHaveBeenCalledWith({ action: "openOptions" });
  });

  it("opens directly in the top-level toolbar popup", async () => {
    await mountApp({ tab: EX });
    const open = vi.fn();
    (globalThis.chrome.runtime as unknown as { openOptionsPage: () => void }).openOptionsPage =
      open;
    // window.top === window here (jsdom top document) → direct call, no message.
    const send = vi.spyOn(globalThis.chrome.runtime, "sendMessage");
    byId("openOptions").click();
    await flush();
    expect(open).toHaveBeenCalled();
    expect(send).not.toHaveBeenCalledWith({ action: "openOptions" });
  });
});
