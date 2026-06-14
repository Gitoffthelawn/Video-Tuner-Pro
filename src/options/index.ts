// Options page entry. Localize the static markup, then build each section once
// the selective-sync config has loaded (so it reads/writes the right areas).
import { localize } from "../popup/i18n.js";
import { whenReady } from "../shared/store.js";
import { initPresets } from "./presets.js";
import { initKeys } from "./keys.js";
import { initSaved } from "./saved.js";
import { initSync } from "./sync.js";
import { initBackup } from "./backup.js";

localize();
whenReady(() => {
  initPresets();
  initKeys();
  initSaved();
  initSync();
  initBackup();
});
