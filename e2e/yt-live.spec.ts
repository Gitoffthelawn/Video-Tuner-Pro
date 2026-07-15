// Network smokes against real youtube.com (not CI tests — run manually).
// They verify that Viewer/Theater lifts YouTube's original player and native
// controls without creating a second primary media pipeline or losing cadence.
import { test, expect } from "./fixtures/extension.js";
import type { Page, Response } from "@playwright/test";

test.setTimeout(120_000);

// Real-network VOD smoke. A separate test below requires an actual live URL.
//   YT_NETWORK=1 npx playwright test e2e/yt-live.spec.ts

// A video known for chapters + SponsorBlock segments (LTT-style tech video
// tends to have both). Fall back assertions are lenient where content varies.
const URL_CHAPTERS = "https://www.youtube.com/watch?v=1La4QzGeaaQ"; // typical chaptered video

const YOUTUBE_VIDEO = "video.html5-main-video";

async function skipIfYouTubeBlocked(page: Page, response: Response | null): Promise<void> {
  const status = response?.status() ?? 0;
  const blocked =
    status === 403 ||
    status === 429 ||
    (await page.evaluate(() =>
      /unusual traffic|not a robot|captcha|google\.com\/sorry|HTTP ERROR 429/i.test(
        document.body?.innerText || document.documentElement?.innerText || "",
      ),
    ));
  if (blocked) test.skip(true, `YouTube blocked automated network access (HTTP ${status || "?"})`);
}

async function waitForYouTubeVideo(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate((selector) => {
          const preferred = document.querySelector(selector) as HTMLVideoElement | null;
          const candidates = preferred ? [preferred] : [...document.querySelectorAll("video")];
          return candidates.some((video) => {
            const rect = video.getBoundingClientRect();
            return rect.width >= 200 && rect.height >= 112 && video.readyState >= 1;
          });
        }, YOUTUBE_VIDEO),
      { timeout: 30_000 },
    )
    .toBe(true);
}

