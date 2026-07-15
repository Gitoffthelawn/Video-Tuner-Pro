// @vitest-environment node
// The popup platform module is intentionally a thin adapter over the shared
// selective-sync store. Keep one direct wiring assertion so a refactor cannot
// silently leave popup imports bound to a stale/second store instance.
import { describe, expect, it } from "vitest";
import {
  STORE as popupStore,
  whenReady as popupWhenReady,
  subscribe as popupSubscribe,
} from "../src/popup/platform/storage.js";
import {
  STORE as sharedStore,
  whenReady as sharedWhenReady,
  subscribe as sharedSubscribe,
} from "../src/shared/store.js";

describe("popup storage adapter", () => {
  it("re-exports the shared store API without creating a second store", () => {
    expect(popupStore).toBe(sharedStore);
    expect(popupWhenReady).toBe(sharedWhenReady);
    expect(popupSubscribe).toBe(sharedSubscribe);
  });
});
