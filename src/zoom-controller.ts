import { ConfigStore } from "./config-store";
import { ModifierKey } from "./types";
import { clampPan, zoomAt, ZoomState } from "./zoom-math";

// Breathing room (px) between the image edge and the viewport edge at the
// pan limit when the image is larger than the viewport in that dimension.
const EDGE_PADDING = 80;

interface GestureEventLike extends Event {
  scale: number;
  clientX: number;
  clientY: number;
}

export class ZoomController {
  private state: ZoomState = { scale: 1, tx: 0, ty: 0 };

  private panning = false;
  private lastPanX = 0;
  private lastPanY = 0;

  private pinching = false;
  private pinchStartDistance = 0;
  private pinchStartScale = 1;
  private pinchAnchor = { x: 0, y: 0 };

  private gestureStartScale = 1;

  constructor(
    private img: HTMLImageElement,
    private container: HTMLElement,
    private store: ConfigStore
  ) {
    this.prepare();
    this.bind();
  }

  detach(): void {
    this.container.removeEventListener("wheel", this.onWheel);
    this.container.removeEventListener("dblclick", this.onDblClick);
    this.container.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
    this.container.removeEventListener("touchstart", this.onTouchStart);
    this.container.removeEventListener("touchmove", this.onTouchMove);
    this.container.removeEventListener("touchend", this.onTouchEnd);
    this.container.removeEventListener("gesturestart", this.onGestureStart as EventListener);
    this.container.removeEventListener("gesturechange", this.onGestureChange as EventListener);
    this.container.removeEventListener("gestureend", this.onGestureEnd as EventListener);
    this.img.style.transform = "";
    this.img.style.transformOrigin = "";
    this.img.style.transition = "";
    this.img.style.cursor = "";
    this.container.style.overflow = "";
    this.container.style.touchAction = "";
    this.container.style.display = "";
    this.container.style.alignItems = "";
    this.container.style.justifyContent = "";
  }

  private prepare(): void {
    this.img.style.transformOrigin = "center center";
    this.img.style.transition = "none";
    this.img.style.willChange = "transform";
    this.img.style.userSelect = "none";
    this.img.style.touchAction = "none";
    this.container.style.overflow = "hidden";
    this.container.style.touchAction = "none";
    // Obsidian's default image view top-aligns the image in contentEl. That
    // mismatches our pan-clamp origin (container center) and causes a visible
    // jump on first zoom/pan. Force the container to center the image so the
    // initial paint already sits where the clamp expects it.
    this.container.style.display = "flex";
    this.container.style.alignItems = "center";
    this.container.style.justifyContent = "center";
    this.apply();
  }

  private bind(): void {
    // Listeners target the container, not the image: the image moves during
    // pan/zoom, so a listener on the image stops receiving events the moment
    // the cursor drifts off the image onto the surrounding container.
    this.container.addEventListener("wheel", this.onWheel, { passive: false });
    this.container.addEventListener("dblclick", this.onDblClick);
    this.container.addEventListener("mousedown", this.onMouseDown);
    this.container.addEventListener("touchstart", this.onTouchStart, { passive: false });
    this.container.addEventListener("touchmove", this.onTouchMove, { passive: false });
    this.container.addEventListener("touchend", this.onTouchEnd);
    this.container.addEventListener("gesturestart", this.onGestureStart as EventListener, { passive: false });
    this.container.addEventListener("gesturechange", this.onGestureChange as EventListener, { passive: false });
    this.container.addEventListener("gestureend", this.onGestureEnd as EventListener);
  }

  private onWheel = (e: WheelEvent): void => {
    const settings = this.store.getSettings();
    if (this.modifierMatches(settings.modifierKey, e)) {
      e.preventDefault();
      const anchor = this.toContainer(e.clientX, e.clientY);
      const factor = Math.exp(-e.deltaY * 0.01 * settings.zoomSensitivity);
      this.setState(
        zoomAt(this.state, factor, anchor, 1, settings.maxZoom)
      );
      return;
    }
    if (this.state.scale > 1) {
      e.preventDefault();
      this.setState({
        ...this.state,
        tx: this.state.tx - e.deltaX,
        ty: this.state.ty - e.deltaY
      });
    }
  };

