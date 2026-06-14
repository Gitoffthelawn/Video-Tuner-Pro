// Speed-presets editor: eight number inputs, normalized (clamped, snapped to the
// 5% step, sorted) on save. Writes the shared "speedPresets" key, so the popup
// grid and the Shift+1…8 shortcuts pick it up.
import { STORE } from "../shared/store.js";
import { normalizePresets, DEFAULT_PRESETS, PRESET_COUNT, PRESET_MIN, PRESET_MAX } from "../shared/presets.js";
import { msg } from "../popup/i18n.js";

const grid = () => document.getElementById("presetEdit") as HTMLElement;

function render(values: number[]): void {
  const g = grid();
  g.textContent = "";
  for (let i = 0; i < PRESET_COUNT; i++) {
    const cell = document.createElement("label");
    cell.className = "preset-cell";
    const input = document.createElement("input");
    input.type = "number";
    input.min = String(PRESET_MIN);
    input.max = String(PRESET_MAX);
    input.step = "5";
    input.value = String(values[i]);
    const pct = document.createElement("span");
    pct.className = "pct";
    pct.textContent = "%";
    cell.append(input, pct);
    g.append(cell);
  }
}

function collect(): number[] {
  return Array.from(grid().querySelectorAll<HTMLInputElement>("input")).map((inp) => Number(inp.value));
}

function flashSaved(btn: HTMLElement): void {
  const original = btn.textContent;
  btn.textContent = msg("savedFeedback") || "✓ Saved";
  setTimeout(() => { btn.textContent = original; }, 1500);
}

export function initPresets(): void {
  STORE.get(["speedPresets"], (r) => render(normalizePresets(r.speedPresets)));

  document.getElementById("presetSaveBtn")!.addEventListener("click", (e) => {
    const norm = normalizePresets(collect());
    STORE.set({ speedPresets: norm });
    render(norm);
    flashSaved(e.currentTarget as HTMLElement);
  });

  document.getElementById("presetResetBtn")!.addEventListener("click", () => {
    STORE.set({ speedPresets: DEFAULT_PRESETS });
    render([...DEFAULT_PRESETS]);
  });
}
