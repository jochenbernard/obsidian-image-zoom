# Contributing

## Development commands

- `npm run dev` — esbuild watch mode (does not typecheck).
- `npm run build` — `tsc -noEmit` then a minified esbuild bundle to `main.js`. Run this before committing anything that changes types.
- `npm test` / `npm run test:watch` — vitest. Only `src/zoom-math.ts` is unit-tested; the rest depends on Obsidian's runtime and is verified manually via the smoke tests below.
- `npm run test -- tests/zoom-math.test.ts` — run a single test file.

## Installing a local build into a vault

Use the `install:plugin` script to build and copy `manifest.json` + `main.js` into `<vault>/.obsidian/plugins/image-zoom/`:

```sh
npm install
npm run install:plugin -- /absolute/path/to/your/vault
```

Alternatives for passing the vault path:

- Env var: `OBSIDIAN_VAULT_PATH=/path/to/vault npm run install:plugin`
- Local file: `echo /path/to/vault > .obsidian-vault-path` (gitignored), then `npm run install:plugin`

Resolution order is CLI arg → env var → `.obsidian-vault-path`.

After installing, reload Obsidian (`Cmd/Ctrl+P → "Reload app without saving"`) and enable the plugin under `Settings → Community plugins`.

## Manual smoke tests

The pure `zoom-math` module is unit-tested, but the parts that touch Obsidian's workspace and DOM events are verified by hand. Run through this list before cutting a release or merging a behavioral change.

1. Enable the plugin in a vault.
2. Open a `.png` or `.jpg` file directly (double-click in file explorer).
3. On macOS trackpad: pinch outward → image zooms in, centered on the pinch midpoint.
4. Cmd/Ctrl + scroll up → zoom in centered on the cursor.
5. While zoomed > 1x, click and drag → image pans; the image cannot be dragged past its own edges.
6. Double-click → zoom resets to 1x.
7. Open a second image in a split pane → each pane has its own zoom state.
8. Navigate between images in the same tab (Cmd+O → pick another image) → new image starts at 1x.
9. Close the image tab, reopen → starts at 1x.
10. Change "Modifier key for scroll-zoom" in settings → new modifier takes effect on the next scroll without reloading.
11. On iPad/iPhone: two-finger pinch → zoom; one-finger drag when zoomed → pan; double-tap → toggle between 1x and zoomed.
12. On iPad/iPhone while zoomed, swipe from the edge of the image → Obsidian's built-in tab-swipe navigation does not fire.

## Releasing

See [`docs/PUBLISHING.md`](docs/PUBLISHING.md) for the release workflow and the first-time community-directory submission steps.