  private onDblClick = (e: MouseEvent): void => {
    if (!this.store.getSettings().resetOnDoubleClick) return;
    e.preventDefault();
    this.setState({ scale: 1, tx: 0, ty: 0 });
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (this.state.scale <= 1) return;
    if (e.button !== 0) return;
    this.panning = true;
    this.lastPanX = e.clientX;
    this.lastPanY = e.clientY;
    this.img.style.cursor = "grabbing";
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
    e.preventDefault();
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.panning) return;
    const dx = e.clientX - this.lastPanX;
    const dy = e.clientY - this.lastPanY;
    this.lastPanX = e.clientX;
    this.lastPanY = e.clientY;
    this.setState({ ...this.state, tx: this.state.tx + dx, ty: this.state.ty + dy });
  };

  private onMouseUp = (): void => {
    this.panning = false;
    this.img.style.cursor = this.state.scale > 1 ? "grab" : "";
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 2) {
      e.preventDefault();
      this.pinching = true;
      this.pinchStartDistance = this.touchDistance(e.touches[0], e.touches[1]);
      this.pinchStartScale = this.state.scale;
      const mid = this.touchMidpoint(e.touches[0], e.touches[1]);
      this.pinchAnchor = this.toContainer(mid.x, mid.y);
    } else if (e.touches.length === 1 && this.state.scale > 1) {
      this.panning = true;
      this.lastPanX = e.touches[0].clientX;
      this.lastPanY = e.touches[0].clientY;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (this.pinching && e.touches.length === 2) {
      e.preventDefault();
      const settings = this.store.getSettings();
      const dist = this.touchDistance(e.touches[0], e.touches[1]);
      const factor = dist / (this.pinchStartDistance || 1);
      const target = this.pinchStartScale * factor;
      const relativeFactor = target / this.state.scale;
      this.setState(
        zoomAt(this.state, relativeFactor, this.pinchAnchor, 1, settings.maxZoom)
      );
    } else if (this.panning && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - this.lastPanX;
      const dy = e.touches[0].clientY - this.lastPanY;
      this.lastPanX = e.touches[0].clientX;
      this.lastPanY = e.touches[0].clientY;
      this.setState({ ...this.state, tx: this.state.tx + dx, ty: this.state.ty + dy });
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (e.touches.length < 2) this.pinching = false;
    if (e.touches.length === 0) this.panning = false;
  };

  private onGestureStart = (e: GestureEventLike): void => {
    e.preventDefault();
    this.gestureStartScale = this.state.scale;
    this.pinchAnchor = this.toContainer(e.clientX, e.clientY);
  };

  private onGestureChange = (e: GestureEventLike): void => {
    e.preventDefault();
    const settings = this.store.getSettings();
    const target = this.gestureStartScale * e.scale;
    const relativeFactor = target / this.state.scale;
    this.setState(
      zoomAt(this.state, relativeFactor, this.pinchAnchor, 1, settings.maxZoom)
    );
  };

  private onGestureEnd = (_e: GestureEventLike): void => {
    // state already committed via gesturechange
  };

  private setState(next: ZoomState): void {
    const bounds = this.bounds();
    const clamped = clampPan({ tx: next.tx, ty: next.ty }, { scale: next.scale, ...bounds });
    this.state = { scale: next.scale, tx: clamped.tx, ty: clamped.ty };
    this.apply();
  }

  private apply(): void {
    this.img.style.transform = `translate(${this.state.tx}px, ${this.state.ty}px) scale(${this.state.scale})`;
    this.img.style.cursor = this.state.scale > 1 ? "grab" : "";
  }

  private bounds(): {
    imageWidth: number;
    imageHeight: number;
    containerWidth: number;
    containerHeight: number;
    imageCenterX: number;
    imageCenterY: number;
    padding: number;
  } {
    // Use the CSS-rendered (fit) size, not natural size. clientWidth/Height
    // reflect layout after Obsidian's max-width/height CSS, which is exactly
    // the "scale=1 = fit-to-viewport" reference the pan clamp needs.
    //
    // Obsidian's image view does not always center the image vertically
    // (flex alignment can leave empty space at top or bottom), so we measure
    // the image's actual visual center and subtract the currently-applied
    // translation to recover the natural (no-transform) center in container
    // coordinates. The pan clamp uses that to shift its allowed range.
    const imgRect = this.img.getBoundingClientRect();
    const contRect = this.container.getBoundingClientRect();
    const visualCenterX = imgRect.left + imgRect.width / 2 - contRect.left;
    const visualCenterY = imgRect.top + imgRect.height / 2 - contRect.top;
    return {
      imageWidth: this.img.clientWidth || this.img.naturalWidth,
      imageHeight: this.img.clientHeight || this.img.naturalHeight,
      containerWidth: this.container.clientWidth,
      containerHeight: this.container.clientHeight,
      imageCenterX: visualCenterX - this.state.tx,
      imageCenterY: visualCenterY - this.state.ty,
      padding: EDGE_PADDING
    };
  }

  private toContainer(clientX: number, clientY: number): { x: number; y: number } {
    // Anchor is expressed as offset from the container's center so it lines
    // up with the image's transform-origin (center center). At scale=1 with
    // tx=ty=0 the image sits centered in the container, so zooming on the
    // center produces no translation.
    const rect = this.container.getBoundingClientRect();
    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2
    };
  }

  private touchDistance(a: Touch, b: Touch): number {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }

  private touchMidpoint(a: Touch, b: Touch): { x: number; y: number } {
    return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
  }

  private modifierMatches(modifier: ModifierKey, e: WheelEvent): boolean {
    switch (modifier) {
      case "either": return e.ctrlKey || e.metaKey;
      case "cmd": return e.metaKey;
      case "ctrl": return e.ctrlKey;
      case "none": return true;
    }
  }
}
