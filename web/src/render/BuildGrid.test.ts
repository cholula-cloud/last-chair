import { describe, expect, it } from "vitest";
import { onLease } from "@/game/lease";
import { TERRAIN } from "@/game/terrain";
import { gridDots } from "./BuildGrid";

describe("build grid dots", () => {
  it("covers only cells on the lease, far fewer than the whole map", () => {
    const dots = gridDots(null);
    const cell = TERRAIN.scale.horizontal / 2;
    const mapCells = ((TERRAIN.bounds.xMax - TERRAIN.bounds.xMin) / cell) * ((TERRAIN.bounds.zMax - TERRAIN.bounds.zMin) / cell);
    expect(dots.length).toBeGreaterThan(100);
    expect(dots.length).toBeLessThan(mapCells / 4);
    expect(dots.every((d) => onLease(d))).toBe(true);
    expect(dots.every((d) => d.valid === null)).toBe(true);
  });

  it("draws only the cells where the item can be placed", () => {
    const base = TERRAIN.base;
    const dots = gridDots((at) => Math.hypot(at.x - base.x, at.z - base.z) < 6);
    expect(dots.length).toBeGreaterThan(0);
    expect(dots.every((d) => d.valid === true)).toBe(true);
    expect(dots.every((d) => Math.hypot(d.x - base.x, d.z - base.z) < 6)).toBe(true);
    expect(gridDots(() => false)).toEqual([]);
  });
});