test("real YouTube VOD: native controls, cadence, and no drift", async ({
  page,
  serviceWorker,
}, testInfo) => {
  test.skip(!process.env.YT_NETWORK, "real YouTube VOD smoke — set YT_NETWORK=1 to run");
  await serviceWorker.evaluate(() => chrome.storage.sync.set({ sponsorMarks: true }));
  const response = await page.goto(URL_CHAPTERS, { waitUntil: "domcontentloaded" });
  await skipIfYouTubeBlocked(page, response);
  // Consent wall (fresh profile) — take whatever reject/accept button exists.
  const consent = page.locator(
    'button:has-text("Reject all"), button:has-text("Отклонить все"), [aria-label*="Reject"], button:has-text("Accept all")',
  );
  try {
    await consent.first().click({ timeout: 7000 });
  } catch {
    /* no consent wall */
  }
  await waitForYouTubeVideo(page);
  await page.evaluate((selector) => {
    const preferred = document.querySelector(selector) as HTMLVideoElement | null;
    const v =
      preferred ??
      [...document.querySelectorAll("video")].find((video) => {
        const rect = video.getBoundingClientRect();
        return rect.width >= 200 && rect.height >= 112 && video.readyState >= 1;
      });
    if (!v) throw new Error("YouTube video disappeared before playback");
    v.muted = true;
    return v.play().catch(() => {});
  }, YOUTUBE_VIDEO);
  await page.waitForTimeout(4000); // player settles; badge/launcher mount
  await page.evaluate((selector) => {
    const preferred = document.querySelector(selector) as HTMLVideoElement | null;
    const v =
      preferred ??
      [...document.querySelectorAll("video")].find((video) => {
        const rect = video.getBoundingClientRect();
        return rect.width >= 200 && rect.height >= 112 && video.readyState >= 1;
      });
    if (!v) throw new Error("YouTube video disappeared before pointer probe");
    const r = v.getBoundingClientRect();
    document.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: r.left + 100,
        clientY: r.top + 100,
        bubbles: true,
      }),
    );
  }, YOUTUBE_VIDEO);
  // Mimic a third-party control inside the player chrome; quality probing must
  // ignore unrelated buttons.
  await page.evaluate(() => {
    const controls =
      document.querySelector(".ytp-right-controls") ?? document.querySelector("#movie_player");
    const b = document.createElement("button");
    b.className = "third-party-icon-button";
    b.setAttribute("aria-label", "Third-party settings");
    const panel = document.createElement("div");
    panel.style.display = "none";
    panel.textContent = "Third-party panel without quality controls";
    b.addEventListener("click", () => {
      document.body.dataset.thirdPartyClicks = String(
        Number(document.body.dataset.thirdPartyClicks || 0) + 1,
      );
      panel.style.display = panel.style.display === "none" ? "" : "none";
    });
    controls!.prepend(b);
    controls!.append(panel);
  });
  const siteChapters = await page.evaluate(
    () => document.querySelectorAll(".ytp-chapters-container > *").length,
  );
  console.log("SITE CHAPTERS:", siteChapters);
  await page.keyboard.press("KeyT");
  await page.waitForTimeout(3500); // enter + quality probe + sponsor fetch

  const state = await page.evaluate(async () => {
    const overlay = document.querySelector("[data-vtp-viewer-overlay]");
    const v = document.querySelector(
      "[data-vtp-viewer-player-video],[data-vtp-viewer-adopted-video]",
    ) as HTMLVideoElement | null;
    const player = v?.closest(".html5-video-player") as HTMLElement | null;
    const r = player?.getBoundingClientRect();
    let frames = 0;
    const started = performance.now();
    if (v && typeof v.requestVideoFrameCallback === "function") {
      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        const frame = (now: number) => {
          if (done) return;
          frames += 1;
          if (now - started >= 2200) finish();
          else v.requestVideoFrameCallback(frame);
        };
        v.requestVideoFrameCallback(frame);
        setTimeout(finish, 2600);
      });
    }
    const elapsed = Math.max(1, performance.now() - started);
    return {
      overlay: !!overlay,
      native: v?.hasAttribute("data-vtp-viewer-player-video") ?? false,
      popover: player?.matches(":popover-open") ?? false,
      playing: !!v && !v.paused,
      t: v?.currentTime ?? -1,
      fps: (frames * 1000) / elapsed,
      fills:
        !!r &&
        Math.round(r.left) === 0 &&
        Math.round(r.top) === 0 &&
        Math.round(r.width) === window.innerWidth &&
        Math.round(r.height) === window.innerHeight,
      nativeControls: !!player?.querySelector(".ytp-chrome-controls"),
    };
  });
  console.log("STATE1:", JSON.stringify(state));
  expect(state.overlay).toBe(true);
  expect(state.native).toBe(true);
  expect(state.popover).toBe(true);
  expect(state.fills).toBe(true);
  expect(state.nativeControls).toBe(true);
  expect(state.playing).toBe(true);
  expect(state.fps).toBeGreaterThanOrEqual(18);
  expect(siteChapters).toBeGreaterThanOrEqual(0);

  // Drift check: YouTube keeps rewriting its player layout; the top-layer root
  // must remain full-screen while its original playback clock advances.
  await page.waitForTimeout(6000);
  const state2 = await page.evaluate(() => {
    const v = document.querySelector(
      "[data-vtp-viewer-player-video],[data-vtp-viewer-adopted-video]",
    ) as HTMLVideoElement | null;
    const player = v?.closest(".html5-video-player") as HTMLElement | null;
    const r = player?.getBoundingClientRect();
    return {
      stillFills:
        !!r &&
        Math.round(r.left) === 0 &&
        Math.round(r.top) === 0 &&
        Math.round(r.width) === window.innerWidth &&
        Math.round(r.height) === window.innerHeight,
      popover: player?.matches(":popover-open") ?? false,
      t: v?.currentTime ?? -1,
      playing: !!v && !v.paused,
    };
  });
  console.log("STATE2:", JSON.stringify(state2));
  await page.screenshot({ path: testInfo.outputPath("yt-live.png") });
  console.log("SCREENSHOT:", testInfo.outputPath("yt-live.png"));
  expect(state2.stillFills).toBe(true);
  expect(state2.popover).toBe(true);
  expect(state2.playing).toBe(true);
  expect(state2.t).toBeGreaterThan(state.t + 4);
  const thirdPartyClicks = await page.evaluate(() =>
    Number(document.body.dataset.thirdPartyClicks || 0),
  );
  expect(thirdPartyClicks).toBe(0); // foreign buttons must never be poked
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-vtp-viewer-overlay]")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator("#movie_player")).not.toHaveAttribute("data-vtp-viewer-player", "");
});

