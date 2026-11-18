import { describe, expect, it } from "vitest";
import { CLEARING_COST_PER_ACRE, clearingCells, clearingQuote, isClearedAt, trailExposure } from "./clearing";
import { freshTrail } from "./snow";

const path = [{ x: 0, z: -8 }, { x: 0, z: 8 }];

describe("forest clearing", () => {
  it("charges only newly cleared acres when strokes overlap or a trail is widened", () => {
    const first = clearingQuote(path, [60, 60], []);
    expect(first.acres).toBeGreaterThan(0);
    expect(first.cost).toBe(Math.round(first.acres * CLEARING_COST_PER_ACRE));
    expect(clearingQuote([...path].reverse(), [60, 60], first.newCells)).toEqual({ newCells: [], acres: 0, cost: 0 });

    const wider = clearingQuote(path, [100, 100], first.newCells);
    expect(wider.acres).toBeGreaterThan(0);
    expect(new Set([...first.newCells, ...wider.newCells])).toEqual(new Set(clearingCells(path, [100, 100])));
  });

  it("uses saved clearings for both tree removal and local exposure", () => {
    const narrow = new Set(clearingCells(path, [30, 30]));
    const wide = new Set(clearingCells(path, [150, 150]));
    const trail = { path, snow: freshTrail() };
    expect(isClearedAt({ x: 0, z: 0 }, narrow)).toBe(true);
    expect(isClearedAt({ x: 10, z: 0 }, wide)).toBe(false);
    expect(trailExposure(trail, new Set())).toEqual(Array(6).fill(0));
    const narrowExposure = trailExposure(trail, narrow);
    trailExposure(trail, wide).forEach((exposure, i) => {
      expect(exposure).toBeGreaterThan(narrowExposure[i]);
      expect(exposure).toBeLessThanOrEqual(1);
    });
  });
});
