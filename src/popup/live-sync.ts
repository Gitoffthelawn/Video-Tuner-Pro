import { STORE } from "./platform/storage.js";
import { getActiveTab } from "./platform/browser.js";
import { normalizeHost } from "./core/domain.js";
import { debounce } from "./core/debounce.js";
import { byId } from "./dom.js";
import { autoExpandOnFirstEnable } from "./sections.js";

function clampTarget(n: unknown): number {
  const v = Number(n);
  if (Number.isNaN(v)) return 5;
  // Floor of 1s, matching the content script — 0 would mean perpetual catch-up.
  return Math.min(30, Math.max(1, Math.round(v)));
}

// The allowed delay is remembered per site (syncTargets), so the slider needs the
// active tab's domain to read and write it.
let domain = "";
async function resolveDomain(): Promise<string> {
  const tab = await getActiveTab();
  try { return tab && tab.url ? normalizeHost(new URL(tab.url).hostname) : ""; }
  catch (e) { return ""; }
}

function reflectSyncUI(enabled: boolean, target: number): void {
  byId<HTMLInputElement>("liveSyncToggle").checked = enabled;
  byId<HTMLInputElement>("syncTarget").value = String(target);
  byId("syncTargetVal").textContent = String(target);
}

export async function loadSyncSettings(): Promise<void> {
  domain = await resolveDomain();
  STORE.get(["liveSync", "liveSyncTarget", "syncTargets"], (result) => {
    const targets = (result.syncTargets || {}) as Record<string, number>;
    // Per-site value, else the legacy global one, else the 5s default (clampTarget
    // turns an undefined into 5).
    const target = targets[domain] != null ? targets[domain] : result.liveSyncTarget;
    reflectSyncUI(result.liveSync !== false, clampTarget(target));
  });
}

const saveSyncTarget = debounce((v: number) => {
  if (!domain) return; // no host to key the per-site value on (e.g. chrome:// pages)
  STORE.get(["syncTargets"], (r) => {
    const targets = (r.syncTargets || {}) as Record<string, number>;
    targets[domain] = v;
    STORE.set({ syncTargets: targets });
  });
}, 350);

byId<HTMLInputElement>("liveSyncToggle").addEventListener("change", (e) => {
  const checked = (e.target as HTMLInputElement).checked;
  STORE.set({ liveSync: checked });
  autoExpandOnFirstEnable(checked, "syncBody", "liveSyncSeen");
});
byId<HTMLInputElement>("syncTarget").addEventListener("input", (e) => {
  const target = clampTarget((e.target as HTMLInputElement).value);
  byId("syncTargetVal").textContent = String(target);
  saveSyncTarget(target);
});
