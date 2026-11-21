import { beforeEach, describe, expect, it } from "vitest";
import { REFERENCE_TOPS } from "@/game/descent";
import { depthInsideLease, onLease } from "@/game/lease";
import { TERRAIN } from "@/game/terrain";
import {
  FADE_BAND,
  FAR_KEEP,
  FAR_REACH,
  LEASE_CELL,
  LIFT_CLEAR,
  TRAIL_CLEAR,
  _chunkSpots,
  _clearForestCache,
  farForest,
  forested,
  hash01,
  keepShare,
  leaseForest,
  sameForestClearings,
} from "./forest";
import { distSqToLiftLine, distSqToPolyline, trailPolyline } from "./trail";

const lineAt = (top: { x: number; z: number }) => ({ bottom: TERRAIN.base, top });
const DEFAULT_LINES = REFERENCE_TOPS.map(lineAt);
const clearings = { lines: DEFAULT_LINES };
const home = TERRAIN.base;
const all = (cells: ReturnType<typeof leaseForest>) => cells.flatMap((c) => c.pines);

beforeEach(() => _clearForestCache());

describe("chunk candidates", () => {
  it("returns identical spots every time, so the forest never changes between visits", () => {
    const a = _chunkSpots(0, 0);
    expect(a).toEqual(_chunkSpots(0, 0));
    expect(a.length).toBeGreaterThan(10);
  });

  it("keeps adjacent chunk edges at least 0.3 u apart", () => {
    const east = _chunkSpots(1, 0).filter((p) => p.x < 32 + 2);
    const west = _chunkSpots(0, 0).filter((p) => p.x > 32 - 2);
    for (const e of east) {
      for (const w of west) expect(Math.hypot(e.x - w.x, e.z - w.z)).toBeGreaterThanOrEqual(0.3);
    }
  });
});

describe("clearings", () => {
  it("does not invent a trail clearing when a lift has no trail", () => {
    const line = DEFAULT_LINES[0];
    const point = _chunkSpots(-1, -1).find((p) =>
      forested(p.x, p.z, { lines: [], paths: [] }) &&
      distSqToPolyline(p.x, p.z, trailPolyline(line, 28)) < TRAIL_CLEAR ** 2 &&
      distSqToLiftLine(p.x, p.z, line) > LIFT_CLEAR ** 2,
    );
    expect(point).toBeDefined();
    expect(forested(point!.x, point!.z, { lines: [line], paths: [] })).toBe(true);
  });

  it("clears lifts, trails, apron and road", () => {
    for (const line of DEFAULT_LINES) {
      expect(forested(line.top.x, line.top.z, clearings)).toBe(false);
      const mid = trailPolyline(line, 28)[12];
      expect(forested(mid.x, mid.z, clearings)).toBe(false);
      expect(distSqToPolyline(mid.x, mid.z, trailPolyline(line, 28))).toBeLessThanOrEqual(TRAIL_CLEAR ** 2 + 0.5);
    }
    expect(forested(home.x, home.z, clearings)).toBe(false);
  });

  it("clears the road only where the road runs", () => {
    expect(forested(0, 24, { lines: [], paths: [] })).toBe(false);
    expect(forested(80, 24, { lines: [], paths: [] })).toBe(true);
  });

  it("invalidates the lease forest when a lift or starter path changes", () => {
    const firstLift = DEFAULT_LINES[0];
    const placedLift = DEFAULT_LINES[1];
    const firstPath = trailPolyline(firstLift, 28);
    const previous = { lines: [firstLift], paths: [firstPath] };
    const next = { lines: [firstLift, placedLift], paths: [firstPath, trailPolyline(placedLift, 28)] };
    expect(sameForestClearings(previous, structuredClone(previous))).toBe(true);
    expect(sameForestClearings(previous, next)).toBe(false);
    expect(sameForestClearings(next, { ...next, paths: [firstPath, firstPath] })).toBe(false);

    const key = (spot: { x: number; z: number }) => `${spot.x}:${spot.z}`;
    const before = all(leaseForest(previous));
    const after = new Set(all(leaseForest(next)).map(key));
    const corridorTrees = before.filter((spot) => distSqToLiftLine(spot.x, spot.z, placedLift) < LIFT_CLEAR ** 2);
    expect(corridorTrees.length).toBeGreaterThan(0);
    expect(corridorTrees.some((spot) => after.has(key(spot)))).toBe(false);
  });
});

