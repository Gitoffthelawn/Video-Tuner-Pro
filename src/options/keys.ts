// Keyboard-shortcut editor: click an action's key, then press the new one. Stores
// KeyboardEvent.code values under "keymap"; the content listener picks it up live.
import { STORE } from "../shared/store.js";
import {
  normalizeKeymap, DEFAULT_KEYMAP, isBindableCode, codeLabel,
  ACTIONS, type Action, type Keymap,
} from "../shared/keymap.js";
import { msg } from "../popup/i18n.js";

let current: Keymap = { ...DEFAULT_KEYMAP };
let capturing: Action | null = null;

const caps = () => Array.from(document.querySelectorAll<HTMLButtonElement>(".key-cap"));
const btnFor = (a: Action) => document.querySelector<HTMLButtonElement>(`.key-cap[data-action="${a}"]`)!;

function paint(): void {
  for (const b of caps()) {
    const a = b.dataset.action as Action;
    b.classList.toggle("capturing", capturing === a);
    b.textContent = capturing === a ? (msg("optKeyPress") || "Press a key…") : codeLabel(current[a]);
  }
}

function reject(a: Action): void {
  const b = btnFor(a);
  b.classList.add("dupe");
  setTimeout(() => { b.classList.remove("dupe"); paint(); }, 600);
}

function onKey(e: KeyboardEvent): void {
  if (!capturing) return;
  e.preventDefault();
  e.stopPropagation();
  if (e.code === "Escape") { capturing = null; paint(); return; }
  if (!isBindableCode(e.code)) { reject(capturing); return; }
  if (ACTIONS.some((a) => a !== capturing && current[a] === e.code)) { reject(capturing); return; }
  current = { ...current, [capturing]: e.code };
  capturing = null;
  STORE.set({ keymap: current });
  paint();
}

export function initKeys(): void {
  STORE.get(["keymap"], (r) => { current = normalizeKeymap(r.keymap); paint(); });
  for (const b of caps()) {
    b.addEventListener("click", () => { capturing = b.dataset.action as Action; paint(); });
  }
  document.addEventListener("keydown", onKey, true);
  document.getElementById("keyResetBtn")!.addEventListener("click", () => {
    current = { ...DEFAULT_KEYMAP };
    capturing = null;
    STORE.set({ keymap: current });
    paint();
  });
}
