// Popup header: title + version, the gear that opens the options page, and the
// Ko-fi link.
import { api } from "../platform/browser.js";
import { msg } from "../i18n.js";
import { GearIcon, KofiIcon } from "../icons.js";
import { IconButton } from "../../ui/IconButton.js";

export function Header() {
  const version = api.runtime.getManifest().version;
  // In the toolbar popup (the top document) openOptionsPage() works directly. In the
  // on-video overlay the popup is an embedded iframe, where that call is a no-op on
  // Firefox — so ask the background to open it instead (see background/index.ts).
  const openSettings = () => {
    if (window.top === window) {
      api.runtime.openOptionsPage();
    } else {
      const p = api.runtime.sendMessage({ action: "openOptions" }) as Promise<unknown> | undefined;
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  };
  return (
    <div className="header">
      <h1>
        <span>{msg("appHeader")}</span>
        <span className="pro-badge">PRO</span>
        <span className="version" id="extVersion">
          {"v" + version}
        </span>
      </h1>
      <div className="header-actions">
        <IconButton
          className="icon-btn"
          id="openOptions"
          aria-label="Settings"
          title={msg("optHeader")}
          onClick={openSettings}
        >
          <GearIcon />
        </IconButton>
        <a
          className="kofi"
          href="https://ko-fi.com/slonick"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Support the project on Ko-fi"
          title="Support the project ☕"
        >
          <KofiIcon />
        </a>
      </div>
    </div>
  );
}
