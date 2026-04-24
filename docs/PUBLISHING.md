# Publishing

How to cut a release and (for the first release) submit the plugin to the Obsidian community directory.

## Cutting a release

Every release must ship `main.js` and `manifest.json` as binary attachments on a GitHub release whose tag matches `manifest.json`'s `version` (no `v` prefix).

1. Bump `version` in `manifest.json`, `package.json`, and add an entry to `versions.json` mapping the new plugin version to its `minAppVersion`.
2. Commit the bumps (`chore: release x.y.z`) and push to `main`.
3. Tag and push:
   ```sh
   git tag -a 1.2.3 -m "1.2.3"
   git push origin 1.2.3
   ```
4. The `Release Obsidian plugin` workflow (`.github/workflows/release.yml`) builds `main.js` and creates a **draft** release with `main.js` and `manifest.json` attached.
5. On GitHub, open the draft release, add release notes, and publish.

### One-time GitHub setup

In the repo's `Settings → Actions → General → Workflow permissions`, set **Read and write permissions** so the release workflow can create releases.

## First submission to the community directory

Only needed once. After the plugin is accepted, subsequent versions are picked up automatically from GitHub releases.

1. Publish a non-draft GitHub release (follow "Cutting a release" above).
2. Fork and edit [`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases), open `community-plugins.json`, and append:
   ```json
   {
     "id": "image-zoom",
     "name": "Image Zoom",
     "author": "Jochen Bernard",
     "description": "Pinch-zoom and modifier-scroll zoom for image files opened in their own tab.",
     "repo": "jochenbernard/obsidian-image-zoom"
   }
   ```
   Add a comma after the previous entry's closing `}`.
3. Open a PR titled `Add plugin: Image Zoom`. Fill in the PR template checkboxes.
4. Wait for the validation bot to add a `Ready for review` label. Address any `Validation failed` feedback by pushing to the same PR branch.
5. After the Obsidian team reviews and merges, the plugin appears in the in-app Community Plugins browser.

Reference: [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin).

## Pre-submission checklist

Run through this before opening the submission PR. Most items are automated by the release workflow or enforced in code, but the human-judgement ones matter.

- [ ] `manifest.json` `id` does not contain `obsidian` and matches the `repo`'s plugin folder name.
- [ ] `manifest.json` `description` is under 250 chars, ends with a period, starts with an action statement, no emoji.
- [ ] `manifest.json` `minAppVersion` reflects an Obsidian version you actually tested against.
- [ ] `manifest.json`, `package.json`, and `versions.json` all agree on the version number.
- [ ] `LICENSE` is present and matches the license referenced in `package.json`.
- [ ] `README.md` explains the purpose and usage.
- [ ] `npm run build` succeeds locally with no TypeScript errors.
- [ ] `npm test` passes.
- [ ] Manual smoke tests in `CONTRIBUTING.md` all pass in a real vault.
- [ ] Release workflow has produced a non-draft GitHub release with `main.js` and `manifest.json` attached, tagged with the exact version from `manifest.json`.
