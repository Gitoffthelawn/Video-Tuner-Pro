// Saved speeds & live-sync delays manager: lists everything saved by scope
// (global / per-site / per-channel) and lets you forget any single value.
import { STORE } from "../shared/store.js";
import { msg } from "../popup/i18n.js";

type NumMap = Record<string, number>;

const root = () => document.getElementById("savedLists") as HTMLElement;

const pct = (v: number) => Math.round(v * 100) + "%";
const secs = (v: number) => v + " " + (msg("secondsShort") || "s");

// Channel keys are stored as a stable id/handle/login (no display name is kept);
// present them as readably as we can.
function prettyChannel(key: string): string {
  if (key.startsWith("twitch:")) return key.slice(7) + " (Twitch)";
  if (key.startsWith("channel/")) return key.slice(8);
  return key;
}

interface Chip { label: string; onDelete: () => void; }

function rowEl(name: string, chips: Chip[]): HTMLElement {
  const row = document.createElement("div");
  row.className = "saved-row";
  const nameEl = document.createElement("span");
  nameEl.className = "saved-name";
  nameEl.textContent = name;
  nameEl.title = name;
  row.append(nameEl);
  for (const c of chips) {
    const val = document.createElement("span");
    val.className = "saved-val";
    const b = document.createElement("b");
    b.textContent = c.label;
    const del = document.createElement("button");
    del.className = "saved-del";
    del.type = "button";
    del.textContent = "×";
    del.setAttribute("aria-label", msg("optDelete") || "Remove");
    del.addEventListener("click", c.onDelete);
    val.append(b, del);
    row.append(val);
  }
  return row;
}

function groupEl(titleKey: string, rows: HTMLElement[]): HTMLElement {
  const g = document.createElement("div");
  g.className = "saved-group";
  const title = document.createElement("div");
  title.className = "saved-group-title";
  title.textContent = msg(titleKey) || titleKey;
  g.append(title);
  if (rows.length) {
    for (const r of rows) g.append(r);
  } else {
    const empty = document.createElement("div");
    empty.className = "saved-empty";
    empty.textContent = msg("optSavedEmpty") || "Nothing saved yet.";
    g.append(empty);
  }
  return g;
}

// Remove one key from a stored map (or clear a scalar) then re-render.
function deleteFromMap(storeKey: string, mapKey: string): void {
  STORE.get([storeKey], (r) => {
    const map = { ...(r[storeKey] as NumMap | undefined) };
    delete map[mapKey];
    STORE.set({ [storeKey]: map }, render);
  });
}

export function render(): void {
  STORE.get(
    ["globalSpeed", "domains", "channels", "syncTargetGlobal", "liveSyncTarget", "syncTargets", "syncTargetChannels"],
    (r) => {
      const domains = (r.domains || {}) as NumMap;
      const channels = (r.channels || {}) as NumMap;
      const siteDelays = (r.syncTargets || {}) as NumMap;
      const chanDelays = (r.syncTargetChannels || {}) as NumMap;
      const globalSpeed = r.globalSpeed as number | undefined;
      const globalDelay = (r.syncTargetGlobal ?? r.liveSyncTarget) as number | undefined;

      // --- Global -------------------------------------------------------------
      const globalChips: Chip[] = [];
      if (globalSpeed != null) globalChips.push({ label: pct(globalSpeed), onDelete: () => STORE.remove("globalSpeed", render) });
      if (globalDelay != null) globalChips.push({ label: secs(globalDelay), onDelete: () => STORE.remove(["syncTargetGlobal", "liveSyncTarget"], render) });
      const globalRows = globalChips.length ? [rowEl(msg("scopeGlobal") || "Global", globalChips)] : [];

      // --- Sites --------------------------------------------------------------
      const siteRows: HTMLElement[] = [];
      for (const host of new Set([...Object.keys(domains), ...Object.keys(siteDelays)])) {
        const chips: Chip[] = [];
        if (domains[host] != null) chips.push({ label: pct(domains[host]), onDelete: () => deleteFromMap("domains", host) });
        if (siteDelays[host] != null) chips.push({ label: secs(siteDelays[host]), onDelete: () => deleteFromMap("syncTargets", host) });
        siteRows.push(rowEl(host, chips));
      }
      siteRows.sort((a, b) => (a.firstChild!.textContent || "").localeCompare(b.firstChild!.textContent || ""));

      // --- Channels -----------------------------------------------------------
      const chanRows: HTMLElement[] = [];
      for (const key of new Set([...Object.keys(channels), ...Object.keys(chanDelays)])) {
        const chips: Chip[] = [];
        if (channels[key] != null) chips.push({ label: pct(channels[key]), onDelete: () => deleteFromMap("channels", key) });
        if (chanDelays[key] != null) chips.push({ label: secs(chanDelays[key]), onDelete: () => deleteFromMap("syncTargetChannels", key) });
        chanRows.push(rowEl(prettyChannel(key), chips));
      }
      chanRows.sort((a, b) => (a.firstChild!.textContent || "").localeCompare(b.firstChild!.textContent || ""));

      const el = root();
      el.textContent = "";
      el.append(
        groupEl("optSavedGlobal", globalRows),
        groupEl("optSavedSites", siteRows),
        groupEl("optSavedChannels", chanRows),
      );
    },
  );
}

export function initSaved(): void {
  render();
}
