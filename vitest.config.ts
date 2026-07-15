import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Default to fast Node env; DOM-touching tests opt in per-file with
    //   // @vitest-environment jsdom
    environment: "node",
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],

    coverage: {
      provider: "v8",
      // Measure every source file, not just the ones a test happens to import —
      // so a new untested module actually shows up (and can fail the gate) instead
      // of silently not counting.
      all: true,
      // Gate every production TypeScript module, including React UI, browser entry
      // points and canvas graphs. The previous selective list hid real 0%-covered
      // code (page-bridge and all three graph renderers) behind a healthy-looking
      // aggregate. Stories and declarations are not shipped runtime behaviour.
      include: ["src/**/*.{ts,tsx}"],
      // These files intentionally emit no runtime JavaScript: the audio
      // contracts and popup scope aliases are type-only declarations. Counting
      // their erased lines as uncovered would reward a meaningless import-only
      // test instead of measuring shipped behavior.
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.stories.tsx",
        "src/types/**",
        "src/content/audio/types.ts",
        "src/popup/lib/scope.ts",
        "src/popup/platform/storage.ts",
      ],
      reporter: ["text", "text-summary", "html", "json-summary"],
      // CI now fails against the honest all-production baseline. Keep a small
      // cross-Node margin below the measured 86.7/76.1/89.9/89.9%; raising coverage
      // means raising these floors, never adding functional files to `exclude`.
      thresholds: {
        statements: 86,
        branches: 75,
        functions: 89,
        lines: 89,
      },
    },
  },
});
