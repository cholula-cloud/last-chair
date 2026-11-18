import { describe, expect, it, beforeEach } from "vitest";
import { REFERENCE_TOPS } from "@/game/descent";
import { TERRAIN } from "@/game/terrain";
import {
  CHUNK_SIZE,
  NEAR_RADIUS,
  MID_RADIUS,
  REBUILD_MOVE,
  TRAIL_CLEAR,
  LIFT_CLEAR,
  _chunkSpots,
  _clearChunkCache,
  chunkKey,
  forestForTarget,
  forested,
  getChunk,
  sameForestClearings,
  shouldRebuildForest,
  hash01,
} from "./forest";
import { distSqToLiftLine, distSqToPolyline, trailPolyline } from "./trail";

const lineAt = (top: { x: number; z: number }) => ({ bottom: TERRAIN.base, top });
const DEFAULT_LINES = REFERENCE_TOPS.map(lineAt);
const clearings = { lines: DEFAULT_LINES };
const home = TERRAIN.base;

beforeEach(() => _clearChunkCache());

describe("chunk candidates", () => {
  it("returns identical spots for the same chunk key", () => {
    const a = getChunk(0, 0);
    const b = getChunk(0, 0);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(10);
  });

  it("keeps adjacent chunk edges at least 0.3 u apart", () => {
    const east = getChunk(1, 0).filter((p) => p.x < CHUNK_SIZE + 2);
    const west = getChunk(0, 0).filter((p) => p.x > CHUNK_SIZE - 2);
    for (let i = 0; i < east.length; i++) {
      for (let j = 0; j < west.length; j++) {
        expect(Math.hypot(east[i].x - west[j].x, east[i].z - west[j].z)).toBeGreaterThanOrEqual(
          0.3,
        );
      }
    }
  });

  it("mid tier keep is a stricter subset of near keep", () => {
    const spots = _chunkSpots(2, -1);
    const nearKeeps = spots.filter((s) => s.keep < 1).length;
    const midKeeps = spots.filter((s) => s.keep < 0.4).length;
    expect(midKeeps).toBeLessThanOrEqual(nearKeeps);
  });
});

describe("forested and forestForTarget", () => {
  it("does not invent a trail clearing when a lift has no trail", () => {
    const line = DEFAULT_LINES[0];
    const candidates = _chunkSpots(-1, -1);
    const point = candidates.find((p) =>
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
      expect(distSqToPolyline(mid.x, mid.z, trailPolyline(line, 28))).toBeLessThanOrEqual(
        TRAIL_CLEAR ** 2 + 0.5,
      );
    }
    expect(forested(home.x, home.z, clearings)).toBe(false);
  });

  it("forest target yields near and mid counts in expected bands", () => {
    const target = { x: -18, z: 0 };
    const { near, birch, mid } = forestForTarget(target, clearings);
    const nearN = near[0].length + near[1].length + near[2].length + birch.length;
    expect(nearN).toBeGreaterThanOrEqual(80);
    expect(nearN).toBeLessThanOrEqual(900);
    expect(mid.length).toBeGreaterThanOrEqual(400);
    expect(mid.length).toBeLessThanOrEqual(5000);
  });

  it("rebuilds after a 7 u move, not after 5 u", () => {
    const a = { x: 0, z: 0 };
    expect(shouldRebuildForest({ x: 5, z: 0 }, a)).toBe(false);
    expect(shouldRebuildForest({ x: 7, z: 0 }, a)).toBe(true);
    expect(shouldRebuildForest(home, null)).toBe(true);
    expect(REBUILD_MOVE).toBe(6);
    expect(NEAR_RADIUS).toBe(12);
    expect(MID_RADIUS).toBe(45);
  });

  it("invalidates stationary-camera trees when a lift or starter path changes", () => {
    const firstLift = DEFAULT_LINES[0];
    const placedLift = DEFAULT_LINES[1];
    const firstPath = trailPolyline(firstLift, 28);
    const previous = { lines: [firstLift], paths: [firstPath] };
    const next = { lines: [firstLift, placedLift], paths: [firstPath, trailPolyline(placedLift, 28)] };
    expect(sameForestClearings(previous, structuredClone(previous))).toBe(true);
    expect(sameForestClearings(previous, next)).toBe(false);
    expect(sameForestClearings(next, { ...next, paths: [firstPath, firstPath] })).toBe(false);

    const spots = (trees: ReturnType<typeof forestForTarget>) => [...trees.near.flat(), ...trees.birch, ...trees.mid];
    const target = placedLift.top;
    const coordinates = (spot: { x: number; z: number }) => `${spot.x}:${spot.z}`;
    const before = spots(forestForTarget(target, previous));
    const after = new Set(spots(forestForTarget(target, next)).map(coordinates));
    const corridorTrees = before.filter((spot) => distSqToLiftLine(spot.x, spot.z, placedLift) < LIFT_CLEAR ** 2);
    expect(corridorTrees.length).toBeGreaterThan(0);
    expect(corridorTrees.some((spot) => after.has(coordinates(spot)))).toBe(false);
  });
});

describe("hash stability", () => {
  it("chunkKey and hash01 are stable", () => {
    expect(chunkKey(-2, 3)).toBe("-2,3");
    expect(hash01(1, 2, 3)).toBe(hash01(1, 2, 3));
  });
});
