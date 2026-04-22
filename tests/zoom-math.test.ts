import { describe, it, expect } from "vitest";
import { clamp, zoomAt, clampPan } from "../src/zoom-math";

describe("clamp", () => {
  it("returns the value when inside bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("clamps below min", () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });
  it("clamps above max", () => {
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe("zoomAt", () => {
  it("leaves translation unchanged when anchor is at the origin", () => {
    const next = zoomAt(
      { scale: 1, tx: 0, ty: 0 },
      2,
      { x: 0, y: 0 },
      0.1,
      10
    );
    expect(next).toEqual({ scale: 2, tx: 0, ty: 0 });
  });

  it("keeps the anchor point stationary in viewport coords", () => {
    const next = zoomAt(
      { scale: 1, tx: 0, ty: 0 },
      2,
      { x: 100, y: 50 },
      0.1,
      10
    );
    expect(next.scale).toBe(2);
    expect(next.tx).toBe(-100);
    expect(next.ty).toBe(-50);
  });

  it("clamps scale to max", () => {
    const next = zoomAt({ scale: 5, tx: 0, ty: 0 }, 10, { x: 0, y: 0 }, 0.1, 20);
    expect(next.scale).toBe(20);
  });

  it("clamps scale to min", () => {
    const next = zoomAt({ scale: 1, tx: 0, ty: 0 }, 0.001, { x: 0, y: 0 }, 0.5, 10);
    expect(next.scale).toBe(0.5);
  });
});

describe("clampPan", () => {
  it("keeps (0,0) at scale 1 with matching image/container", () => {
    const result = clampPan(
      { tx: 0, ty: 0 },
      { scale: 1, imageWidth: 200, imageHeight: 100, containerWidth: 200, containerHeight: 100 }
    );
    expect(result).toEqual({ tx: 0, ty: 0 });
  });

  it("snaps translation to 0 when scale is 1 (image fits exactly)", () => {
    const result = clampPan(
      { tx: 50, ty: 20 },
      { scale: 1, imageWidth: 200, imageHeight: 100, containerWidth: 200, containerHeight: 100 }
    );
    expect(result).toEqual({ tx: 0, ty: 0 });
  });

  it("allows pan up to edges when image is larger than container", () => {
    const result = clampPan(
      { tx: 500, ty: 0 },
      { scale: 2, imageWidth: 200, imageHeight: 100, containerWidth: 200, containerHeight: 100 }
    );
    expect(result.tx).toBe(100);
  });

  it("clamps negative pan symmetrically", () => {
    const result = clampPan(
      { tx: -500, ty: 0 },
      { scale: 2, imageWidth: 200, imageHeight: 100, containerWidth: 200, containerHeight: 100 }
    );
    expect(result.tx).toBe(-100);
  });
});
