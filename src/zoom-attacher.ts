import { ItemView, Workspace, WorkspaceLeaf } from "obsidian";
import { ConfigStore } from "./config-store";
import { ZoomController } from "./zoom-controller";

const IMAGE_VIEW_TYPE = "image";

export class ZoomAttacher {
  private byImage = new WeakMap<HTMLImageElement, ZoomController>();
  private attached = new WeakSet<HTMLImageElement>();
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
      const controller = this.byImage.get(img);
      controller?.detach();
      this.byImage.delete(img);
      this.attached.delete(img);
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
      const previousController = this.byImage.get(previous);
      previousController?.detach();
      this.byImage.delete(previous);
      this.attached.delete(previous);
    }

    if (this.attached.has(img)) return;
    const controller = new ZoomController(img, container, this.store);
    this.byImage.set(img, controller);
    this.attached.add(img);
    this.byLeaf.set(leaf, img);
  }
}