test("real YouTube live: native controls, Theater layout, and playback", async ({
  page,
}, testInfo) => {
  const liveUrl = process.env.YT_LIVE_URL;
  test.skip(!liveUrl, "real YouTube live smoke — set YT_LIVE_URL to an active broadcast");

  const response = await page.goto(liveUrl!, { waitUntil: "domcontentloaded" });
  await skipIfYouTubeBlocked(page, response);
  const consent = page.locator(
    'button:has-text("Reject all"), button:has-text("Отклонить все"), [aria-label*="Reject"], button:has-text("Accept all")',
  );
  try {
    await consent.first().click({ timeout: 7000 });
  } catch {
    /* no consent wall */
  }
  await waitForYouTubeVideo(page);
  await page.evaluate((selector) => {
    const preferred = document.querySelector(selector) as HTMLVideoElement | null;
    const video =
      preferred ??
      [...document.querySelectorAll("video")].find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.width >= 200 && rect.height >= 112 && candidate.readyState >= 1;
      });
    if (!video) throw new Error("YouTube live video disappeared before playback");
    video.muted = true;
    return video.play().catch(() => {});
  }, YOUTUBE_VIDEO);
  await expect
    .poll(() => page.locator("html").getAttribute("data-vtp-live"), { timeout: 30_000 })
    .toBe("1");

  await page.keyboard.press("KeyT");
  await expect(page.locator("[data-vtp-viewer-overlay]")).toBeVisible({ timeout: 15_000 });
  const before = await page.evaluate(
    () =>
      (
        document.querySelector(
          "[data-vtp-viewer-player-video],[data-vtp-viewer-adopted-video]",
        ) as HTMLVideoElement
      ).currentTime,
  );
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const video = document.querySelector(
            "[data-vtp-viewer-player-video],[data-vtp-viewer-adopted-video]",
          ) as HTMLVideoElement | null;
          const player = video?.closest(".html5-video-player") as HTMLElement | null;
          const rect = player?.getBoundingClientRect();
          return {
            native: video?.hasAttribute("data-vtp-viewer-player-video") ?? false,
            popover: player?.matches(":popover-open") ?? false,
            fills:
              !!rect &&
              Math.round(rect.left) === 0 &&
              Math.round(rect.top) === 0 &&
              Math.round(rect.width) === window.innerWidth &&
              Math.round(rect.height) === window.innerHeight,
            controls: !!player?.querySelector(".ytp-chrome-controls"),
            playing: !!video && !video.paused,
          };
        }),
      { timeout: 15_000 },
    )
    .toEqual({ native: true, popover: true, fills: true, controls: true, playing: true });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(
    () =>
      (
        document.querySelector(
          "[data-vtp-viewer-player-video],[data-vtp-viewer-adopted-video]",
        ) as HTMLVideoElement
      ).currentTime,
  );
  expect(after).toBeGreaterThan(before + 0.5);
  await page.screenshot({ path: testInfo.outputPath("youtube-live.png") });
});
