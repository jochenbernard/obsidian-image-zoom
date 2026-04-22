#!/usr/bin/env node
import { existsSync, mkdirSync, copyFileSync, statSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const PLUGIN_ID = "image-zoom";
const FILES = ["manifest.json", "main.js"];

const projectRoot = resolve(fileURLToPath(import.meta.url), "..", "..");
const configFile = join(projectRoot, ".obsidian-vault-path");

function expandHome(p) {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

function resolveVaultPath() {
  const fromArg = process.argv[2];
  if (fromArg) return { path: expandHome(fromArg), source: "CLI argument" };
  if (process.env.OBSIDIAN_VAULT_PATH) {
    return { path: expandHome(process.env.OBSIDIAN_VAULT_PATH), source: "OBSIDIAN_VAULT_PATH env var" };
  }
  if (existsSync(configFile)) {
    const fromFile = readFileSync(configFile, "utf8").trim();
    if (fromFile) return { path: expandHome(fromFile), source: ".obsidian-vault-path" };
  }
  return null;
}

const resolved = resolveVaultPath();
if (!resolved) {
  console.error("error: no vault path provided.\n");
  console.error("Provide one of:");
  console.error("  npm run install:plugin -- /absolute/path/to/vault");
  console.error("  OBSIDIAN_VAULT_PATH=/path/to/vault npm run install:plugin");
  console.error("  echo /path/to/vault > .obsidian-vault-path    # gitignored");
  process.exit(1);
}

const vaultPath = resolve(resolved.path);
if (!existsSync(vaultPath) || !statSync(vaultPath).isDirectory()) {
  console.error(`error: vault path is not a directory: ${vaultPath}`);
  console.error(`  (source: ${resolved.source})`);
  process.exit(1);
}

const obsidianDir = join(vaultPath, ".obsidian");
if (!existsSync(obsidianDir)) {
  console.error(`error: ${vaultPath} does not look like an Obsidian vault (no .obsidian directory).`);
  console.error(`  (source: ${resolved.source})`);
  process.exit(1);
}

const pluginDir = join(obsidianDir, "plugins", PLUGIN_ID);
mkdirSync(pluginDir, { recursive: true });

for (const file of FILES) {
  const src = join(projectRoot, file);
  if (!existsSync(src)) {
    console.error(`error: ${file} not found in ${projectRoot}. Run \`npm run build\` first.`);
    process.exit(1);
  }
  copyFileSync(src, join(pluginDir, file));
  console.log(`  ${file} → ${join(pluginDir, file)}`);
}

console.log(`\nInstalled to ${pluginDir}`);
console.log(`Reload Obsidian (Ctrl/Cmd+P → "Reload app without saving") and enable "Image Zoom" under Settings → Community plugins.`);
