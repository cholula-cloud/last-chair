import { describe, expect, it, vi } from "vitest";
import { previewPaintedTrail, simplifyStroke, type PaintStroke } from "./paintedTrail";
import { freshTrail } from "./snow";
import type { LiftSlot } from "./state";
import { TERRAIN, type Terrain, type XZ } from "./terrain";
import { defaultTrails, type TrailRun } from "./trails";

const p = (x: number, z: number): XZ => ({ x, z });

function lift(anchor: XZ, bottom?: XZ): LiftSlot {
  return { anchor, bottom, confirmed: true, type: "surface", queue: [], dispatchCredit: 0 };
}

const slope: Terrain = {
  ...TERRAIN,
  base: p(0, 20),
  bounds: { xMin: -25, xMax: 25, zMin: 0, zMax: 25 },
  height: (_, z) => 20 - z * 0.3,
  sustainedPitch: () => 0.3,
  feetPerUnit: 50,
};
const mainLift = lift(p(0, 0));
const meander = [mainLift.anchor, p(2, 7), p(3, 10), slope.base];
const stroke = (points: XZ[], widthFt = 60, erase = false): PaintStroke => ({ points, widthFt, erase });
const plain = { lifts: [mainLift], trails: [] };

function existing(path = meander): TrailRun {
  return {
    liftIndex: 0, path, name: "Existing", lengthFt: 1440, pitch: 0.2, difficulty: "green",
    open: true, snow: freshTrail(), elevations: [], widths: path.map(() => 60),
  };
}

