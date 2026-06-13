import { MIN_SPEED, MAX_SPEED } from "./constants.js";

export function clamp(speed: number): number {
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, Math.round(speed * 100) / 100));
}

export function clampTarget(n: unknown): number {
  const v = Number(n);
  if (Number.isNaN(v)) return 5;
  // Floor of 1s: a 0s target means perpetual catch-up that just drains the buffer.
  return Math.min(30, Math.max(1, Math.round(v)));
}

// The allowed-delay (seconds) for a domain: its per-site value if set, else the
// legacy global value (kept as a migration fallback), else the 5s default.
export function resolveTarget(
  targets: Record<string, number> | undefined,
  domain: string,
  legacy?: unknown,
): number {
  const per = targets ? targets[domain] : undefined;
  return clampTarget(per != null ? per : legacy);
}

export function clampNum(v: unknown, lo: number, hi: number, def: number): number {
  const n = Number(v);
  if (Number.isNaN(n)) return def;
  return Math.min(hi, Math.max(lo, n));
}