describe("the lease forest", () => {
  const cells = leaseForest(clearings);
  const trees = all(cells);

  it("stands only on the lease and depends on nothing but the clearings", () => {
    expect(trees.length).toBeGreaterThan(3000);
    expect(trees.every((t) => onLease(t))).toBe(true);
    expect(all(leaseForest(clearings)).map((t) => `${t.x}:${t.z}`)).toEqual(trees.map((t) => `${t.x}:${t.z}`));
  });

  it("uses one scale range everywhere, with no growth with distance", () => {
    const sizes = trees.map((t) => t.s);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(0.68);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(1.42 + 1e-9);
    const far = trees.filter((t) => Math.hypot(t.x - home.x, t.z - home.z) > 40).map((t) => t.s);
    const near = trees.filter((t) => Math.hypot(t.x - home.x, t.z - home.z) < 20).map((t) => t.s);
    expect(Math.max(...far)).toBeLessThanOrEqual(Math.max(...near) + 0.05);
  });

  it("has full density deep inside the lease", () => {
    const deep = _allCandidatesDeep();
    const kept = trees.filter((t) => depthInsideLease(t) > FADE_BAND);
    // Every candidate that clears the clearings stands: only clearings remove any.
    expect(kept.length).toBeGreaterThan(0.5 * deep);
  });

  it("groups trees into cells no larger than a cell", () => {
    expect(cells.length).toBeGreaterThan(1);
    for (const cell of cells) {
      const [cx, cz] = cell.key.split(",").map(Number);
      for (const t of cell.pines) {
        const b = TERRAIN.lease!;
        const xMin = Math.min(...b.map((p) => p.x));
        const zMin = Math.min(...b.map((p) => p.z));
        expect(Math.floor((t.x - xMin) / LEASE_CELL)).toBe(cx);
        expect(Math.floor((t.z - zMin) / LEASE_CELL)).toBe(cz);
      }
    }
  });

  it("keeps trees out of cleared ground", () => {
    for (const t of trees) {
      for (const line of DEFAULT_LINES) expect(distSqToLiftLine(t.x, t.z, line)).toBeGreaterThanOrEqual(LIFT_CLEAR ** 2 - 1e-9);
    }
    expect(trees.some((t) => Math.hypot(t.x - home.x, t.z - home.z) < 2.5)).toBe(false);
  });
});

function _allCandidatesDeep(): number {
  let n = 0;
  for (let cz = -2; cz <= 1; cz++) {
    for (let cx = -2; cx <= 1; cx++) {
      for (const c of _chunkSpots(cx, cz)) if (onLease(c) && depthInsideLease(c) > FADE_BAND && forested(c.x, c.z, clearings)) n++;
    }
  }
  return n;
}

describe("the edge band", () => {
  it("eases density from full to the far density across the band, with no step at the edge", () => {
    expect(keepShare(TERRAIN.base)).toBe(1);
    const edge = { x: (TERRAIN.lease![0].x + TERRAIN.lease![1].x) / 2, z: (TERRAIN.lease![0].z + TERRAIN.lease![1].z) / 2 };
    expect(keepShare(edge)).toBeCloseTo(FAR_KEEP, 6);
    let last = keepShare(edge);
    for (let step = 1; step <= 6; step++) {
      // Walk inward along the lease centre line: density never falls.
      const p = { x: edge.x + (TERRAIN.base.x - edge.x) * (step * 0.03), z: edge.z + (TERRAIN.base.z - edge.z) * (step * 0.03) };
      const share = keepShare(p);
      expect(share).toBeGreaterThanOrEqual(last - 1e-9);
      last = share;
    }
    expect(keepShare({ x: 500, z: 0 })).toBe(FAR_KEEP);
  });
});

describe("the far forest", () => {
  const far = farForest();

  it("stands only beyond the lease, sparse, and within reach", () => {
    expect(far.length).toBeGreaterThan(500);
    expect(far.every((t) => !onLease(t))).toBe(true);
    expect(far.length).toBeLessThan(8000);
    // The same scale range as a lease tree: far trees never grow.
    expect(Math.min(...far.map((t) => t.s))).toBeGreaterThanOrEqual(0.68);
    expect(Math.max(...far.map((t) => t.s))).toBeLessThanOrEqual(1.42 + 1e-9);
  });

  it("is built once", () => {
    const first = farForest();
    expect(farForest()).toBe(first);
  });

  it("thins to nothing past its reach", () => {
    const farthest = far.reduce((m, t) => Math.max(m, t.x < 0 ? -t.x : t.x), 0);
    expect(farthest).toBeLessThan(180);
    expect(FAR_REACH).toBeGreaterThan(FADE_BAND);
  });
});

describe("hash stability", () => {
  it("hash01 is stable", () => {
    expect(hash01(1, 2, 3)).toBe(hash01(1, 2, 3));
  });
});

describe("far trees and trails at the lease edge", () => {
  it("clears far trees from a trail that runs along the lease edge", () => {
    const poly = TERRAIN.lease!;
    const a = poly[3];
    const b = poly[4];
    const path = Array.from({ length: 12 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / 11, z: a.z + ((b.z - a.z) * i) / 11 }));
    const clears = { lines: [], paths: [path] };
    const before = farForest();
    const after = farForest(clears);
    expect(after.length).toBeLessThan(before.length);
    const line = trailPolyline({ bottom: path[0], top: path[11] }, 28);
    for (const t of after) expect(distSqToPolyline(t.x, t.z, path.length > 1 ? path : line)).toBeGreaterThanOrEqual(0);
  });
});
