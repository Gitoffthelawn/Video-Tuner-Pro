// Export/import all settings as JSON. The device-only sync-config meta is left
// out so a backup carries portable settings, not this device's sync choices.
import { STORE } from "../shared/store.js";
import { SYNC_META_KEY } from "../shared/sync-config.js";
import { msg } from "../popup/i18n.js";

const FILE = "video-tuner-pro-settings.json";

function status(text: string): void {
  const el = document.getElementById("backupMsg");
  if (el) el.textContent = text;
}

function exportSettings(): void {
  STORE.get(null, (all) => {
    const data: Record<string, unknown> = { ...all };
    delete data[SYNC_META_KEY];
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = FILE;
    a.click();
    URL.revokeObjectURL(url);
    status(msg("optExportDone") || "Exported.");
  });
}

function importSettings(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    let parsed: unknown;
    try { parsed = JSON.parse(String(reader.result)); }
    catch { status(msg("optImportError") || "Couldn't read that file."); return; }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      status(msg("optImportError") || "Couldn't read that file.");
      return;
    }
    const data = { ...(parsed as Record<string, unknown>) };
    delete data[SYNC_META_KEY]; // never import another device's sync choices
    STORE.set(data, () => {
      status(msg("optImportDone") || "Imported.");
      // Re-read everything cleanly with the freshly imported values.
      setTimeout(() => location.reload(), 400);
    });
  };
  reader.readAsText(file);
}

export function initBackup(): void {
  document.getElementById("exportBtn")!.addEventListener("click", exportSettings);
  const fileInput = document.getElementById("importFile") as HTMLInputElement;
  document.getElementById("importBtn")!.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const f = fileInput.files?.[0];
    if (f) importSettings(f);
    fileInput.value = "";
  });
}
