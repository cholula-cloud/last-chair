import { describe, expect, it } from "vitest";
import { homeView } from "./cameraFraming";
import {
  DOUBLE_TAP_MAX_DIST_PX,
  DOUBLE_TAP_MAX_GAP_MS,
  HARD_MARGIN_FRACTION,
  PLAY_AREA as A,
  TAP_MAX_MOVE_PX,
  TAP_MAX_MS,
  classifyPointer,
  clampTarget,
  insideArea,
  marchToTerrain,
  type PointerEv,
} from "./cameraControls";

const cx = (A.xMin + A.xMax) / 2;
const cz = (A.zMin + A.zMax) / 2;
const hardX = (A.xMax - A.xMin) * HARD_MARGIN_FRACTION;
const hardZ = (A.zMax - A.zMin) * HARD_MARGIN_FRACTION;

describe("clampTarget", () => {
  it("leaves points inside the area unchanged", () => {
    expect(clampTarget({ x: cx, z: cz }, A, 0.6)).toEqual({ x: cx, z: cz });
    expect(clampTarget({ x: A.xMax, z: A.zMin }, A, 0.6)).toEqual({ x: A.xMax, z: A.zMin });
  });

  it("eases overshoot in the soft zone: outside the area, but less than the raw overshoot", () => {
    const out = clampTarget({ x: A.xMax + 0.4, z: cz }, A, 0.6);
    expect(out.x).toBeGreaterThan(A.xMax);
    expect(out.x).toBeLessThan(A.xMax + 0.4);
  });

  it("is monotone through the soft zone", () => {
    let prev = A.xMax;
    for (let o = 0.1; o < hardX; o += 0.1) {
      const x = clampTarget({ x: A.xMax + o, z: cz }, A, 0.6).x;
      expect(x).toBeGreaterThanOrEqual(prev);
      prev = x;
    }
  });

  it("clamps hard beyond area + 15% of its size", () => {
    const a = clampTarget({ x: A.xMax + hardX + 1, z: cz }, A, 0.6);
    const b = clampTarget({ x: A.xMax + 500, z: cz }, A, 0.6);
    expect(a.x).toBe(b.x);
    expect(b.x).toBeLessThanOrEqual(A.xMax + hardX);
  });

  it("is symmetric on all four sides", () => {
    const o = 5;
    const px = clampTarget({ x: A.xMax + o, z: cz }, A, 0.6).x - A.xMax;
    const nx = A.xMin - clampTarget({ x: A.xMin - o, z: cz }, A, 0.6).x;
    const pz = clampTarget({ x: cx, z: A.zMax + o }, A, 0.6).z - A.zMax;
    const nz = A.zMin - clampTarget({ x: cx, z: A.zMin - o }, A, 0.6).z;
    expect(px).toBeCloseTo(nx, 10);
    expect(pz).toBeCloseTo(nz, 10);
    expect(px).toBeGreaterThan(0);
    expect(pz).toBeGreaterThan(0);
    expect(hardX).not.toBe(hardZ); // the area is not square, so each axis uses its own size
  });

  it("returns the area center for non-finite input", () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(clampTarget({ x: bad, z: 0 }, A, 0.6)).toEqual({ x: cx, z: cz });
      expect(clampTarget({ x: 0, z: bad }, A, 0.6)).toEqual({ x: cx, z: cz });
    }
  });

  it("insideArea snaps to the nearest edge", () => {
    expect(insideArea({ x: 99, z: -99 }, A)).toEqual({ x: A.xMax, z: A.zMin });
  });

  it("keeps the home view target inside the play area in both orientations", () => {
    for (const aspect of [0.46, 1.0, 2.17]) {
      const t = homeView(aspect).target;
      expect(clampTarget(t, A, 0.6)).toEqual({ x: t.x, z: t.z });
    }
  });
});

const g = (id: number, t0: number, x: number, y: number, dt: number, moveTo?: [number, number]): PointerEv[] => [
  { id, type: "down", x, y, t: t0 },
  ...(moveTo ? [{ id, type: "move" as const, x: moveTo[0], y: moveTo[1], t: t0 + dt / 2 }] : []),
  { id, type: "up", x: moveTo?.[0] ?? x, y: moveTo?.[1] ?? y, t: t0 + dt },
];

describe("classifyPointer", () => {
  it("a short still press is a TAP", () => {
    expect(classifyPointer(g(1, 0, 100, 100, 120))).toBe("TAP");
  });

  it("is a DRAG once it moves the tap distance", () => {
    expect(classifyPointer(g(1, 0, 100, 100, 100, [100 + TAP_MAX_MOVE_PX - 1, 100]))).toBe("TAP");
    expect(classifyPointer(g(1, 0, 100, 100, 100, [100 + TAP_MAX_MOVE_PX, 100]))).toBe("DRAG");
  });

  it("is a DRAG once it lasts the tap time", () => {
    expect(classifyPointer(g(1, 0, 100, 100, TAP_MAX_MS - 1))).toBe("TAP");
    expect(classifyPointer(g(1, 0, 100, 100, TAP_MAX_MS))).toBe("DRAG");
  });

  it("a second tap near and soon after the first is a DOUBLE_TAP", () => {
    const prev = { x: 100, y: 100, t: 100 };
    const next = g(1, 100 + DOUBLE_TAP_MAX_GAP_MS, 100 + DOUBLE_TAP_MAX_DIST_PX, 100, 80);
    expect(classifyPointer(next, prev)).toBe("DOUBLE_TAP");
  });

  it("two taps too far apart or too slow are two taps", () => {
    const prev = { x: 100, y: 100, t: 100 };
    expect(classifyPointer(g(1, 200, 100 + DOUBLE_TAP_MAX_DIST_PX + 1, 100, 80), prev)).toBe("TAP");
    expect(classifyPointer(g(1, 100 + DOUBLE_TAP_MAX_GAP_MS + 1, 100, 100, 80), prev)).toBe("TAP");
  });

  it("is not a tap with more than one pointer, or without an up", () => {
    const two = [...g(1, 0, 100, 100, 100), ...g(2, 10, 140, 100, 100)].sort((a, b) => a.t - b.t);
    expect(classifyPointer(two)).toBe("DRAG");
    expect(classifyPointer([{ id: 1, type: "down", x: 0, y: 0, t: 0 }])).toBe("DRAG");
    expect(classifyPointer([])).toBe("DRAG");
  });
});

describe("marchToTerrain", () => {
  const flat = () => 1;
  it("finds where a downward ray meets the ground", () => {
    const hit = marchToTerrain({ x: 0, y: 5, z: 0 }, { x: 0.6, y: -0.8, z: 0 }, flat);
    expect(hit?.x).toBeCloseTo(3, 2); // y drops 4 over 5 units of path, so x advances 3
  });
  it("returns null for a ray that never reaches the ground", () => {
    expect(marchToTerrain({ x: 0, y: 5, z: 0 }, { x: 1, y: 0.1, z: 0 }, flat, 20)).toBeNull();
  });
});
