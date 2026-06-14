// Selective-sync controls: a switch per category. Flipping one migrates that
// category's keys between chrome.storage.sync and .local (see shared/store).
import { getSyncConfig, setCategorySync } from "../shared/store.js";
import { CATEGORIES, type Category, type SyncConfig } from "../shared/sync-config.js";
import { msg } from "../popup/i18n.js";

// i18n key per category label.
const LABEL_KEY: Record<Category, string> = {
  speeds: "catSpeeds",
  delays: "catDelays",
  audio: "catAudio",
  shortcuts: "catShortcuts",
  presets: "catPresets",
  general: "catGeneral",
};

function row(cat: Category, on: boolean): HTMLElement {
  const row = document.createElement("div");
  row.className = "sync-cat-row";

  const label = document.createElement("span");
  label.className = "sync-cat-label";
  label.textContent = msg(LABEL_KEY[cat]) || cat;

  const sw = document.createElement("label");
  sw.className = "switch";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "switch-input";
  input.checked = on;
  const track = document.createElement("span");
  track.className = "switch-track";
  const knob = document.createElement("span");
  knob.className = "switch-knob";
  track.append(knob);
  sw.append(input, track);
  input.addEventListener("change", () => setCategorySync(cat, input.checked));

  row.append(label, sw);
  return row;
}

export function initSync(): void {
  const cfg: SyncConfig = getSyncConfig();
  const root = document.getElementById("syncRows") as HTMLElement;
  root.textContent = "";
  for (const cat of CATEGORIES) root.append(row(cat, cfg[cat]));
}
