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
  const centered = {
    imageWidth: 200,
    imageHeight: 100,
    containerWidth: 200,
    containerHeight: 100,
    imageCenterX: 100,
    imageCenterY: 50
  };

  it("keeps (0,0) at scale 1 with matching image/container", () => {
    const result = clampPan({ tx: 0, ty: 0 }, { scale: 1, ...centered });
    expect(result).toEqual({ tx: 0, ty: 0 });
  });

  it("snaps translation to 0 when scale is 1 (image fits exactly)", () => {
    const result = clampPan({ tx: 50, ty: 20 }, { scale: 1, ...centered });
    expect(result).toEqual({ tx: 0, ty: 0 });
  });

  it("allows pan up to edges when image is larger than container", () => {
    const result = clampPan({ tx: 500, ty: 0 }, { scale: 2, ...centered });
    expect(result.tx).toBe(100);
  });

  it("clamps negative pan symmetrically when centered", () => {
    const result = clampPan({ tx: -500, ty: 0 }, { scale: 2, ...centered });
    expect(result.tx).toBe(-100);
  });

  it("extends the pan range by padding when there is overflow", () => {
    const result = clampPan({ tx: 500, ty: 0 }, { scale: 2, padding: 20, ...centered });
    expect(result.tx).toBe(120);
  });

  it("does not apply padding when there is no overflow (locks to center)", () => {
    const result = clampPan({ tx: 500, ty: 0 }, { scale: 1, padding: 20, ...centered });
    expect(result.tx).toBe(0);
  });

  it("shifts the allowed range when the image's natural center is off-center", () => {
    // Image is horizontally centered but vertically top-aligned inside a tall container.
    //   container: 200 x 200
    //   image fits: 200 x 100, positioned at top (top=0, so imageCenterY=50)
    //   at scale 2, image visual height = 200, so no vertical overflow; ty should snap to 50 (re-center).
    const topAligned = {
      imageWidth: 200,
      imageHeight: 100,
      containerWidth: 200,
      containerHeight: 200,
      imageCenterX: 100,
      imageCenterY: 50
    };
    const result = clampPan({ tx: 0, ty: 0 }, { scale: 2, ...topAligned });
    expect(result.ty).toBe(50);
  });

  it("allows asymmetric pan when the image's natural center is off-center and overflow exists", () => {
    // Container 200x100, image 200x100 positioned with top=0 (imageCenterY=50, but container center is 50 too).
    // Change scenario: container 200x200, fit image 200x200 top-aligned so its center is at y=100 (already centered).
    // Use instead: image 200x100 top-aligned in 200x100 container... equivalent to centered.
    // Actual asymmetric scenario: image 200x50 in 200x100 container, top-aligned (imageCenterY=25).
    //   centerTy = 100/2 - 25 = 25 (recenter pushes ty down by 25).
    //   at scale 4, image height = 200, overflow = (200-100)/2 = 50.
    //   range for ty: [25-50, 25+50] = [-25, 75].
    const topAligned = {
      imageWidth: 200,
      imageHeight: 50,
      containerWidth: 200,
      containerHeight: 100,
      imageCenterX: 100,
      imageCenterY: 25
    };
    const tooFarUp = clampPan({ tx: 0, ty: -999 }, { scale: 4, ...topAligned });
    expect(tooFarUp.ty).toBe(-25);
    const tooFarDown = clampPan({ tx: 0, ty: 999 }, { scale: 4, ...topAligned });
    expect(tooFarDown.ty).toBe(75);
  });
});
