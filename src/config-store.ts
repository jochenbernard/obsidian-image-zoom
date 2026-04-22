import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, ModifierKey, PluginSettings } from "./types";

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

  async setModifierKey(value: ModifierKey): Promise<void> {
    await this.write({ modifierKey: value });
  }

  async setMinZoom(value: number): Promise<void> {
    await this.write({ minZoom: value });
  }

  async setMaxZoom(value: number): Promise<void> {
    await this.write({ maxZoom: value });
  }

  async setZoomSensitivity(value: number): Promise<void> {
    await this.write({ zoomSensitivity: value });
  }

  async setResetOnDoubleClick(value: boolean): Promise<void> {
    await this.write({ resetOnDoubleClick: value });
  }

  private async write(patch: Partial<PluginSettings>): Promise<void> {
    this.settings = { ...this.settings, ...patch };
    await this.plugin.saveData(this.settings);
  }
}
