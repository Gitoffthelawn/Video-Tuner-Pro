# Video Tuner Pro

A cross-browser (Chrome + Firefox) toolkit for better video on any website:
playback-speed control, smart live-stream sync, and audio compression to even out
loud and quiet sounds — with live monitoring graphs, an on-video readout, and
light & dark themes. No accounts, no analytics, no network.

## Install

- **Chrome / Edge / Brave:** [Chrome Web Store](https://chromewebstore.google.com/detail/video-tuner-pro/ichlipldofdemkhlhnoekfkpfejfanno)
- **Firefox:** [Firefox Add-ons](https://addons.mozilla.org/ru/firefox/addon/video-tuner-pro/)

## Features

- **Playback speed** on virtually any site with HTML5 `<video>`, including videos inside embedded frames — one-click presets plus a fine slider.
- **Per-site memory** — set a speed and click *Remember site* to keep it for that domain. Sites you haven't remembered play at 100%.
- **Smart live-stream handling** — manual speed is never applied to a live stream; the buffer is protected.
- **Live-sync** — optional mode that catches a live stream back up to the live edge at a steady catch-up speed, then returns to 100%.
- **Audio compression** — optional Web-Audio dynamics compressor that evens out loud and quiet passages, with full controls (threshold, knee, ratio, attack, release, make-up gain) and a reset to defaults.
- **Live graphs** — real-time before/after audio level meter (with peak-hold) and a live-stream buffer graph, right in the popup.
- **On-video readout** — optional badge showing the current speed and the real remaining time; appears on mouse-move over the video and fades out. On YouTube it respects SponsorBlock's "duration after skips" when available.
- **Light & dark themes** that follow the system, and **10 languages**: English, Russian, Ukrainian, Spanish, Portuguese (BR), German, French, Chinese (Simplified), Japanese, Hindi.
- **No accounts, no analytics, no network requests** — all settings stay on your device (synced via the browser's own profile sync).

## Usage

1. Open a page with a video and click the extension icon.
2. Drag the slider or pick a preset to change the speed — it applies to the current tab immediately. The toolbar badge shows the active speed.
3. Click **Remember site** to save the current speed for this domain.

The next time you visit a remembered site, its saved speed is applied automatically. Sites without a saved speed default to 100%.

The **Audio compression** and **Live-sync** sections are collapsed by default — expand a section to reach its controls and graphs. Turn on **Show speed & time on video** to get the on-video readout.

## Live streams

On a live stream (YouTube Live, Twitch, etc.) the **manual speed controls are
disabled** — presets and the slider don't affect the broadcast. The stream plays
at 100% and only **Live-sync** governs its speed.

Live detection is generic (no per-site hardcoding): a stream is recognized when
its media edge advances in real time, which also covers players that don't report
an infinite duration (e.g. Twitch low-latency).

### Live-sync

Toggle it on in the popup; it then runs in the background for any live stream:

- It tracks how far playback has drifted behind the live edge (from the buffered-ahead amount, which is reliable across players).
- If you fall behind by more than the **allowed delay** — after a pause, a stall, or a backgrounded tab — it switches to a **fixed catch-up speed** until it reaches the live edge, then returns to **100%**.
- The speed changes only at the start and end of catch-up (not continuously), so the audio stays clean while catching up. It backs off if frames start dropping.
- A live **buffer graph** in the popup shows the buffer-ahead over time against your target.

Settings (in the popup):

- **Allowed delay** — `0–15s`, default **3s**. How far behind the live edge to tolerate.
- **Catch-up speed** — `125%–300%`, default **150%**. The fixed speed used to catch up.

## Audio compression

An optional Web-Audio `DynamicsCompressorNode` plus a make-up `GainNode`, applied
to the page's media. Global setting; controls map to the raw compressor params
(threshold, knee, ratio, attack, release) with defaults modelled on FrankerFaceZ,
plus make-up gain and a reset button. A before/after level meter (with peak-hold)
shows the effect live.

Limitation: routing media through Web Audio silences cross-origin media served
without CORS, so compression only engages where it's safe (MSE/blob, same-origin,
or CORS-enabled). If another extension or the player already captured the audio,
the extension reports it and leaves the audio untouched.

## How it works

- A **content script** (`content.js`) applies the speed to every `<video>` (piercing open shadow roots), re-applies it only when the player resets it, runs the live-stream detection and Live-sync, builds the audio-compression graph, feeds the popup's live graphs, and draws the on-video readout.
- The **popup** (`popup/`) holds all controls — speed, Live-sync, audio compression — and renders the live meters/graphs.
- The **background service worker** (`background.js`) draws the toolbar badge (the active speed) and swaps to a red "live" icon on streams, clears it on navigation, and does a one-time migration of existing settings into synced storage.
- Settings live in `storage.sync` (Chrome Sync / Firefox Sync, falling back to local) — per-domain speeds, Live-sync, audio compression and display options. No data ever leaves the browser's own sync.

## Project layout

```
manifest.json              Manifest V3 config (Chrome + Firefox)
content.js                 Speed, live detection/Live-sync, audio graph, on-video badge
background.js              Toolbar badge/icon + settings migration
popup/
  ├── popup.html           Popup UI (Native style, light/dark)
  └── popup.js             Popup logic, live graphs, i18n wiring
_locales/<lang>/messages.json   Translations (10 languages)
icons/                     PNG icons (normal + red "live" set, 16/32/48/96/128)
generate_icons.py          Helper that generates the PNG icons
PRIVACY.md                 Privacy policy
.github/workflows/release.yml   Builds the store packages on each GitHub Release
```

## Building / development

No build step — load the unpacked folder directly:

- **Chrome:** `chrome://extensions` → enable *Developer mode* → *Load unpacked* → select this folder.
- **Firefox:** `about:debugging` → *This Firefox* → *Load Temporary Add-on* → select `manifest.json`.

Store-ready packages are produced automatically: publishing a GitHub Release runs
[`.github/workflows/release.yml`](.github/workflows/release.yml), which validates
the JSON/JS and locale-key consistency, then builds a Chrome zip (Firefox-only
manifest keys stripped, background as a service worker) and a Firefox zip
(background as event-page scripts), and attaches both to the release. No store
credentials are stored in CI.

## Privacy

The extension collects no data and makes no network requests. See [PRIVACY.md](PRIVACY.md).

## License

Free to use. © slonick.dev — all rights reserved.
