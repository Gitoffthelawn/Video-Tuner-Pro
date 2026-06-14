// Selective-sync controls: a master switch in the card header over a per-category
// list. The master switch turns cross-device sync off entirely (everything stays
// on this device); each category switch routes that group between sync and local.
import { getSyncConfig, getSyncMaster, setCategorySync, setMasterSync } from "../shared/store.js";
import { CATEGORIES, type Category, type SyncConfig } from "../shared/sync-config.js";
import { msg } from "../popup/i18n.js";

// i18n keys per category: a label and a one-line description of what it covers.
const LABEL_KEY: Record<Category, string> = {
  speeds: "catSpeeds",
  delays: "catDelays",
  audio: "catAudio",
  shortcuts: "catShortcuts",
  general: "catGeneral",
};
const DESC_KEY: Record<Category, string> = {
  speeds: "catSpeedsDesc",
  delays: "catDelaysDesc",
  audio: "catAudioDesc",
  shortcuts: "catShortcutsDesc",
  general: "catGeneralDesc",
};

// A bare on/off switch (the popup look); returns it plus its checkbox to wire up.
function switchEl(on: boolean): { wrap: HTMLElement; input: HTMLInputElement } {
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
  return { wrap: sw, input };
}

function catRow(cat: Category, on: boolean): HTMLInputElement {
  const row = document.createElement("div");
  row.className = "sync-cat-row";

  const text = document.createElement("div");
  text.className = "sync-cat-text";
  const label = document.createElement("span");
  label.className = "sync-cat-label";
  label.textContent = msg(LABEL_KEY[cat]) || cat;
  const desc = document.createElement("span");
  desc.className = "sync-cat-desc";
  desc.textContent = msg(DESC_KEY[cat]);
  text.append(label, desc);

  const { wrap, input } = switchEl(on);
  input.addEventListener("change", () => setCategorySync(cat, input.checked));
  row.append(text, wrap);
  (document.getElementById("syncRows") as HTMLElement).append(row);
  return input;
}

export function initSync(): void {
  const cfg: SyncConfig = getSyncConfig();
  const master = getSyncMaster();

  const rows = document.getElementById("syncRows") as HTMLElement;
  rows.textContent = "";
  const inputs = CATEGORIES.map((cat) => catRow(cat, cfg[cat]));

  // Master off → everything's local; dim and disable the per-category switches.
  const applyMaster = (on: boolean) => {
    rows.classList.toggle("is-off", !on);
    for (const i of inputs) i.disabled = !on;
  };

  const mount = document.getElementById("syncMaster") as HTMLElement;
  mount.textContent = "";
  const m = switchEl(master);
  m.input.addEventListener("change", () => {
    setMasterSync(m.input.checked);
    applyMaster(m.input.checked);
  });
  mount.append(m.wrap);

  applyMaster(master);
}
