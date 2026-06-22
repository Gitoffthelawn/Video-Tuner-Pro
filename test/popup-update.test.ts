// @vitest-environment jsdom
// The header's "new version" flag: a labelled marker shown only when the
// background recorded a newer version, with the version in its tooltip.
import { describe, it, expect } from "vitest";
import { mountApp, byId, flush } from "./mocks/mount-popup.js";

const YT = { id: 7, url: "https://www.youtube.com/watch?v=x" };

describe("popup · update flag", () => {
  it("stays hidden when no update is available", async () => {
    await mountApp({ tab: YT });
    await flush();
    expect(document.getElementById("updateFlag")).toBeNull();
  });

  it("shows the labelled flag with the available version in its tooltip", async () => {
    await mountApp({
      tab: YT,
      settings: { updateAvailable: true, updateLatestVersion: "9.9.9" },
    });
    await flush();
    const flag = byId("updateFlag");
    expect(flag).toBeTruthy();
    expect(flag.textContent).toContain("New version");
    expect(flag.getAttribute("title")).toContain("9.9.9");
  });
});
