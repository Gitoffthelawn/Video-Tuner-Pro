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
  for (const r of rows) g.append(r);
  return g;
}

// A top-level category (speeds / delays): its title, its non-empty scope groups
// (or one "nothing saved" line), and a Reset that forgets everything in it — a
// full button in a footer row, matching the Reset blocks on the other cards.
function catEl(titleKey: string, onReset: () => void, groups: Array<[string, HTMLElement[]]>): HTMLElement {
  const cat = document.createElement("div");
  cat.className = "saved-cat";

  const title = document.createElement("div");
  title.className = "saved-cat-title";
  title.textContent = msg(titleKey) || titleKey;
  cat.append(title);

  const filled = groups.filter(([, rows]) => rows.length);
  if (filled.length) {
    for (const [k, rows] of filled) cat.append(groupEl(k, rows));
    const actions = document.createElement("div");
    actions.className = "card-actions";
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "btn-action btn-reset";
    reset.textContent = msg("optResetDefaults") || "Reset to defaults";
    reset.addEventListener("click", onReset);
    actions.append(reset);
    cat.append(actions);
  } else {
    const empty = document.createElement("div");
    empty.className = "saved-empty";
    empty.textContent = msg("optSavedEmpty") || "Nothing saved yet.";
    cat.append(empty);
  }
  return cat;
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

      const globalName = msg("scopeGlobal") || "Global";
      const byName = (a: HTMLElement, b: HTMLElement) =>
        (a.firstChild!.textContent || "").localeCompare(b.firstChild!.textContent || "");

      // One row per scoped value, with a single remove chip. Speeds and delays are
      // kept in separate categories so each value's meaning is unambiguous.
      const speedGlobal = globalSpeed != null
        ? [rowEl(globalName, [{ label: pct(globalSpeed), onDelete: () => STORE.remove("globalSpeed", render) }])] : [];
      const speedSites = Object.keys(domains)
        .map((host) => rowEl(host, [{ label: pct(domains[host]), onDelete: () => deleteFromMap("domains", host) }]))
        .sort(byName);
      const speedChans = Object.keys(channels)
        .map((key) => rowEl(prettyChannel(key), [{ label: pct(channels[key]), onDelete: () => deleteFromMap("channels", key) }]))
        .sort(byName);

      const delayGlobal = globalDelay != null
        ? [rowEl(globalName, [{ label: secs(globalDelay), onDelete: () => STORE.remove(["syncTargetGlobal", "liveSyncTarget"], render) }])] : [];
      const delaySites = Object.keys(siteDelays)
        .map((host) => rowEl(host, [{ label: secs(siteDelays[host]), onDelete: () => deleteFromMap("syncTargets", host) }]))
        .sort(byName);
      const delayChans = Object.keys(chanDelays)
        .map((key) => rowEl(prettyChannel(key), [{ label: secs(chanDelays[key]), onDelete: () => deleteFromMap("syncTargetChannels", key) }]))
        .sort(byName);

      const el = root();
      el.textContent = "";
      el.append(
        catEl("catSpeeds", () => STORE.remove(["globalSpeed", "domains", "channels"], render), [
          ["optSavedGlobal", speedGlobal],
          ["optSavedSites", speedSites],
          ["optSavedChannels", speedChans],
        ]),
        catEl("catDelays", () => STORE.remove(["syncTargetGlobal", "liveSyncTarget", "syncTargets", "syncTargetChannels"], render), [
          ["optSavedGlobal", delayGlobal],
          ["optSavedSites", delaySites],
          ["optSavedChannels", delayChans],
        ]),
      );
    },
  );
}

export function initSaved(): void {
  render();
}
