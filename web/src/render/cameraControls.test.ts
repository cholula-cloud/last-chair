import { describe, expect, it } from "vitest";
import { distanceOutsideLease, leaseBounds } from "@/game/lease";
import { TERRAIN } from "@/game/terrain";
import { homeView } from "./cameraFraming";
import {
  DOUBLE_TAP_MAX_DIST_PX,
  DOUBLE_TAP_MAX_GAP_MS,
  FOCUS_DISTANCE,
  HARD_MARGIN_FRACTION,
  MAX_DISTANCE,
  MIN_DISTANCE,
  LEASE_CAMERA_MARGIN,
  LEASE_TARGET_MARGIN,
  clampToLease,
  insideLease,
  PLAY_AREA as A,
  playArea,
  SOFT_MARGIN,
  TAP_MAX_MOVE_PX,
  TAP_MAX_MS,
  classifyPointer,
  clampTarget,
  hardLimitOnAxis,
  elevationOf,
  insideArea,
  marchToTerrain,
  PAINT_ELEVATION,
  paintTiltElevation,
  withElevation,
  type PointerEv,
} from "./cameraControls";

const cx = (A.xMin + A.xMax) / 2;
const cz = (A.zMin + A.zMax) / 2;
const hardX = (A.xMax - A.xMin) * HARD_MARGIN_FRACTION;
const hardZ = (A.zMax - A.zMin) * HARD_MARGIN_FRACTION;

describe("play area", () => {
  it("is the lease bounding box plus the camera margin", () => {
    const b = leaseBounds();
    expect(LEASE_CAMERA_MARGIN).toBe(8);
    expect(A).toEqual({ xMin: b.xMin - 8, xMax: b.xMax + 8, zMin: b.zMin - 8, zMax: b.zMax + 8 });
    expect(playArea(TERRAIN, 0)).toEqual(b);
  });

  it("keeps the camera over the lease and well inside the map", () => {
    for (const p of TERRAIN.lease!) {
      expect(p.x).toBeGreaterThanOrEqual(A.xMin);
      expect(p.x).toBeLessThanOrEqual(A.xMax);
      expect(p.z).toBeGreaterThanOrEqual(A.zMin);
      expect(p.z).toBeLessThanOrEqual(A.zMax);
    }
    expect(A.xMax - A.xMin).toBeLessThan(TERRAIN.bounds.xMax - TERRAIN.bounds.xMin);
  });
});

describe("lease clamp", () => {
  it("leaves the target alone on the lease and within the margin", () => {
    expect(clampToLease(TERRAIN.base)).toEqual(TERRAIN.base);
    const edge = TERRAIN.lease![0];
    const out = { x: edge.x - 1, z: edge.z - 1 };
    expect(distanceOutsideLease(out)).toBeLessThan(LEASE_TARGET_MARGIN);
    expect(clampToLease(out)).toEqual(out);
  });

  it("stops a target dragged far outside close to the outline, at the polygon rather than the box", () => {
    // The north-west box corner is far from the polygon.
    const b = leaseBounds();
    const corner = { x: b.xMin, z: b.zMin };
    expect(distanceOutsideLease(corner)).toBeGreaterThan(8);
    const clamped = clampToLease(corner);
    expect(distanceOutsideLease(clamped)).toBeLessThan(LEASE_TARGET_MARGIN + 4);
    const resting = insideLease(corner);
    expect(distanceOutsideLease(resting)).toBeCloseTo(LEASE_TARGET_MARGIN, 5);
    expect(distanceOutsideLease(clampToLease({ x: 500, z: 500 }))).toBeLessThan(LEASE_TARGET_MARGIN + 7);
  });

  it("is monotonic: pulling further out never moves the target further out by more than the cap", () => {
    let last = 0;
    for (let o = 0; o < 80; o += 4) {
      const d = distanceOutsideLease(clampToLease({ x: TERRAIN.lease![4].x + o, z: TERRAIN.lease![4].z }));
      expect(d).toBeGreaterThanOrEqual(last - 1e-9);
      last = d;
    }
  });
});

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

  it("clamps hard beyond area + soft margin + 15% of its size", () => {
    const { x: limitX } = hardLimitOnAxis(A, SOFT_MARGIN);
    const a = clampTarget({ x: A.xMax + limitX + 1, z: cz }, A, SOFT_MARGIN);
    const b = clampTarget({ x: A.xMax + 500, z: cz }, A, SOFT_MARGIN);
    expect(a.x).toBe(b.x);
    expect(b.x).toBeLessThanOrEqual(A.xMax + limitX + 1e-6);
    expect(a.x).toBeGreaterThan(A.xMax);
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
      const v = homeView(aspect);
      expect(clampTarget(v.target, A, SOFT_MARGIN)).toEqual({ x: v.target.x, z: v.target.z });
      expect(v.distance).toBeGreaterThanOrEqual(MIN_DISTANCE);
      expect(v.distance).toBeLessThanOrEqual(MAX_DISTANCE);
      expect(v.distance).toBeLessThanOrEqual(FOCUS_DISTANCE * 5);
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

describe("paint tilt", () => {
  const target = { x: 2, y: 1, z: -3 };
  const position = { x: 12, y: 9, z: 7 };

  it("measures the elevation above the horizon", () => {
    expect(elevationOf({ x: 0, y: 0, z: 0 }, { x: 10, y: 10, z: 0 })).toBeCloseTo(Math.PI / 4, 6);
    expect(elevationOf(target, target)).toBe(0);
  });

  it("raises the camera to a new elevation and keeps its distance and heading", () => {
    const next = withElevation(target, position, 1.2);
    const dist = (p: typeof position) => Math.hypot(p.x - target.x, p.y - target.y, p.z - target.z);
    expect(dist(next)).toBeCloseTo(dist(position), 6);
    expect(elevationOf(target, next)).toBeCloseTo(1.2, 6);
    expect(Math.atan2(next.x - target.x, next.z - target.z)).toBeCloseTo(Math.atan2(position.x - target.x, position.z - target.z), 6);
  });

  it("restores the original view by applying the saved elevation", () => {
    const saved = elevationOf(target, position);
    const back = withElevation(target, withElevation(target, position, PAINT_ELEVATION), saved);
    expect(back.x).toBeCloseTo(position.x, 6);
    expect(back.y).toBeCloseTo(position.y, 6);
    expect(back.z).toBeCloseTo(position.z, 6);
  });

  it("only tilts a camera that is lower than the paint elevation", () => {
    expect(paintTiltElevation(0.6)).toBe(PAINT_ELEVATION);
    expect(paintTiltElevation(PAINT_ELEVATION)).toBeNull();
    expect(paintTiltElevation(1.25)).toBeNull();
  });
});
