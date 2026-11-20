import { describe, expect, it } from "vitest";
import { onLease } from "@/game/lease";
import { createInitialState } from "@/game/state";
import { TERRAIN } from "@/game/terrain";
import { liftLength, rulesFor } from "@/game/descent";
import { clearOfCable, gridDots, liftTopCells, reachArc, reachOf, snapBottom, LIFT_BOTTOM_STEP, LIFT_GUIDE_STEP } from "./buildGridModel";

const state = createInitialState();
const rules = { lifts: state.lifts, assets: state.assets, lodgeTier: state.lodgeTier };
const has = (cells: readonly { x: number; z: number }[], at: { x: number; z: number }) =>
  cells.some((c) => c.x === at.x && c.z === at.z);

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

  it("keeps blocked cells in the field, flagged invalid, so the lease keeps its shape", () => {
    const base = TERRAIN.base;
    const near = (at: { x: number; z: number }) => Math.hypot(at.x - base.x, at.z - base.z) < 6;
    const dots = gridDots(near);
    expect(dots.length).toBe(gridDots(null).length);
    const valid = dots.filter((d) => d.valid);
    expect(valid.length).toBeGreaterThan(0);
    expect(valid.every((d) => near(d))).toBe(true);
    expect(dots.some((d) => d.valid === false)).toBe(true);
    expect(gridDots(() => false).every((d) => d.valid === false)).toBe(true);
  });
});

describe("lift top guide cells", () => {
  const cells = liftTopCells(rules, "surface", TERRAIN.base);

  it("includes known legal tops and leaves out a known illegal one on Dutch Hill", () => {
    expect(has(cells, { x: -8.25, z: 2.25 })).toBe(true);
    expect(has(cells, { x: -6.75, z: 0.75 })).toBe(true);
    expect(has(cells, { x: -39.75, z: -8.25 })).toBe(false);
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.length).toBeLessThan(gridDots(null, TERRAIN, LIFT_GUIDE_STEP).length / 2);
  });

  it("samples at half the field step", () => {
    expect(LIFT_GUIDE_STEP).toBe(TERRAIN.scale.horizontal / 4);
    expect(gridDots(null, TERRAIN, LIFT_GUIDE_STEP).length).toBeGreaterThan(gridDots(null).length * 3);
  });

  it("gives the same cells with and without the reach pre-filter, and the filter only drops out-of-reach cells", () => {
    for (const type of ["surface", "chair"] as const) {
      const bottom = type === "surface" ? TERRAIN.base : { x: TERRAIN.base.x - 1, z: TERRAIN.base.z + 0.4 };
      const on = liftTopCells({ ...rules, lodgeTier: 2 }, type, bottom);
      const off = liftTopCells({ ...rules, lodgeTier: 2 }, type, bottom, TERRAIN, { prefilter: false });
      expect(on).toEqual(off);
      expect(on.length).toBeGreaterThan(0);
      const reach = rulesFor(TERRAIN, type).maxLiftLength;
      expect(on.every((c) => liftLength({ bottom: snapBottom(bottom), top: c }) <= reach)).toBe(true);
    }
  });

  it("stays on the lease", () => {
    expect(cells.every((c) => onLease(c))).toBe(true);
  });

  it("judges from a bottom rounded to the step, so nearby bottoms share one answer", () => {
    const a = snapBottom({ x: 2.7, z: 15.3 });
    const b = snapBottom({ x: 2.71, z: 15.29 });
    expect(a).toEqual(b);
    expect(Math.abs(a.x / LIFT_BOTTOM_STEP - Math.round(a.x / LIFT_BOTTOM_STEP))).toBe(0);
    expect(liftTopCells(rules, "surface", { x: 2.7, z: 15.3 })).toEqual(liftTopCells(rules, "surface", { x: 2.71, z: 15.29 }));
  });

  it("ignores cash: an empty purse does not blank the guide", () => {
    expect(liftTopCells({ ...rules, cash: 0 }, "surface", TERRAIN.base)).toEqual(cells);
  });

  it("is empty when a rule blocks every lift, such as a chair at Lodge Tier 1", () => {
    expect(state.lodgeTier).toBe(1);
    expect(liftTopCells(rules, "chair", TERRAIN.base)).toEqual([]);
  });
});

describe("reach ring", () => {
  it("sits at the longest legal lift and keeps only lease points", () => {
    const reach = reachOf("surface");
    expect(reach).toBe(rulesFor(TERRAIN, "surface").maxLiftLength);
    const arc = reachArc(TERRAIN.base, reach);
    const kept = arc.filter((p) => p);
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(arc.length);
    expect(kept.every((p) => p && onLease(p) && Math.abs(Math.hypot(p.x - TERRAIN.base.x, p.z - TERRAIN.base.z) - reach) < 1e-9)).toBe(true);
  });
});

describe("cable clearance filter", () => {
  const bottom = { x: 0, z: 0 };
  const top = { x: 10, z: 0 };
  const grid = [
    { x: 5, z: 0.5 }, // beside the cable
    { x: 5, z: 4 }, // clear
    { x: 0.5, z: 0.5 }, // at the bottom pad
    { x: 10.5, z: -0.5 }, // at the top pad
    { x: 12, z: 0 }, // past the top by more than the clearance
    { x: -2, z: 0 }, // behind the bottom by more than the clearance
  ];

  it("hides cells within the clearance of the cable and both pads", () => {
    expect(clearOfCable(grid, bottom, top, 1.5)).toEqual([{ x: 5, z: 4 }, { x: 12, z: 0 }, { x: -2, z: 0 }]);
  });

  it("with no top, clears only around the bottom", () => {
    const kept = clearOfCable(grid, bottom, null, 1.5);
    expect(kept.some((c) => c.x === 5 && c.z === 0.5)).toBe(true);
    expect(kept.some((c) => c.x === 0.5)).toBe(false);
  });
});
