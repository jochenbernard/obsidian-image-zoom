# Image Zoom

An Obsidian plugin that adds pinch-zoom and modifier-scroll zoom to image files opened in Obsidian. Works on both desktop (macOS trackpad pinch, Cmd/Ctrl + scroll) and iOS (native pinch).

## Scope

Only affects image **files** opened directly in Obsidian (`.png`, `.jpg`, `.webp`, etc. in their own tab). Images embedded inside markdown notes are not touched.

## Features

- Trackpad pinch-to-zoom on macOS.
- Two-finger pinch-to-zoom on iPad/iPhone, with two-finger pan during the pinch.
- Modifier + scroll wheel zoom (Cmd, Ctrl, either, or no modifier).
- Drag to pan when zoomed in, clamped to the image's edges.
- Double-click (or double-tap on touch) to reset zoom.
- Cursor-anchored zoom — the point under your cursor stays put.

## Install

### From the Obsidian community plugins browser

> Available once the plugin is accepted into the community directory. Submission is pending — use one of the other methods below in the meantime.

1. Open `Settings → Community plugins`.
2. Turn off Restricted mode if it is on.
3. Click `Browse`, search for `Image Zoom`, and install.
4. Enable the plugin in `Settings → Community plugins`.

### Manual

1. Download `manifest.json` and `main.js` from the latest [GitHub release](https://github.com/jochenbernard/obsidian-image-zoom/releases).
2. Copy both files into your vault's `.obsidian/plugins/image-zoom/` folder (create the folder if it does not exist).
3. Reload Obsidian and enable the plugin under `Settings → Community plugins`.

## Settings

- **Modifier key for scroll-zoom** — which modifier must be held while scrolling to trigger zoom (Cmd, Ctrl, either, or none).
- **Zoom sensitivity** — multiplier for how fast scroll-zoom changes scale.
- **Maximum zoom** — upper scale bound.
- **Reset on double-click** — whether double-clicking resets zoom to 1x.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for build, test, and release instructions.

## License

MIT
