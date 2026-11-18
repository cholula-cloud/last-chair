import { describe, expect, it } from "vitest";
import { TERRAIN } from "@/game/terrain";
import { BRUSH_WIDTHS } from "@/game/paintedTrail";
import {
  DIFFICULTY_COLOR, EDGE_MARGIN, MAX_RIBBON_SEGMENTS, MIN_RIBBON_SEGMENTS, UNVALIDATED_COLOR,
  brushRadius, darken, edgePanInput, edgePanVelocity, pixelWorldSize, ribbonColor, ribbonSegmentCount,
} from "./paintAssist";
import { ribbonGeometry } from "./TrailRibbon";

const W = 375;
const H = 812;

describe("edgePanInput", () => {
  it("is zero everywhere outside the margin", () => {
    expect(edgePanInput(W / 2, H / 2, W, H)).toEqual({ x: 0, z: 0 });
    expect(edgePanInput(W * EDGE_MARGIN, H * EDGE_MARGIN, W, H)).toEqual({ x: 0, z: 0 });
    expect(edgePanInput(W * (1 - EDGE_MARGIN) - 1, H * (1 - EDGE_MARGIN) - 1, W, H)).toEqual({ x: 0, z: 0 });
  });

  it("is proportional to depth into the margin and one at the edge", () => {
    const band = W * EDGE_MARGIN;
    expect(edgePanInput(band / 2, H / 2, W, H).x).toBeCloseTo(-0.5, 6);
    expect(edgePanInput(0, H / 2, W, H).x).toBeCloseTo(-1, 6);
    expect(edgePanInput(W, H / 2, W, H).x).toBeCloseTo(1, 6);
    expect(edgePanInput(W - band * 0.75, H / 2, W, H).x).toBeCloseTo(0.25, 6);
  });

  it("points up the screen near the top edge and down near the bottom edge", () => {
    expect(edgePanInput(W / 2, 0, W, H).z).toBeCloseTo(1, 6);
    expect(edgePanInput(W / 2, H, W, H).z).toBeCloseTo(-1, 6);
  });

  it("clamps a pointer that is beyond the edge", () => {
    expect(edgePanInput(-50, H + 50, W, H)).toEqual({ x: -1, z: -1 });
  });

  it("combines both axes in a corner", () => {
    const corner = edgePanInput(0, 0, W, H);
    expect(corner.x).toBeCloseTo(-1, 6);
    expect(corner.z).toBeCloseTo(1, 6);
  });

  it("is zero for a screen with no size", () => {
    expect(edgePanInput(0, 0, 0, 0)).toEqual({ x: 0, z: 0 });
  });
});

describe("edgePanVelocity", () => {
  const right = { x: 1, z: 0 };
  const forward = { x: 0, z: -1 };

  it("is zero without input", () => {
    expect(edgePanVelocity({ x: 0, z: 0 }, right, forward, 40)).toEqual({ x: 0, z: 0 });
  });

  it("pans right and forward along the camera's ground directions", () => {
    const v = edgePanVelocity({ x: 1, z: 0 }, right, forward, 40, 0.5);
    expect(v.x).toBeCloseTo(20, 6);
    expect(v.z).toBeCloseTo(0, 6);
    const up = edgePanVelocity({ x: 0, z: 1 }, right, forward, 40, 0.5);
    expect(up.x).toBeCloseTo(0, 6);
    expect(up.z).toBeCloseTo(-20, 6);
  });

  it("scales with depth and with camera distance", () => {
    const half = edgePanVelocity({ x: 0.5, z: 0 }, right, forward, 40);
    const full = edgePanVelocity({ x: 1, z: 0 }, right, forward, 40);
    expect(half.x).toBeCloseTo(full.x / 2, 6);
    expect(edgePanVelocity({ x: 1, z: 0 }, right, forward, 80).x).toBeCloseTo(full.x * 2, 6);
  });
});

describe("ribbonSegmentCount", () => {
  it("never drops below the minimum", () => {
    expect(ribbonSegmentCount(0)).toBe(MIN_RIBBON_SEGMENTS);
    expect(ribbonSegmentCount(12)).toBe(MIN_RIBBON_SEGMENTS);
  });

  it("uses one segment per stroke point above the minimum", () => {
    expect(ribbonSegmentCount(41)).toBe(41);
    expect(ribbonSegmentCount(300)).toBe(300);
  });

  it("caps very long strokes", () => {
    expect(ribbonSegmentCount(50_000)).toBe(MAX_RIBBON_SEGMENTS);
  });
});

describe("brush and ribbon style", () => {
  it("sizes the brush from the true width in feet", () => {
    for (const width of BRUSH_WIDTHS) {
      expect(brushRadius(width) * 2 * TERRAIN.horizontalFeetPerUnit).toBeCloseTo(width, 6);
    }
    expect(brushRadius(100)).toBeGreaterThan(brushRadius(60));
  });

  it("converts a screen pixel to world units", () => {
    expect(pixelWorldSize(10, 90, 1000)).toBeCloseTo(0.02, 6);
    expect(pixelWorldSize(20, 90, 1000)).toBeCloseTo(0.04, 6);
  });

  it("colours a validated stroke by difficulty and an unvalidated one warm grey", () => {
    expect(ribbonColor("green", true)).toBe(DIFFICULTY_COLOR.green);
    expect(ribbonColor("blue", true)).toBe("#195dc4");
    expect(ribbonColor("black", true)).toBe("#28263e");
    expect(ribbonColor("blue", false)).toBe(UNVALIDATED_COLOR);
  });

  it("darkens an edge band", () => {
    expect(darken("#ffffff", 0.5)).toBe("#808080");
    expect(darken("#000000")).toBe("#000000");
  });
});

describe("ribbonGeometry", () => {
  const path = [{ x: 0, z: 0 }, { x: 1, z: 3 }, { x: 0, z: 6 }];
  const widths = [60, 60, 60];

  it("builds one cross-section per segment plus one, with a colour for every vertex", () => {
    const geometry = ribbonGeometry(path, widths, 50, "#197641", []);
    const position = geometry.getAttribute("position");
    const color = geometry.getAttribute("color");
    expect(position.count % 51).toBe(0);
    expect(color.count).toBe(position.count);
    expect(geometry.getIndex()!.count).toBeGreaterThan(50 * 6);
    geometry.dispose();
  });

  it("gives more cross-sections to more segments", () => {
    const a = ribbonGeometry(path, widths, 40, "#197641", []);
    const b = ribbonGeometry(path, widths, 80, "#197641", []);
    expect(b.getAttribute("position").count).toBeGreaterThan(a.getAttribute("position").count);
    a.dispose();
    b.dispose();
  });
});
