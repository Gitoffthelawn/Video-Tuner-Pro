// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { mountApp, byId, flush, wait } from "./mocks/mount-popup.js";

// The per-site kill switch: a site card under the header that, once on, unmounts
// every other card (so their hooks stop talking to the dormant content script) and
// leaves the card itself as the notice + the way back.
const YT = { id: 7, url: "https://www.youtube.com/watch?v=1" };
const YT_MUSIC = { id: 7, url: "https://music.youtube.com/" };
const sub = () => document.querySelector(".site-off .switch-sub")!.textContent;
const toggle = () => byId("siteOffToggle") as HTMLButtonElement;

describe("popup · site switch", () => {
  it("shows the site card (switch off, domain hint) above all the cards", async () => {
    await mountApp({ tab: YT });
    expect(toggle().getAttribute("aria-checked")).toBe("false");
    expect(toggle().disabled).toBe(false);
    expect(sub()).toBe("Turns everything off on youtube.com and its subdomains.");
    expect(document.querySelector(".popup-grid")).not.toBeNull();
    expect(byId("currentSpeedPct")).not.toBeNull();
  });

  it("switching it on stores the domain and unmounts the cards, keeping the header and the card", async () => {
    const { saved } = await mountApp({ tab: YT });
    toggle().click();
    await flush();
    expect(saved().siteBlacklist).toEqual(["youtube.com"]);
    expect(document.querySelector(".popup-grid")).toBeNull();
    expect(document.getElementById("currentSpeedPct")).toBeNull();
    expect(document.querySelector(".header")).not.toBeNull();
    expect(toggle().getAttribute("aria-checked")).toBe("true");
    expect(sub()).toBe("Video Tuner is off on youtube.com and its subdomains.");
  });

  it("a parent entry switches a subdomain off; flipping the switch removes the covering entry", async () => {
    const { saved } = await mountApp({
      tab: YT_MUSIC,
      settings: { siteBlacklist: ["youtube.com"] },
    });
    expect(document.querySelector(".header")).not.toBeNull();
    expect(document.querySelector(".popup-grid")).toBeNull();
    expect(toggle().getAttribute("aria-checked")).toBe("true");
    expect(sub()).toBe("Video Tuner is off on youtube.com and its subdomains.");

    toggle().click();
    await flush();
    expect(saved().siteBlacklist).toEqual([]);
    expect(toggle().getAttribute("aria-checked")).toBe("false");
    expect(document.querySelector(".popup-grid")).not.toBeNull();
    expect(byId("currentSpeedPct")).not.toBeNull();
  });

  it("renders the cards and the site card when no content script answers any request", async () => {
    await mountApp({
      tab: YT,
      settings: { globalSpeed: 1.5 },
      replies: {
        getSpeed: undefined,
        getTarget: undefined,
        getViewerAuto: undefined,
        getViewerState: undefined,
        getViewerFit: undefined,
      },
    });
    await wait(500); // useSpeed's no-reply fallback to storage fires after 400ms
    expect(byId("siteOffToggle")).not.toBeNull();
    expect(document.querySelector(".popup-grid")).not.toBeNull();
    expect(byId("currentSpeedPct").textContent).toBe("150%");
  });

  it("disables the switch on a tab without a hostname", async () => {
    await mountApp({ tab: { id: 7, url: "about:blank" } });
    expect(toggle().disabled).toBe(true);
    expect(toggle().getAttribute("aria-checked")).toBe("false");
    expect(sub()).toBe("—");
    expect(document.querySelector(".popup-grid")).not.toBeNull();
  });
});
