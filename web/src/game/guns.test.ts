import { describe, expect, it } from "vitest";
import { GROOM_WITHOUT_GARAGE, GUN_COST, MAX_GUNS_BASE, maxGunsFor, groomCoverage, groomedFeet, gunCoverage, gunPlacementReason, migrateLegacyGuns } from "./guns";
import { freshTrail } from "./snow";
import { TERRAIN } from "./terrain";

const base = TERRAIN.base;
const at = (dx: number, dz = 0) => ({ x: base.x + dx, z: base.z + dz });
const gun = (dx: number, dz = 0) => ({ at: at(dx, dz), builtDay: 1, paid: GUN_COST });

describe("snowmaking", () => {
  it("accepts a pipe chain and blocks isolated, overlapping, or excessive placements", () => {
    expect(gunPlacementReason(at(5), [])).toBe("out_of_pipe_reach");
    expect(gunPlacementReason(at(3), [])).toBeNull();
    expect(gunPlacementReason(at(6.5), [gun(3)])).toBeNull();
    expect(gunPlacementReason(at(3), [gun(3)])).toBe("gun_here");
    expect(gunPlacementReason(at(NaN), [])).toBe("off_map");
    expect(gunPlacementReason(at(1), Array.from({ length: MAX_GUNS_BASE }, () => gun(3)))).toBe("max_guns");
  });

  it("shrinks reach on gusty nights when the trail is exposed", () => {
    const trail = { path: [at(0, -9), at(0, -1), base], snow: freshTrail(), open: true };
    const calm = gunCoverage(trail, [gun(0)], [], TERRAIN, { wind: "calm", exposure: [0, 0, 0, 0, 1, 1] });
    const gusty = gunCoverage(trail, [gun(0)], [], TERRAIN, { wind: "gusty", exposure: [0, 0, 0, 0, 1, 1] });
    expect(gusty.filter(Boolean).length).toBeLessThanOrEqual(calm.filter(Boolean).length);
  });

  it("covers only nearby arc-length segment midpoints and extends radius with Trail Guns", () => {
    const trail = { path: [at(0, -9), at(0, -1), base], snow: freshTrail() };
    expect(gunCoverage(trail, [])).toEqual([false, false, false, false, false, false]);
    expect(gunCoverage(trail, [gun(0)])).toEqual([false, false, false, false, true, true]);
    expect(gunCoverage(trail, [gun(0)], ["trail_guns"])).toEqual([false, false, false, true, true, true]);
  });

  it("migrates free guns into a bounded chain that can be placed in order", () => {
    const paths = Array.from({ length: 12 }, (_, i) => ({ open: true, lengthFt: 1000, path: [at(i, -19), base] }));
    const cap = maxGunsFor(paths);
    const guns = migrateLegacyGuns(paths, 7, undefined, cap);
    expect(guns.length).toBeGreaterThan(0);
    expect(guns.length).toBeLessThanOrEqual(cap);
    guns.forEach((placed, i) => {
      expect(placed).toMatchObject({ builtDay: 7, paid: 0 });
      expect(gunPlacementReason(placed.at, guns.slice(0, i))).toBeNull();
    });
  });
});

describe("night grooming", () => {
  const trail = (lengthFt: number, open = true) => ({ lengthFt, open, snow: freshTrail() });

  it("grooms the busiest trails first and uses the remaining capacity uphill from the base", () => {
    const trails = [trail(1450), trail(1000), trail(830), trail(3000, false)];
    const coverage = groomCoverage(trails, [3, 10, 1, 100], "mid");
    expect(coverage).toEqual([
      [true, true, true, true, true, true],
      [true, true, true, true, true, true],
      [false, false, false, true, true, true],
      [false, false, false, false, false, false],
    ]);
    expect(groomCoverage(trails, [3, 10, 1], "mid", ["groom_pass"])[2]).toEqual(Array(6).fill(true));
    expect(groomCoverage(trails, [3, 10, 1], "minimal").flat()).not.toContain(true);
  });

  it("runs a partial groom budget without a maintenance garage", () => {
    const trails = [trail(1450), trail(1000), trail(830)];
    const full = groomedFeet(trails, [3, 10, 1], "mid", [], true);
    const partial = groomedFeet(trails, [3, 10, 1], "mid", [], false);
    expect(partial).toBeGreaterThan(0);
    expect(partial).toBeLessThan(full);
    expect(partial / full).toBeGreaterThan(0.3);
    expect(partial / full).toBeLessThan(GROOM_WITHOUT_GARAGE + 0.05);
  });
});
