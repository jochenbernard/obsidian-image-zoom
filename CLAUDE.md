# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — esbuild watch mode (does not typecheck).
- `npm run build` — `tsc -noEmit` then a minified esbuild bundle to `main.js`.
- `npm test` / `npm run test:watch` — vitest. Only `src/zoom-math.ts` is unit-tested; the rest depends on Obsidian's runtime and is verified manually.
- `npm run install:plugin -- /path/to/vault` — build and copy `manifest.json` + `main.js` into `<vault>/.obsidian/plugins/image-zoom/`. Vault path resolution order is CLI arg → `OBSIDIAN_VAULT_PATH` env → `.obsidian-vault-path` file (gitignored).

## Architecture

Three collaborators; `src/main.ts` is only wiring.

- **`ConfigStore`** (`src/config-store.ts`) — owns `data.json` persistence and the in-memory `PluginSettings`.
- **`ZoomController`** (`src/zoom-controller.ts`) — one instance per image element. Registers wheel / dblclick / mouse / touch / gesture listeners and applies CSS transforms. Pulls live settings from the store on every event (no caching, so setting changes take effect immediately).
- **`ZoomAttacher`** (`src/zoom-attacher.ts`) — listens to `layout-change` and `active-leaf-change`, walks every leaf whose `view.getViewType() === "image"`, and ensures each leaf's current `<img>` has a `ZoomController`. Tracks attachments in a `WeakMap<HTMLImageElement, ZoomController>` so state GCs with the element. When a leaf's image element changes (navigation), the previous controller is detached. Guards the `contentEl` access with an `instanceof ItemView` check — `View` in the public types lacks `contentEl`, but `FileView` (which the built-in image view extends) inherits it from `ItemView`.

### Pure math

`src/zoom-math.ts` is pure and unit-tested:
- `clamp(value, min, max)` — standard clamp.
- `zoomAt(state, factor, anchor, min, max)` — cursor-anchored zoom. Returns a new `ZoomState` such that the image coordinate under `anchor` (container-relative) stays under `anchor` after scaling.
- `clampPan(translation, bounds)` — clamps translation so the scaled image cannot be dragged off-screen beyond its edges. When the scaled image is smaller than the container, translation is pinned to 0.

### Input sources

- Wheel (`wheel`, non-passive, `preventDefault`) — gated on the configured modifier. On macOS trackpad, Chromium synthesizes pinch as wheel events with `ctrlKey: true`, so trackpad pinch works automatically.
- macOS WebKit gesture events (`gesturestart` / `gesturechange` / `gestureend`) — additional explicit pinch channel. Not on Chromium, but harmless to register.
- Touch (`touchstart` / `touchmove` / `touchend`, non-passive) — iOS pinch (two-finger) and pan (one-finger when scale > 1).
- Mouse drag — pan when `scale > 1`.
- Double-click — reset (when enabled in settings).

### CSS transform strategy

`transform-origin: 0 0` (top-left) plus `transform: translate(tx px, ty px) scale(s)`. Translation is stored in viewport pixels (container-relative). `zoomAt` handles the math so the transform remains consistent with a (0,0) origin.

## Conventions

- Enum-like values: `const FOO = [...] as const` plus `type Foo = typeof FOO[number]` and a matching `isFoo` type guard.
- Strict TypeScript, no implicit any.
- No runtime dependencies.
- Classes for stateful services (`ConfigStore`, `ZoomController`, `ZoomAttacher`); plain functions for pure logic (`zoom-math`).
- Per-leaf / per-element state via `WeakMap` / `WeakSet` keyed on Obsidian or DOM objects.
- Settings read lazily via `store.getSettings()` on each event, not cached.
