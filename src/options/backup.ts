// Export/import all settings as JSON. The device-only sync-config meta is left
// out so a backup carries portable settings, not this device's sync choices.
import { STORE } from "../shared/store.js";
import { SYNC_META_KEY } from "../shared/sync-config.js";
import { msg } from "../popup/i18n.js";

const FILE = "video-tuner-pro-settings.json";

// Briefly turn a button green (or red) with a confirming label, then restore it —
// the section's only feedback, so there's no status text under the buttons.
function flash(btn: HTMLButtonElement, key: string, ok: boolean): void {
  const orig = btn.textContent;
  btn.textContent = msg(key) || key;
  btn.classList.add(ok ? "btn-ok" : "btn-err");
  setTimeout(() => {
    btn.classList.remove("btn-ok", "btn-err");
    btn.textContent = orig;
  }, 1500);
}

function exportSettings(btn: HTMLButtonElement): void {
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
    flash(btn, "optExportDone", true);
  });
}

function importSettings(file: File, btn: HTMLButtonElement): void {
  const reader = new FileReader();
  reader.onload = () => {
    let parsed: unknown;
    try { parsed = JSON.parse(String(reader.result)); }
    catch { flash(btn, "optImportError", false); return; }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      flash(btn, "optImportError", false);
      return;
    }
    const data = { ...(parsed as Record<string, unknown>) };
    delete data[SYNC_META_KEY]; // never import another device's sync choices
    STORE.set(data, () => {
      flash(btn, "optImportDone", true);
      // Re-read everything cleanly with the freshly imported values, after the
      // green flash has had a moment to register.
      setTimeout(() => location.reload(), 1000);
    });
  };
  reader.readAsText(file);
}

export function initBackup(): void {
  const exportBtn = document.getElementById("exportBtn") as HTMLButtonElement;
  const importBtn = document.getElementById("importBtn") as HTMLButtonElement;
  const fileInput = document.getElementById("importFile") as HTMLInputElement;
  exportBtn.addEventListener("click", () => exportSettings(exportBtn));
  importBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const f = fileInput.files?.[0];
    if (f) importSettings(f, importBtn);
    fileInput.value = "";
  });
}
