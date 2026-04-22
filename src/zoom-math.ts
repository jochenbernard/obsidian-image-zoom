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
  const overflowX = Math.max(0, (scaledW - input.containerWidth) / 2);
  const overflowY = Math.max(0, (scaledH - input.containerHeight) / 2);
  return {
    tx: clamp(translation.tx, -overflowX, overflowX),
    ty: clamp(translation.ty, -overflowY, overflowY)
  };
}
