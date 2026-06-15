// Editable speed presets — the eight values behind the popup's preset grid and
// the Shift+1…8 keyboard shortcuts. Stored once (key "speedPresets", as integer
// percents) so the grid and the hotkeys stay in lockstep. Pure + unit-tested.

export const PRESET_COUNT = 8;
// Match the popup speed slider's domain/step so a preset always lands on a value
// the slider can show.
export const PRESET_MIN = 25;
export const PRESET_MAX = 300;
const STEP = 5;

// The shipped defaults — same eight values the popup grid used before they were
// made editable.
export const DEFAULT_PRESETS: number[] = [50, 75, 100, 125, 150, 175, 200, 250];

function clampPct(v: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback;
  const stepped = Math.round(v / STEP) * STEP;
  return Math.min(PRESET_MAX, Math.max(PRESET_MIN, stepped));
}

// Coerce stored/user input into exactly PRESET_COUNT clean, sorted percents.
// Missing or invalid slots fall back to the default at that position.
export function normalizePresets(raw: unknown): number[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: number[] = [];
  for (let i = 0; i < PRESET_COUNT; i++) {
    out.push(clampPct(Number(arr[i]), DEFAULT_PRESETS[i]));
  }
  return out.sort((a, b) => a - b);
}

// As playback-rate fractions (e.g. 1.5), for the content script.
export function presetFractions(raw: unknown): number[] {
  return normalizePresets(raw).map((p) => p / 100);
}
