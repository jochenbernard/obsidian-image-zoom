import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, PluginSettings } from "./types";

export class ConfigStore {
  private settings: PluginSettings = { ...DEFAULT_SETTINGS };

  constructor(private plugin: Plugin) {}

  async load(): Promise<void> {
    const data = (await this.plugin.loadData()) as Partial<PluginSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...(data ?? {}) };
  }

  getSettings(): Readonly<PluginSettings> {
    return this.settings;
  }

  async update(patch: Partial<PluginSettings>): Promise<void> {
    this.settings = { ...this.settings, ...patch };
    await this.plugin.saveData(this.settings);
  }
}
