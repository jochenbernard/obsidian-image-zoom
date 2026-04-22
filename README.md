# Image Zoom

An Obsidian plugin that adds pinch-zoom and modifier-scroll zoom to image files opened in Obsidian. Works on both desktop (macOS trackpad pinch, Cmd/Ctrl + scroll) and iOS (native pinch).

Only affects image **files** opened directly in Obsidian (`.png`, `.jpg`, `.webp`, etc. in their own tab). Images embedded inside markdown notes are not touched.

## Features

- Trackpad pinch-to-zoom on macOS.
- Two-finger pinch-to-zoom on iPad/iPhone.
- Modifier + scroll wheel zoom (Cmd, Ctrl, either, or no modifier).
- Drag to pan when zoomed in.
- Double-click to reset zoom.
- Cursor-anchored zoom — the point under your cursor stays put.

## Install

### Scripted

```sh
npm install
npm run install:plugin -- /absolute/path/to/your/vault
```

Builds the plugin and copies `manifest.json` and `main.js` into `<vault>/.obsidian/plugins/image-zoom/`.

Alternatives for passing the vault path:

- Env var: `OBSIDIAN_VAULT_PATH=/path/to/vault npm run install:plugin`
- Local file: `echo /path/to/vault > .obsidian-vault-path` (gitignored), then `npm run install:plugin`

After installing, reload Obsidian (`Cmd/Ctrl+P → "Reload app without saving"`) and enable the plugin under `Settings → Community plugins`.

### Manual

1. `npm install && npm run build`
2. Copy `manifest.json` and `main.js` into `<vault>/.obsidian/plugins/image-zoom/`.
3. Reload Obsidian and enable the plugin.

## Settings

- **Modifier key for scroll-zoom** — which modifier must be held while scrolling to trigger zoom.
- **Zoom sensitivity** — multiplier for how fast scroll-zoom changes scale.
- **Minimum / maximum zoom** — scale bounds.
- **Reset on double-click** — whether double-clicking resets zoom.

## Development

- `npm run dev` — watch-mode bundle.
- `npm run build` — production bundle + typecheck.
- `npm test` — run unit tests for the pure `zoom-math` module.

## Manual smoke tests

1. Enable the plugin in a vault.
2. Open a `.png` or `.jpg` file directly (double-click in file explorer).
3. On macOS trackpad: pinch outward → image zooms in, centered on the pinch midpoint.
4. Cmd/Ctrl + scroll up → zoom in centered on the cursor.
5. While zoomed > 1x, click and drag → image pans.
6. Double-click → zoom resets to 1x.
7. Open a second image in a split pane → each pane has its own zoom state.
8. Navigate between images in the same tab (Cmd+O → pick another image) → new image starts at 1x.
9. Close the image tab, reopen → starts at 1x.
10. On iPad/iPhone: two-finger pinch → zoom; one finger drag when zoomed → pan.

## License

MIT
