<p align="center">
  <img src="icon.png" width="96" alt="Nintendo Music PC">
</p>

<h1 align="center">Nintendo Music PC</h1>

<p align="center">
  An <b>unofficial</b> desktop client for <a href="https://music.nintendo.com/">Nintendo Music</a>, built with Electron.<br>
  Discord Rich Presence, a full settings panel, telemetry blocking, custom themes and an optional site redesign.
</p>

<p align="center">
  <img alt="platform" src="https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-blue">
  <img alt="electron" src="https://img.shields.io/badge/Electron-42%20(Castlabs%2FWidevine)-9feaf9">
  <img alt="languages" src="https://img.shields.io/badge/UI-6%20languages-brightgreen">
  <img alt="status" src="https://img.shields.io/badge/status-unofficial-orange">
</p>

---

> [!IMPORTANT]
> This project is not developed, endorsed by, or affiliated with Nintendo Co., Ltd. or any of its subsidiaries. It is a third-party client that displays the official [music.nintendo.com](https://music.nintendo.com/) website in an Electron window and adds convenience features on top. A Nintendo Account with an active **Nintendo Switch Online** subscription is still required to play any music, exactly as on the official website.

## Contents

- [Features](#features)
- [Installation](#installation)
- [Building from source](#building-from-source)
- [Settings](#settings)
  - [Performance](#performance)
  - [Privacy](#privacy)
  - [Redesign](#redesign)
  - [Themes](#themes)
  - [Language](#language)
- [Discord Rich Presence](#discord-rich-presence)
- [Theme editor](#theme-editor)
- [Menus and tray](#menus-and-tray)
- [Where settings are stored](#where-settings-are-stored)
- [How the optimisations were chosen](#how-the-optimisations-were-chosen)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)
- [Contributing](#contributing)
- [Credits](#credits)

## Features

### Playback and compatibility
- **Native Widevine DRM support** through the [Castlabs](https://github.com/castlabs/electron-releases) Electron build, which avoids the fatal `9012-4001` error you get with a standard Electron.
- **Single instance** — launching the app again brings the existing window to the front instead of starting a second process.
- **Isolated session** (`persist:nintendoMusic`) with a custom User-Agent.
- **Global media keys** — the Play/Pause key works even when the app is in the background.
- **Tray integration** — closing the window keeps playback and Rich Presence running in the background.

### Startup and loading
- **Instant splash screen**, rendered locally and shown *before* Widevine initialisation, which was previously dead time where nothing appeared on screen.
- **Custom loading screen** replacing the site's three dots: a five-bar equaliser in your theme's accent colour, with rotating trivia at the bottom about Nintendo and about what was actually measured on the site. Both parts can be switched off independently.
- **Network preconnect** to every origin used at startup, including the artwork CDN (`image-assets.m.nintendo.com`, 88 requests on the home page alone) and the BaaS authentication gateway.
- **Page caching** — the site sends `max-age=0` on its HTML, so pages were re-downloaded from the network on every single launch. The client rewrites the cache headers for documents and navigation payloads only. API responses, tokens and authentication are never cached.

### Privacy
- **Granular telemetry blocking** with a live counter of blocked requests:
  - Nintendo BaaS analytics (`bigdata/v1/analytics/*`) — 13 requests per page load
  - Google Pub/Sub analytics events — 15 requests per page load
  - Google Analytics
  - Sentry error reporting
- Authentication endpoints on the same domains (`core/v1/*`) are deliberately left untouched.
- **Discord private mode** hides the current track without turning Rich Presence off entirely.

### Appearance
- **12 built-in themes**: Dark, Light, Deep Purple, Crimson, Ocean, Forest, Amber, Rose, Nord, Dracula, Gruvbox, Monochrome.
- **Theme editor** for building your own palettes or injecting raw CSS, with import/export.
- **Optional site redesign**, all switches reversible instantly:
  - Density control — the site leaves 48 px between cards; compact mode fits noticeably more on screen
  - Fixes stretched artwork (the site uses `object-fit: fill` on non-square images)
  - Adjustable artwork corner radius, hover effects, sticky section headers, restyled scrollbar, custom accent colour
- **9 border radius presets** and an always-on-top toggle.

### Interface
- **Settings window** (`Ctrl+,`) with seven sections and three one-click performance presets.
- **6 UI languages**: English, French, Spanish, German, Italian, Japanese.

## Installation

Every platform is built automatically and attached to the [Releases](../../releases) page. A Nintendo Account with an active Nintendo Switch Online subscription is required to play anything.

| Platform | File |
|---|---|
| Windows | `setup.exe` |
| Linux | `Nintendo.Music-<version>.AppImage` |
| macOS (Apple Silicon) | `Nintendo.Music-<version>-arm64.dmg` |
| macOS (Intel) | `Nintendo.Music-<version>.dmg` |

**Linux** — make the AppImage executable, then run it:

```bash
chmod +x Nintendo.Music-*.AppImage && ./Nintendo.Music-*.AppImage
```

**macOS** — the builds are unsigned, so on first launch right-click the app and choose *Open* to get past Gatekeeper.

### Arch Linux

An AUR package is prepared but not yet published, because [AUR account registration is temporarily closed](https://aur.archlinux.org/register) while Arch deals with a wave of automated account creation. In the meantime the PKGBUILD in this repository works directly:

```bash
git clone https://github.com/Axolat000/Unofficial-Nintendo-Music-client.git
```

```bash
cd Unofficial-Nintendo-Music-client/packaging/aur && makepkg -si
```

This builds and installs the same package that will land on the AUR as `nintendo-music-client-bin`, with a proper desktop entry, icon and `/usr/bin/nintendo-music` launcher. To update later, pull the repository and run `makepkg -si` again.

## Building from source

Requires [Node.js](https://nodejs.org/) 18 or later.

```bash
git clone https://github.com/Axolat000/Unofficial-Nintendo-Music-client.git
cd Unofficial-Nintendo-Music-client
npm install
npm start
```

Building installers with [electron-builder](https://www.electron.build/) — output goes to `dist/`:

```bash
npm run build:win
npm run build:linux
npm run build:mac
```

> Note: NSIS refuses to *emit* an installer literally named `setup.exe` (Windows treats that filename as reserved and the compiler fails). The published asset is renamed after the build.

### Cross-platform builds

A `.dmg` can only be built on macOS, and AppImage packaging needs Linux tooling — neither can be produced from Windows. The [`Build` workflow](.github/workflows/build.yml) therefore builds each target on its native GitHub runner and attaches the results to the matching release. It runs automatically when a `v*` tag is pushed, and can be triggered manually from the Actions tab (optionally passing an existing tag to attach the builds to).

The macOS build is **unsigned and un-notarized**: on first launch, right-click the app and choose *Open* to get past Gatekeeper.

## Settings

Open with `Ctrl+,`, from the **Settings** menu, or from the tray icon.

### Performance

Three presets:

| Preset | What it does |
|---|---|
| **Untouched** | No optimisation, the site exactly as Nintendo ships it |
| **Balanced** | Page cache + telemetry blocking. Recommended. |
| **Max performance** | Everything on, including experimental options |

Individual switches:

- **Page cache** — caches page documents and navigation payloads. APIs and tokens are never cached.
- **Fluid mode** *(experimental, needs a restart)* — GPU compositing for animated elements, and removal of Chromium's frame-rate limiter, vsync and background throttling. Costs more battery in exchange for smoother rendering while minimised.
- **Clear cache** — forces a full reload from the server.

### Privacy

Each telemetry source has its own switch, plus a live counter of everything blocked since launch.

### Redesign

Off by default. Once enabled: density, artwork radius, stretched-artwork fix, hover effects, sticky headers, scrollbar and accent colour. The custom loading screen and its trivia are configured here too.

### Themes

`Appearance ▸ Theme`. The nine palette-based themes are generated by the same engine used by the theme editor, so they behave identically.

### Language

Changing the language updates the menus, tray and settings window immediately. The Nintendo Music website keeps its own language, which you change on the site itself.

## Discord Rich Presence

Discord must be running on the same machine — the client talks to it over local IPC, so there is nothing to configure.

```
Listening to Nintendo Music
♪ <track title>
  <game name>            ← when the site provides it
  00:14 ───────── 00:45
```

- The game name replaces what used to be a duplicated "Nintendo" line.
- **Private mode** replaces everything with *"Hidden Track" / "Private Mode"* and the default artwork.
- Track-change notifications can be toggled separately in `System`.

## Theme editor

`Appearance ▸ Theme ▸ Theme editor…`

- **Palette themes** — pick six colours (accent, three backgrounds, two text tones) and get a live preview.
- **Custom CSS** — paste CSS to inject into the page, with a reference list of the site's CSS variables.
- **Import / export** — drag and drop `.css` or `.json` files, and export your themes to share them.

## Menus and tray

| Menu | Contents |
|---|---|
| **Navigation** | Home, Reload, Quit |
| **Settings** | Open settings (`Ctrl+,`), page cache, redesign, clear cache |
| **Appearance** | 12 themes, custom themes, theme editor, border radius, always on top |
| **Discord** | Rich Presence, private mode |
| **System** | Track notifications, run at startup, start minimized, hardware acceleration |

The tray icon gives you show/hide, play/pause, next track, settings, theme editor and quit. Closing the window hides it rather than quitting — use **Quit** to exit for real.

## Where settings are stored

| File | Contents |
|---|---|
| `%APPDATA%\nintendo-music-pc\nintendo-music-config.json` | All settings |
| `%APPDATA%\nintendo-music-pc\nintendo-music-custom-themes.json` | Your custom themes |

On Linux and macOS: `~/.config/nintendo-music-pc/`. Deleting these files resets the app.

## How the optimisations were chosen

Every performance feature here was measured against the live site rather than guessed at. Some ideas were **dropped** because measurement showed they would do nothing:

| Idea | Measurement | Verdict |
|---|---|---|
| Rewrite cache headers for JS/CSS assets | Already `max-age=31536000, immutable`; 47/47 CSS and 25/26 JS served from cache | No gain |
| Add `loading="lazy"` / `decoding="async"` to images | All 136 images already have both | No gain |
| Enable HTTP/3 (QUIC) | Server only speaks HTTP/2 | No gain |
| Prefetch links on hover | Next.js App Router already prefetches | Redundant |

What measurement *did* find, on a signed-in session:

- **~28 of 196 requests per page load are pure telemetry**, several taking 400–600 ms and competing with real content for the connection
- The **artwork CDN** and the **auth gateway** were paying a full DNS + TLS handshake on the critical path
- The **HTML document** was fetched from the network on every open (`deliveryType: "network"`), while assets were already cached
- The real startup cost is **~4 MB of JavaScript** across ~26 chunks and 47 stylesheets, which has to be parsed and executed every launch — hence the splash screen and the enlarged disk cache, which also preserves V8's compiled bytecode between launches

## Troubleshooting

**Playback fails / DRM error `9012-4001`**
Make sure you are using the provided build. If you build it yourself, do not replace the Castlabs Electron dependency with standard Electron.

**Discord shows nothing**
Make sure the Discord desktop app is running and `Discord ▸ Enable Rich Presence` is checked. The client reconnects automatically.

**Stale content, or a strange signed-in state**
Turn off **Page cache** in the settings, or use **Clear cache**.

**The loading screen stays on screen**
It removes itself as soon as real content is painted, with a hard 12-second ceiling. If you ever see it stuck, turn it off under `Settings ▸ Redesign`.

## Known limitations

- **Colour themes depend on the site's CSS variables** (`--_1hr2ce…`), whose names Nintendo generates at build time. If Nintendo redeploys with new hashes, colour themes stop applying until the variables are updated. The redesign itself targets stable selectors (`main`, `section`, `img[data-nimg]`) and is not affected.
- **Fluid mode** switches are Chromium command-line flags, so they only take effect after restarting the app.
- **Loading screen trivia** is written in English and French; other languages fall back to English.
- The **redesign is off by default** — it is opt-in on purpose.

## Contributing

Issues and pull requests are welcome: bug reports, feature ideas, themes to share, or fixes for when the official site changes.

1. Fork the repository
2. Create a branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a Pull Request

## Credits

- [Nintendo](https://www.nintendo.com/) for Nintendo Music. All tracks, games and trademarks remain the property of their respective owners.
- [Castlabs](https://github.com/castlabs/electron-releases) for the Widevine-enabled Electron build.
- The Discord community for documenting the Rich Presence IPC protocol.

## License

[GNU General Public License v3.0 or later](LICENSE).

In short: you are free to use, study, modify and share this client. If you distribute a modified version, you must publish your source code under the same license and keep the original copyright notices — so it cannot be turned into a closed, proprietary product.

Provided as is, without warranty. All visual and musical content displayed by the app belongs to Nintendo; this repository only distributes the client code.