describe("trail paint geometry", () => {
  it("preserves endpoints and bends outside the simplification tolerance", () => {
    expect(simplifyStroke([p(0, 0), p(1, 0.02), p(2, 0), p(2, 2), p(2, 4)], 0.1))
      .toEqual([p(0, 0), p(2, 0), p(2, 4)]);
  });

  it("snaps a downhill stroke to the lift and base, and scales area and cost with width", () => {
    const path = [p(0.3, 0.2), ...meander.slice(1, -1), p(0.2, 19.9)];
    const narrow = previewPaintedTrail(plain, [stroke(path, 30)], slope);
    const wide = previewPaintedTrail(plain, [stroke(path, 60)], slope);
    expect(wide.reason).toBeNull();
    expect(wide.path[0]).toEqual(mainLift.anchor);
    expect(wide.path.at(-1)).toEqual(slope.base);
    expect(wide.widths).toHaveLength(wide.path.length);
    expect(wide.acres).toBeCloseTo(narrow.acres * 2);
    expect(wide.cost).toBeGreaterThan(narrow.cost);
    expect(wide.verticalFt).toBe(300);
  });

  it("shows an incomplete trail while rejecting its confirmation", () => {
    const draft = previewPaintedTrail(plain, [stroke(meander.slice(0, 3))], slope);
    expect(draft.reason).toMatch(/finish at the base/i);
    expect(draft.lengthFt).toBeGreaterThan(0);
    expect(draft.acres).toBeGreaterThan(0);
  });

  it("rejects a long scribble before deriving geometry or scanning pitch", () => {
    const sustainedPitch = vi.fn(slope.sustainedPitch);
    const scribble = [mainLift.anchor, ...Array.from({ length: 510 }, (_, i) =>
      p(i % 2 ? -24 : 24, i * 20 / 510)), slope.base];
    const preview = previewPaintedTrail(plain, [stroke(scribble)], { ...slope, sustainedPitch });
    expect(preview.reason).toMatch(/too long/i);
    expect(preview.path).toEqual([]);
    expect(sustainedPitch).not.toHaveBeenCalled();
  });

  it("limits total draft points and still permits a long downhill run", () => {
    const repeated = Array.from({ length: 520 }, () => stroke(meander));
    expect(previewPaintedTrail(plain, repeated, slope).reason).toMatch(/too long/i);

    const longHill = { ...slope, base: p(0, 90), bounds: { ...slope.bounds, zMax: 100 } };
    const preview = previewPaintedTrail(plain,
      [stroke([mainLift.anchor, p(18, 25), p(8, 58), longHill.base])], longHill);
    expect(preview.reason).toBeNull();
    expect(preview.lengthFt).toBeGreaterThan(6_000);
    expect(preview.path.at(-1)).toEqual(longHill.base);
  });

  it("rejects sustained climbing, and crossing another lift", () => {
    const uphill = previewPaintedTrail(plain, [stroke([p(0, 0), p(3, 10), p(5, 6), slope.base])], slope);
    expect(uphill.reason).toMatch(/uphill/i);
    expect(uphill.problemSegments.length).toBeGreaterThan(0);
    const lifts = [mainLift, lift(p(-5, 8), p(10, 8))];
    const crossing = previewPaintedTrail({ lifts, trails: [] }, [stroke(meander)], slope);
    expect(crossing.reason).toMatch(/crosses a lift/i);
    expect(crossing.problemSegments.length).toBeGreaterThan(0);
  });

  it("widens existing sections once, and does not treat narrowing as newly cleared ground", () => {
    const state = { lifts: [mainLift], trails: [existing()] };
    const wide = stroke(meander.slice(0, 3), 100);
    const once = previewPaintedTrail(state, [wide], slope);
    const twice = previewPaintedTrail(state, [wide, wide], slope);
    expect(once.reason).toBeNull();
    expect(once.trailIndex).toBe(0);
    expect(once.widths).toContain(60);
    expect(once.widths).toContain(100);
    expect(once.cost).toBeGreaterThan(0);
    expect(twice).toEqual(once);
    const narrow = previewPaintedTrail(state, [stroke(meander.slice(0, 3), 30, true)], slope);
    expect(narrow.reason).toBeNull();
    expect(narrow.widths).toContain(30);
    expect(narrow.cost).toBe(0);

    const widenedAgain = previewPaintedTrail(
      { ...state, trails: [{ ...state.trails[0], path: once.path, widths: once.widths }] },
      [stroke(meander.slice(0, 3), 150)],
      slope,
    );
    expect(widenedAgain.reason).toBeNull();
    expect(widenedAgain.path).toHaveLength(once.path.length);
  });

  it("rejects a broken run and preserves at least one open run for each lift", () => {
    const state = { lifts: [mainLift], trails: [existing()] };
    const erase = stroke(meander, 100, true);
    const split = previewPaintedTrail(state, [stroke(meander.slice(1, 3), 100, true)], slope);
    expect(split.reason).toMatch(/reconnect/i);
    const only = previewPaintedTrail(state, [erase], slope);
    expect(only.reason).toMatch(/needs an open trail/i);
    const second = existing([p(0, 0), p(6, 8), p(6, 15), slope.base]);
    const removable = previewPaintedTrail({ ...state, trails: [existing(), second] }, [erase], slope);
    expect(removable.reason).toBeNull();
    expect(removable.deleteTrail).toBe(true);
  });

  it("joins an existing trail at both ends to form a complete independent run", () => {
    const bypass = [p(2, 7), p(6, 10), p(5, 13), p(1.5, 15)];
    const preview = previewPaintedTrail({ ...plain, trails: [existing()] }, [stroke(bypass)], slope);
    expect(preview.reason).toBeNull();
    expect(preview.trailIndex).toBeNull();
    expect(preview.liftIndex).toBe(0);
    expect(preview.path[0]).toEqual(mainLift.anchor);
    expect(preview.path.at(-1)).toEqual(slope.base);
  });

  it("lets a phone player paint a distinct run down Dutch Hill", () => {
    const [starter] = defaultTrails();
    const top = starter.path[0];
    const path = [top, p(top.x - 1.6, top.z + 2.5), p(top.x - 2, top.z + 6), p(-3, 11), TERRAIN.base];
    const preview = previewPaintedTrail({ lifts: [lift(top)], trails: [starter] }, [stroke(path)]);
    expect(preview.reason).toBeNull();
    expect(preview.trailIndex).toBeNull();
  });
});
