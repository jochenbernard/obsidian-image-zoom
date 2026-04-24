import { ConfigStore } from "./config-store";
import { ModifierKey } from "./types";
import { clamp, clampPan, zoomAt, ZoomState } from "./zoom-math";

// Breathing room (px) between the image edge and the viewport edge at the
// pan limit when the image is larger than the viewport in that dimension.
const EDGE_PADDING = 80;

// Double-tap detection for mobile — iOS Photos-style toggle between fit and
// zoomed-in. Kept small/loose enough to feel natural without competing with
// pans or pinches.
const TAP_MAX_DURATION_MS = 250;
const TAP_MAX_MOVEMENT_PX = 10;
const DOUBLE_TAP_MAX_GAP_MS = 300;
const DOUBLE_TAP_MAX_DISTANCE_PX = 40;
const DOUBLE_TAP_ZOOM_SCALE = 2.5;
const DOUBLE_TAP_ANIM_MS = 220;

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
  // Image-space point that sits under the pinch midpoint. Captured at
  // pinchstart and held so the same image point stays glued to wherever the
  // midpoint is now — giving simultaneous zoom-and-pan with two fingers.
  private pinchImgAnchor = { x: 0, y: 0 };

  private gestureStartScale = 1;

  private animRaf: number | null = null;

  private tapStartTime = 0;
  private tapStartX = 0;
  private tapStartY = 0;
  private tapCandidate = false;
  private lastTapTime = 0;
  private lastTapX = 0;
  private lastTapY = 0;

  constructor(
    private img: HTMLImageElement,
    private container: HTMLElement,
    private store: ConfigStore
  ) {
    this.prepare();
    this.bind();
  }

  detach(): void {
    this.cancelAnimation();
    this.container.removeEventListener("wheel", this.onWheel);
    this.container.removeEventListener("dblclick", this.onDblClick);
    this.container.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
    this.container.removeEventListener("touchstart", this.onTouchStart, true);
    this.container.removeEventListener("touchmove", this.onTouchMove, true);
    this.container.removeEventListener("touchend", this.onTouchEnd, true);
    this.container.removeEventListener("touchcancel", this.onTouchEnd, true);
    this.container.removeEventListener("gesturestart", this.onGestureStart as EventListener);
    this.container.removeEventListener("gesturechange", this.onGestureChange as EventListener);
    this.container.removeEventListener("gestureend", this.onGestureEnd as EventListener);
    this.img.classList.remove("image-zoom-img");
    this.container.classList.remove("image-zoom-container");
    this.img.style.removeProperty("transform");
  }

  private prepare(): void {
    this.img.classList.add("image-zoom-img");
    // Obsidian's default image view top-aligns the image in contentEl. That
    // mismatches our pan-clamp origin (container center) and causes a visible
    // jump on first zoom/pan. The container class centers the image so the
    // initial paint already sits where the clamp expects it.
    this.container.classList.add("image-zoom-container");
    this.apply();
  }

  private bind(): void {
    // Listeners target the container, not the image: the image moves during
    // pan/zoom, so a listener on the image stops receiving events the moment
    // the cursor drifts off the image onto the surrounding container.
    this.container.addEventListener("wheel", this.onWheel, { passive: false });
    this.container.addEventListener("dblclick", this.onDblClick);
    this.container.addEventListener("mousedown", this.onMouseDown);
    // Capture phase so Obsidian mobile's ancestor swipe handlers can't
    // preempt touches that originate on the image.
    this.container.addEventListener("touchstart", this.onTouchStart, { passive: false, capture: true });
    this.container.addEventListener("touchmove", this.onTouchMove, { passive: false, capture: true });
    this.container.addEventListener("touchend", this.onTouchEnd, { capture: true });
    this.container.addEventListener("touchcancel", this.onTouchEnd, { capture: true });
    this.container.addEventListener("gesturestart", this.onGestureStart as EventListener, { passive: false });
    this.container.addEventListener("gesturechange", this.onGestureChange as EventListener, { passive: false });
    this.container.addEventListener("gestureend", this.onGestureEnd as EventListener);
  }

  private onWheel = (e: WheelEvent): void => {
    this.cancelAnimation();
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
    e.preventDefault();
    this.handleDoubleTap(e.clientX, e.clientY);
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (this.state.scale <= 1) return;
    if (e.button !== 0) return;
    this.cancelAnimation();
    this.panning = true;
    this.lastPanX = e.clientX;
    this.lastPanY = e.clientY;
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
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.stopPropagation();
    this.cancelAnimation();

    if (e.touches.length === 1) {
      this.tapStartTime = performance.now();
      this.tapStartX = e.touches[0].clientX;
      this.tapStartY = e.touches[0].clientY;
      this.tapCandidate = true;
    } else if (e.touches.length >= 2) {
      // Second finger invalidates tap intent and any in-progress double-tap.
      this.tapCandidate = false;
      this.lastTapTime = 0;
    }

    if (e.touches.length === 2) {
      e.preventDefault();
      this.pinching = true;
      this.pinchStartDistance = this.touchDistance(e.touches[0], e.touches[1]);
      this.pinchStartScale = this.state.scale;
      const mid = this.touchMidpoint(e.touches[0], e.touches[1]);
      const midContainer = this.toContainer(mid.x, mid.y);
      // Freeze the image-space point that's currently under the midpoint.
      // During the pinch we keep this point pinned to wherever the midpoint
      // moves, which is what gives you pan + zoom simultaneously.
      this.pinchImgAnchor = {
        x: (midContainer.x - this.state.tx) / this.state.scale,
        y: (midContainer.y - this.state.ty) / this.state.scale
      };
    } else if (e.touches.length === 1 && this.state.scale > 1) {
      e.preventDefault();
      this.panning = true;
      this.lastPanX = e.touches[0].clientX;
      this.lastPanY = e.touches[0].clientY;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.stopPropagation();

    // Defensive: if touchstart never reached us (e.g., an ancestor handler
    // consumed it) but we're clearly in a 1-finger drag at a zoomed scale,
    // lazily initialize pan state so the gesture still works.
    if (
      !this.panning &&
      !this.pinching &&
      e.touches.length === 1 &&
      this.state.scale > 1
    ) {
      this.panning = true;
      this.lastPanX = e.touches[0].clientX;
      this.lastPanY = e.touches[0].clientY;
    }

    // Movement beyond the tap-slop threshold invalidates tap intent and
    // breaks any in-progress double-tap sequence.
    if (this.tapCandidate && e.touches.length >= 1) {
      const dx = e.touches[0].clientX - this.tapStartX;
      const dy = e.touches[0].clientY - this.tapStartY;
      if (Math.hypot(dx, dy) > TAP_MAX_MOVEMENT_PX) {
        this.tapCandidate = false;
        this.lastTapTime = 0;
      }
    }

    if (this.pinching && e.touches.length === 2) {
      e.preventDefault();
      const settings = this.store.getSettings();
      const dist = this.touchDistance(e.touches[0], e.touches[1]);
      const mid = this.touchMidpoint(e.touches[0], e.touches[1]);
      const factor = dist / (this.pinchStartDistance || 1);
      const targetScale = clamp(this.pinchStartScale * factor, 1, settings.maxZoom);
      const midContainer = this.toContainer(mid.x, mid.y);
      // Position the image so pinchImgAnchor sits exactly under the current
      // midpoint: container_pos = (tx, ty) + anchor * scale → solve for tx/ty.
      this.setState({
        scale: targetScale,
        tx: midContainer.x - this.pinchImgAnchor.x * targetScale,
        ty: midContainer.y - this.pinchImgAnchor.y * targetScale
      });
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
    e.stopPropagation();
    if (this.pinching && e.touches.length < 2) {
      this.pinching = false;
      if (e.touches.length === 1 && this.state.scale > 1) {
        // Fingers rarely lift at the exact same instant. Reset 1-finger pan
        // tracking to the remaining finger's current position so the next
        // touchmove doesn't compute a delta against stale midpoint coords.
        this.panning = true;
        this.lastPanX = e.touches[0].clientX;
        this.lastPanY = e.touches[0].clientY;
      } else {
        this.panning = false;
      }
    }
    if (e.touches.length === 0) {
      this.panning = false;

      const touchDuration = performance.now() - this.tapStartTime;
      if (
        this.tapCandidate &&
        touchDuration <= TAP_MAX_DURATION_MS &&
        e.changedTouches.length >= 1
      ) {
        const t = e.changedTouches[0];
        const now = performance.now();
        const gap = now - this.lastTapTime;
        const distFromLast = Math.hypot(
          t.clientX - this.lastTapX,
          t.clientY - this.lastTapY
        );
        if (
          this.lastTapTime > 0 &&
          gap <= DOUBLE_TAP_MAX_GAP_MS &&
          distFromLast <= DOUBLE_TAP_MAX_DISTANCE_PX
        ) {
          this.handleDoubleTap(t.clientX, t.clientY);
          this.lastTapTime = 0;
        } else {
          this.lastTapTime = now;
          this.lastTapX = t.clientX;
          this.lastTapY = t.clientY;
        }
      }
      this.tapCandidate = false;
    }
  };

  private onGestureStart = (e: GestureEventLike): void => {
    e.stopPropagation();
    e.preventDefault();
    this.gestureStartScale = this.state.scale;
    this.pinchAnchor = this.toContainer(e.clientX, e.clientY);
  };

  private onGestureChange = (e: GestureEventLike): void => {
    e.stopPropagation();
    e.preventDefault();
    const settings = this.store.getSettings();
    const target = this.gestureStartScale * e.scale;
    const relativeFactor = target / this.state.scale;
    this.setState(
      zoomAt(this.state, relativeFactor, this.pinchAnchor, 1, settings.maxZoom)
    );
  };

  private onGestureEnd = (e: GestureEventLike): void => {
    e.stopPropagation();
  };

  private handleDoubleTap(clientX: number, clientY: number): void {
    const settings = this.store.getSettings();
    if (!settings.resetOnDoubleClick) return;
    this.cancelAnimation();
    if (this.state.scale > 1) {
      this.animateTo({ scale: 1, tx: 0, ty: 0 }, DOUBLE_TAP_ANIM_MS);
      return;
    }
    const targetScale = Math.min(DOUBLE_TAP_ZOOM_SCALE, settings.maxZoom);
    if (targetScale <= this.state.scale) return;
    const anchor = this.toContainer(clientX, clientY);
    const target = zoomAt(this.state, targetScale / this.state.scale, anchor, 1, settings.maxZoom);
    this.animateTo(target, DOUBLE_TAP_ANIM_MS);
  }

  private animateTo(target: ZoomState, durationMs: number): void {
    this.cancelAnimation();
    const start = { ...this.state };
    if (
      Math.abs(target.scale - start.scale) < 1e-6 &&
      Math.abs(target.tx - start.tx) < 1e-6 &&
      Math.abs(target.ty - start.ty) < 1e-6
    ) return;
    const startTime = performance.now();
    const step = (): void => {
      const now = performance.now();
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      this.setState({
        scale: start.scale + (target.scale - start.scale) * eased,
        tx: start.tx + (target.tx - start.tx) * eased,
        ty: start.ty + (target.ty - start.ty) * eased
      });
      if (t < 1) {
        this.animRaf = requestAnimationFrame(step);
      } else {
        this.animRaf = null;
      }
    };
    this.animRaf = requestAnimationFrame(step);
  }

  private cancelAnimation(): void {
    if (this.animRaf !== null) {
      cancelAnimationFrame(this.animRaf);
      this.animRaf = null;
    }
  }

  private setState(next: ZoomState): void {
    const bounds = this.bounds();
    const clamped = clampPan({ tx: next.tx, ty: next.ty }, { scale: next.scale, ...bounds });
    if (
      next.scale === this.state.scale &&
      clamped.tx === this.state.tx &&
      clamped.ty === this.state.ty
    ) return;
    this.state = { scale: next.scale, tx: clamped.tx, ty: clamped.ty };
    this.apply();
  }

  private apply(): void {
    this.img.style.transform = `translate(${this.state.tx}px, ${this.state.ty}px) scale(${this.state.scale})`;
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
