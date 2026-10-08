// The per-site kill switch card. It's always rendered (so the popup height doesn't
// jump while the tab resolves) and doubles as the notice once the site is off.
import { msg } from "../i18n.js";
import { Switch } from "../../ui/Switch.js";

interface Props {
  domain: string;
  // The stored entry switching this site off (its own or a parent's), else null.
  rule: string | null;
  onChange: (off: boolean) => void;
}

export function SiteToggle({ domain, rule, onChange }: Props) {
  const off = rule !== null;
  const label = msg("siteOffLabel") || "Disable on this site";
  const sub =
    rule !== null
      ? msg("siteOffNotice", rule) || `Video Tuner is off on ${rule} and its subdomains.`
      : domain
        ? msg("siteOffHint", domain) || `Turns everything off on ${domain} and its subdomains.`
        : "—";

  return (
    <div className="sync-section site-off">
      <div className="sec-head">
        <span className="sec-text">
          <strong>{label}</strong>
          <span className="switch-sub">{sub}</span>
        </span>
        <Switch
          id="siteOffToggle"
          checked={off}
          ariaLabel={label}
          disabled={!domain}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
