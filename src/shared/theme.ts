// Theme preference shared by the popup and options pages. "system" follows the OS
// (the prefers-color-scheme rules in tokens.css); "light"/"dark" force a palette
// via a data-theme attribute on <html> that those rules key off. The on-video
// badge is numbers-only and self-styled, so it isn't themed.
import { STORE } from "./store.js";

export type Theme = "system" | "light" | "dark";
export const THEMES: Theme[] = ["system", "light", "dark"];

export function applyTheme(theme: Theme): void {
  const el = document.documentElement;
  if (theme === "light" || theme === "dark") el.dataset.theme = theme;
  else delete el.dataset.theme;
}

// Read the saved theme and apply it. Called as early as possible on each page to
// keep the flash from the default (system) palette short.
export function initTheme(): void {
  STORE.get(["theme"], (r) => applyTheme((r.theme as Theme) || "system"));
}

export function setTheme(theme: Theme): void {
  applyTheme(theme);
  STORE.set({ theme });
}
