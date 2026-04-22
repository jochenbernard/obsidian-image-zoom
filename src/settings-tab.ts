import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { ConfigStore } from "./config-store";
import { isModifierKey } from "./types";

export class ImageZoomSettingsTab extends PluginSettingTab {
  constructor(app: App, plugin: Plugin, private store: ConfigStore) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const settings = this.store.getSettings();

    new Setting(containerEl)
      .setName("Modifier key for scroll-zoom")
      .setDesc(
        "Which modifier must be held while scrolling to zoom. Trackpad pinch gestures on macOS are detected automatically regardless of this setting."
      )
      .addDropdown(d =>
        d
          .addOption("either", "Cmd or Ctrl")
          .addOption("cmd", "Cmd only")
          .addOption("ctrl", "Ctrl only")
          .addOption("none", "No modifier (scroll zooms)")
          .setValue(settings.modifierKey)
          .onChange(async value => {
            if (!isModifierKey(value)) return;
            await this.store.setModifierKey(value);
          })
      );

    new Setting(containerEl)
      .setName("Zoom sensitivity")
      .setDesc("Multiplier for how fast scroll-zoom changes scale. 1.0 is the default.")
      .addSlider(s =>
        s
          .setLimits(0.1, 5, 0.1)
          .setValue(settings.zoomSensitivity)
          .setDynamicTooltip()
          .onChange(async value => {
            await this.store.setZoomSensitivity(value);
          })
      );

    new Setting(containerEl)
      .setName("Minimum zoom")
      .setDesc("Smallest allowed scale. 1.0 = fit-to-pane.")
      .addSlider(s =>
        s
          .setLimits(0.05, 1, 0.05)
          .setValue(settings.minZoom)
          .setDynamicTooltip()
          .onChange(async value => {
            await this.store.setMinZoom(value);
          })
      );

    new Setting(containerEl)
      .setName("Maximum zoom")
      .setDesc("Largest allowed scale.")
      .addSlider(s =>
        s
          .setLimits(2, 50, 1)
          .setValue(settings.maxZoom)
          .setDynamicTooltip()
          .onChange(async value => {
            await this.store.setMaxZoom(value);
          })
      );

    new Setting(containerEl)
      .setName("Reset on double-click")
      .setDesc("Double-clicking the image returns zoom to 1x and centers it.")
      .addToggle(t =>
        t.setValue(settings.resetOnDoubleClick).onChange(async value => {
          await this.store.setResetOnDoubleClick(value);
        })
      );
  }
}
