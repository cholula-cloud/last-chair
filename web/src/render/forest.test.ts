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
  it("clears lifts, trails, apron and road", () => {
    for (const line of DEFAULT_LINES) {
      expect(forested(line.top.x, line.top.z, clearings)).toBe(false);
      const mid = trailPolyline(line, 28)[12];
      expect(forested(mid.x, mid.z, clearings)).toBe(false);
      expect(distSqToLiftLine(mid.x, mid.z, line)).toBeLessThanOrEqual(LIFT_CLEAR ** 2 + 1e-6);
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
});

describe("hash stability", () => {
  it("chunkKey and hash01 are stable", () => {
    expect(chunkKey(-2, 3)).toBe("-2,3");
    expect(hash01(1, 2, 3)).toBe(hash01(1, 2, 3));
  });
});