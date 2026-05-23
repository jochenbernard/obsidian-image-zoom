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

The old PR-to-`obsidianmd/obsidian-releases` workflow is deprecated. Submissions now go through the developer dashboard at <https://community.obsidian.md/>:

1. Publish a non-draft GitHub release (follow "Cutting a release" above).
2. Sign in at <https://community.obsidian.md/> and connect GitHub so the dashboard can verify repo ownership.
3. Select `jochenbernard/obsidian-image-zoom` from the repo list and complete the dashboard steps.
4. The automated reviewer scans the release for security and code quality and returns results within minutes. Fix any findings, cut a new release, and resubmit — the scanner re-runs per version.
5. Approved plugins appear in the in-app Community Plugins browser within ~24h.

Reference: [The future of plugins](https://obsidian.md/blog/future-of-plugins/).

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
