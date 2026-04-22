export interface ZoomState {
  scale: number;
  tx: number;
  ty: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface PanClampInput {
  scale: number;
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
  // Natural (no-transform) center of the image in container-relative coords.
  // When the image is dead-center, this equals (containerWidth/2, containerHeight/2).
  imageCenterX: number;
  imageCenterY: number;
  // Extra breathing room past the "cover" rule. When pan is possible (image
  // exceeds the viewport in that dimension), the image edge is allowed to
  // stop `padding` pixels inside the viewport edge rather than flush against
  // it. Ignored when there is no overflow in a dimension (the image stays
  // locked to center instead of jittering by ±padding).
  padding?: number;
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function zoomAt(
  state: ZoomState,
  factor: number,
  anchor: Point,
  min: number,
  max: number
): ZoomState {
  const newScale = clamp(state.scale * factor, min, max);
  const ratio = newScale / state.scale;
  const tx = anchor.x - ratio * (anchor.x - state.tx);
  const ty = anchor.y - ratio * (anchor.y - state.ty);
  return { scale: newScale, tx, ty };
}

export function clampPan(
  translation: { tx: number; ty: number },
  input: PanClampInput
): { tx: number; ty: number } {
  const scaledW = input.imageWidth * input.scale;
  const scaledH = input.imageHeight * input.scale;
  const padding = input.padding ?? 0;
  // Ramp padding in smoothly so crossing the overflow threshold (image just
  // barely exceeds container) doesn't suddenly widen the pan range by
  // `padding` pixels and let the current ty/tx snap to a new clamp boundary.
  const rawOverflowX = Math.max(0, (scaledW - input.containerWidth) / 2);
  const rawOverflowY = Math.max(0, (scaledH - input.containerHeight) / 2);
  const overflowX = rawOverflowX + Math.min(rawOverflowX, padding);
  const overflowY = rawOverflowY + Math.min(rawOverflowY, padding);
  // Translation that re-centers the image in the container.
  const centerTx = input.containerWidth / 2 - input.imageCenterX;
  const centerTy = input.containerHeight / 2 - input.imageCenterY;
  return {
    tx: clamp(translation.tx, centerTx - overflowX, centerTx + overflowX),
    ty: clamp(translation.ty, centerTy - overflowY, centerTy + overflowY)
  };
}
