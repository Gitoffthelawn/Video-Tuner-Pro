// The current YouTube channel, as a stable key for the per-channel speed memory.
// DOM-only: the owner link under a watch-page player carries the canonical
// channel URL (/@handle or /channel/UC…); either form is a stable identifier.
// Returns null off a YouTube watch page or before the owner link has rendered.
const OWNER_SEL = [
  "ytd-video-owner-renderer a.yt-simple-endpoint",
  "ytd-channel-name a.yt-simple-endpoint",
  "#owner #channel-name a",
  "#upload-info #channel-name a",
].join(",");

export function currentChannel(): string | null {
  const h = window.location.hostname;
  if (!/(^|\.)(youtube\.com|youtube-nocookie\.com)$/i.test(h)) return null;
  if (window.location.pathname !== "/watch") return null;
  const a = document.querySelector<HTMLAnchorElement>(OWNER_SEL);
  const href = a?.getAttribute("href") || "";
  const m = href.match(/\/(@[A-Za-z0-9._-]+|channel\/UC[A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
