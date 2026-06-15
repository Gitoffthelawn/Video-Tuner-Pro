// General-card pickers: theme applies live; language saves and reloads the page.
import { STORE } from "../shared/store.js";
import { THEMES, type Theme, setTheme } from "../shared/theme.js";
import { LOCALES, LOCALE_NAMES, getLang, setLang, type Lang } from "../shared/i18n-config.js";
import { msg } from "../popup/i18n.js";

const THEME_LABEL: Record<Theme, string> = {
  system: "themeSystem",
  light: "themeLight",
  dark: "themeDark",
};

function buildThemeSeg(current: Theme): void {
  const seg = document.getElementById("themeSeg") as HTMLElement;
  seg.textContent = "";
  const btns: Partial<Record<Theme, HTMLButtonElement>> = {};
  for (const t of THEMES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "seg-btn";
    b.textContent = msg(THEME_LABEL[t]) || t;
    b.classList.toggle("is-active", t === current);
    b.addEventListener("click", () => {
      setTheme(t);
      for (const k of THEMES) btns[k]!.classList.toggle("is-active", k === t);
    });
    btns[t] = b;
    seg.append(b);
  }
}

// Language as a grid of buttons — same look as the theme control, more options.
function buildLangGrid(current: Lang): void {
  const grid = document.getElementById("langGrid") as HTMLElement;
  grid.textContent = "";
  const options: Array<[Lang, string]> = [["system", msg("langSystem") || "System"]];
  for (const code of LOCALES) options.push([code, LOCALE_NAMES[code]]);
  for (const [value, label] of options) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "seg-btn";
    b.textContent = label;
    b.classList.toggle("is-active", value === current);
    b.addEventListener("click", () => setLang(value, () => location.reload()));
    grid.append(b);
  }
}

export function initAppearance(): void {
  STORE.get(["theme"], (r) => buildThemeSeg((r.theme as Theme) || "system"));
  getLang((lang) => buildLangGrid(lang));
}
