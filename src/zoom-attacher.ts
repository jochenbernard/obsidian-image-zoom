import { ItemView, Workspace, WorkspaceLeaf } from "obsidian";
import { ConfigStore } from "./config-store";
import { ZoomController } from "./zoom-controller";

const IMAGE_VIEW_TYPE = "image";

export class ZoomAttacher {
  private byImage = new WeakMap<HTMLImageElement, ZoomController>();
  private byLeaf = new WeakMap<WorkspaceLeaf, HTMLImageElement>();

  constructor(
    private workspace: Workspace,
    private store: ConfigStore
  ) {}

  sweep(): void {
    for (const leaf of this.workspace.getLeavesOfType(IMAGE_VIEW_TYPE)) {
      this.attachToLeaf(leaf);
    }
  }

  detachAll(): void {
    for (const leaf of this.workspace.getLeavesOfType(IMAGE_VIEW_TYPE)) {
      const img = this.byLeaf.get(leaf);
      if (!img) continue;
      this.byImage.get(img)?.detach();
      this.byImage.delete(img);
      this.byLeaf.delete(leaf);
    }
  }

  private attachToLeaf(leaf: WorkspaceLeaf): void {
    const view = leaf.view;
    if (view.getViewType() !== IMAGE_VIEW_TYPE) return;
    if (!(view instanceof ItemView)) return;
    const container = view.contentEl;
    const img = container.querySelector("img");
    if (!img) return;

    const previous = this.byLeaf.get(leaf);
    if (previous && previous !== img) {
      this.byImage.get(previous)?.detach();
      this.byImage.delete(previous);
    }

    if (this.byImage.has(img)) return;
    this.byImage.set(img, new ZoomController(img, container, this.store));
    this.byLeaf.set(leaf, img);
  }
}
