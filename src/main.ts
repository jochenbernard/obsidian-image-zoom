import { Plugin } from "obsidian";
import { ConfigStore } from "./config-store";
import { ZoomAttacher } from "./zoom-attacher";
import { ImageZoomSettingsTab } from "./settings-tab";

export default class ImageZoomPlugin extends Plugin {
  private store!: ConfigStore;
  private attacher!: ZoomAttacher;

  async onload(): Promise<void> {
    this.store = new ConfigStore(this);
    await this.store.load();

    this.attacher = new ZoomAttacher(this.app.workspace, this.store);

    this.addSettingTab(new ImageZoomSettingsTab(this.app, this, this.store));

    this.app.workspace.onLayoutReady(() => {
      this.attacher.sweep();
      this.registerEvent(
        this.app.workspace.on("layout-change", () => this.attacher.sweep())
      );
      this.registerEvent(
        this.app.workspace.on("active-leaf-change", () => this.attacher.sweep())
      );
    });
  }

  onunload(): void {
    this.attacher?.detachAll();
  }
}
