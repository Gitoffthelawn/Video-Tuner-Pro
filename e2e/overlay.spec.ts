import { test, expect, setStorage, clearStorage } from "./fixtures/extension.js";
import type { Page, Frame } from "@playwright/test";

// The on-video overlay must be TRANSPARENT (the video shows through the glass) AND
// themed to the OS — on every site, including ones that force their own scheme
// (Facebook forces it via <meta>). Chrome's rule: the iframe is transparent only
// when its color-scheme matches the HOST's used scheme (a mismatch paints an opaque
// backdrop). The launcher resolves the host scheme + the OS and passes both; the
// popup sets color-scheme to match the host (transparency) and themes the glass to
// the OS (decoupled). Two fixtures: a normal host and a Facebook-like <meta> host.
//
// Caveat: emulateMedia (the only headless dark-OS knob) also feeds the launcher's
// matchMedia, so the OS passed to the popup is what we emulate — which is the point.

async function openOverlay(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForSelector("#v");
  await page.mouse.move(400, 300);
  await page.keyboard.press("KeyO");
  await page.waitForFunction(
    () => !!document.querySelector("[data-vtp-launcher]")?.shadowRoot?.querySelector("iframe"),
  );
  await expect.poll(() => !!overlayFrame(page)).toBe(true);
}

function overlayFrame(page: Page): Frame | undefined {
  return page.frames().find((f) => f.url().includes("/popup/popup.html"));
}

async function showsPageThrough(page: Page): Promise<boolean> {
  const box = await page.evaluate(() => {
    const f = document.querySelector("[data-vtp-launcher]")?.shadowRoot?.querySelector("iframe") as
      | HTMLIFrameElement
      | null
      | undefined;
    if (!f) return null;
    const r = f.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  expect(box).not.toBeNull();
  const clip = {
    x: Math.round(box!.x + box!.width / 2 - 80),
    y: Math.round(box!.y + 6),
    width: 160,
    height: 36,
  };
  await expect
    .poll(() =>
      page.evaluate(() => {
        const iframe = document
          .querySelector("[data-vtp-launcher]")
          ?.shadowRoot?.querySelector("iframe");
        return (
          iframe instanceof HTMLIFrameElement &&
          iframe.getAnimations().every((animation) => animation.playState !== "running")
        );
      }),
    )
    .toBe(true);
  const a = await page.screenshot({ clip });
  await page.evaluate(() => {
    (document.getElementById("bg") as HTMLElement).style.background = "#cc0000";
    return new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  const b = await page.screenshot({ clip });
  return Buffer.compare(a, b) !== 0; // recolouring the page changed the glass → transparent
}

async function bodyIsDark(page: Page): Promise<boolean> {
  const color = await overlayFrame(page)!.evaluate(() => getComputedStyle(document.body).color);
  const [r, g, b] = color.match(/\d+/g)!.map(Number);
  return Math.min(r, g, b) > 180; // near-white text → dark theme
}

test.beforeEach(async ({ serviceWorker }) => {
  await clearStorage(serviceWorker);
});

test("a real launcher click paints a loaded popup panel with a non-zero box", async ({
  page,
  serviceWorker,
}) => {
  await setStorage(serviceWorker, {
    overlayButton: "always",
    // Simulate a stale/corrupt position from an older build or a differently
    // sized display. The popup must self-heal into the current viewport.
    overlayPanelPos: { localhost: { fx: 4, fy: -3 } },
  });
  await page.goto("/overlay.html");
  await page.waitForSelector("[data-vtp-badge]", { state: "attached" });
  await page.mouse.move(80, 45);

  // Use a structural locator after the click: its accessible name intentionally
  // changes from "Open" to "Close" when the popup opens.
  const launcher = page.locator("#vtp-launcher-host").locator("button").first();
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(launcher).toHaveAttribute("data-popup-open", "true");

  await expect
    .poll(() =>
      page.evaluate(() => {
        const iframe = document
          .querySelector("[data-vtp-launcher]")
          ?.shadowRoot?.querySelector("iframe");
        if (!(iframe instanceof HTMLIFrameElement)) return null;
        const r = iframe.getBoundingClientRect();
        const style = getComputedStyle(iframe);
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          display: style.display,
          visibility: style.visibility,
          opacity: Number(style.opacity),
        };
      }),
    )
    .toMatchObject({ display: "block", visibility: "visible", opacity: 1 });
  const painted = await page.evaluate(() => {
    const iframe = document
      .querySelector("[data-vtp-launcher]")
      ?.shadowRoot?.querySelector("iframe");
    if (!(iframe instanceof HTMLIFrameElement)) return false;
    const r = iframe.getBoundingClientRect();
    return {
      largeEnough: r.width > 300 && r.height > 200,
      insideViewport:
        r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
      bounds: {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      },
    };
  });
  expect(painted.largeEnough).toBe(true);
  expect(painted.insideViewport, JSON.stringify(painted.bounds)).toBe(true);

  await expect.poll(() => !!overlayFrame(page)).toBe(true);
  await expect(overlayFrame(page)!.locator("body")).toBeVisible();

  // A saved position must remain usable when the browser moves to a smaller
  // monitor/window after the popup is already open.
  await page.setViewportSize({ width: 820, height: 520 });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const iframe = document
          .querySelector("[data-vtp-launcher]")
          ?.shadowRoot?.querySelector("iframe");
        if (!(iframe instanceof HTMLIFrameElement)) return false;
        const r = iframe.getBoundingClientRect();
        return (
          r.width > 300 &&
          r.height > 200 &&
          r.left >= 0 &&
          r.top >= 0 &&
          r.right <= window.innerWidth &&
          r.bottom <= window.innerHeight
        );
      }),
    )
    .toBe(true);
});

const HOSTS = [
  { name: "normal", path: "/overlay.html" },
  { name: "meta-color-scheme (Facebook-like)", path: "/overlay-meta.html" },
];

for (const host of HOSTS) {
  for (const os of ["dark", "light"] as const) {
    test(`${host.name} host: transparent + ${os} theme under a ${os} OS`, async ({
      page,
      serviceWorker,
    }) => {
      await setStorage(serviceWorker, { theme: "system", overlayButton: "always" });
      await page.emulateMedia({ colorScheme: os });
      await openOverlay(page, host.path);
      // The glass shows the page through it...
      expect(await showsPageThrough(page)).toBe(true);
      // ...and the theme follows the OS (not the host's forced scheme).
      await expect.poll(() => bodyIsDark(page)).toBe(os === "dark");
    });
  }
}
