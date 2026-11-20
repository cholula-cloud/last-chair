import { describe, expect, it } from "vitest";
import {
  MAX_LIFTS,
  REFERENCE_TOPS,
  checkLiftLine,
  checkSpacing,
  liftLength,
  liftVertical,
  placementReason,
  rulesFor,
  type LiftLine,
  type PlacementReason,
} from "./descent";
import { TERRAIN } from "./terrain";

const top = (label: string) => {
  const s = REFERENCE_TOPS.find((x) => x.label === label);
  if (!s) throw new Error(label);
  return s;
};
const fromBase = (t: { x: number; z: number }): LiftLine => ({ bottom: TERRAIN.base, top: t });
const reasonOf = (line: LiftLine) => {
  const c = checkLiftLine(line);
  return c.ok ? "ok" : c.reason;
};
const hBase = TERRAIN.height(TERRAIN.base.x, TERRAIN.base.z);
const R = () => rulesFor(TERRAIN);

describe("checkLiftLine", () => {
  it("accepts the Ridge and Mid tops from the base", () => {
    expect(checkLiftLine(fromBase(top("Ridge"))).ok).toBe(true);
    expect(checkLiftLine(fromBase(top("Mid"))).ok).toBe(true);
  });

  it("rejects a long surface line that the double chair can serve", () => {
    const hill = { ...TERRAIN, grade: () => 0, height: (_x: number, z: number) => -z };
    const line = fromBase({ x: TERRAIN.base.x, z: TERRAIN.base.z - 19 });
    expect(checkLiftLine(fromBase(top("Ridge")), TERRAIN, "surface").ok).toBe(true);
    expect(checkLiftLine(line, hill, "surface")).toEqual({ ok: false, reason: "too_long" });
    expect(checkLiftLine(line, hill, "chair").ok).toBe(true);
  });

  it("reports length and vertical measured from the bottom", () => {
    const line = fromBase(top("Mid"));
    const c = checkLiftLine(line);
    if (!c.ok) throw new Error("expected ok");
    expect(c.length).toBe(liftLength(line));
    expect(c.vertical).toBe(liftVertical(line));
    expect(c.vertical).toBe(TERRAIN.height(top("Mid").x, top("Mid").z) - hBase);
  });

  it("rejects Creek for too little vertical, not for length or grade", () => {
    const creek = top("Creek");
    expect(liftVertical(fromBase(creek))).toBeLessThan(R().minLiftVertical);
    expect(liftLength(fromBase(creek))).toBeLessThanOrEqual(R().maxLiftLength);
    expect(TERRAIN.grade(creek.x, creek.z)).toBeLessThanOrEqual(R().maxLoadGrade);
    expect(reasonOf(fromBase(creek))).toBe("too_low");
  });

  it("rejects non-finite or out-of-bounds coordinates as off_map", () => {
    for (const t of [
      { x: TERRAIN.bounds.xMin - 1, z: 0 },
      { x: 0, z: TERRAIN.bounds.zMin - 1 },
      { x: Number.NaN, z: 0 },
      { x: 0, z: Number.NaN },
      { x: Number.POSITIVE_INFINITY, z: 0 },
      { x: 0, z: Number.NEGATIVE_INFINITY },
    ]) {
      expect(reasonOf(fromBase(t))).toBe("off_map");
    }
    expect(reasonOf({ bottom: { x: Number.NaN, z: 0 }, top: top("Ridge") })).toBe("off_map");
  });

  it("rejects a top on the flat base apron as too_low", () => {
    expect(reasonOf(fromBase(TERRAIN.toWorld({ x: 2.2, z: 2.4 })))).toBe("too_low");
    expect(reasonOf(fromBase(TERRAIN.base))).toBe("too_low");
  });

  it("rejects a top past the longest lift as too_long", () => {
    expect(reasonOf(fromBase(TERRAIN.toWorld({ x: -1.2, z: -3.2 })))).toBe("too_long");
  });

  it("rejects a terminal on the steep rollover band as too_steep", () => {
    const t = TERRAIN.toWorld({ x: 0.45, z: -0.45 });
    expect(TERRAIN.grade(t.x, t.z)).toBeGreaterThan(R().maxLoadGrade);
    expect(reasonOf(fromBase(t))).toBe("too_steep");
  });

  it("rejects a bottom 0.7 from the base as bottom_far, and accepts one inside the area", () => {
    const far = { x: TERRAIN.base.x + R().baseAreaRadius + 0.5, z: TERRAIN.base.z };
    expect(reasonOf({ bottom: far, top: top("Ridge") })).toBe("bottom_far");
    const near = { x: TERRAIN.base.x - 1.2, z: TERRAIN.base.z - 0.8 };
    expect(Math.hypot(1.2, 0.8)).toBeLessThan(R().baseAreaRadius);
    expect(reasonOf({ bottom: near, top: top("Ridge") })).toBe("ok");
  });

  it("measures vertical from the moved bottom", () => {
    const bottom = { x: TERRAIN.base.x - 1.2, z: TERRAIN.base.z - 1.6 };
    const t = top("Ridge");
    const moved = liftVertical({ bottom, top: t });
    const fromBaseV = liftVertical(fromBase(t));
    expect(moved - fromBaseV).toBeCloseTo(hBase - TERRAIN.height(bottom.x, bottom.z), 12);
    const c = checkLiftLine({ bottom, top: t });
    expect(c.ok && c.vertical).toBe(moved);
  });
});

describe("checkSpacing", () => {
  const ridge: LiftLine = fromBase(top("Ridge"));
  const others = [{ line: ridge, type: "surface" as const }];

  it("keeps Ridge and Mid both placeable", () => {
    expect(checkSpacing(fromBase(top("Mid")), others)).toBeNull();
  });

  it("rejects a top 0.5 from an existing top as too_close, naming that lift", () => {
    const near = { x: top("Ridge").x + R().minTopSpacing - 0.1, z: top("Ridge").z };
    expect(checkSpacing(fromBase(near), others)).toEqual({ reason: "too_close", type: "surface" });
  });

  it("rejects a top within the clearance of another line as too_close", () => {
    // 0.3 off the middle of the Ridge line, far from its top.
    const mid = { x: (TERRAIN.base.x + ridge.top.x) / 2, z: (TERRAIN.base.z + ridge.top.z) / 2 };
    const line = { bottom: TERRAIN.base, top: { x: mid.x + R().minLineClearance - 0.1, z: mid.z - 0.3 } };
    expect(checkSpacing(line, others)?.reason).toBe("too_close");
  });

  it("rejects lines that properly cross away from the base", () => {
    const a: LiftLine = { bottom: { x: -20, z: 10 }, top: { x: 20, z: -30 } };
    const b: LiftLine = { bottom: { x: -20, z: -30 }, top: { x: 20, z: 10 } };
    expect(checkSpacing(b, [{ line: a, type: "chair" }])).toEqual({ reason: "crosses", type: "chair" });
  });

  it("allows coinciding bottoms and crossings inside the base area", () => {
    expect(checkSpacing(fromBase(top("Mid")), others)).toBeNull();
    const b = TERRAIN.base;
    const a: LiftLine = { bottom: { x: b.x - 1.2, z: b.z }, top: { x: b.x + 9, z: b.z - 12 } };
    const c: LiftLine = { bottom: { x: b.x + 1.2, z: b.z }, top: { x: b.x - 9, z: b.z - 12 } };
    expect(checkSpacing(c, [{ line: a, type: "chair" }])).toBeNull();
  });
});

describe("placementReason", () => {
  it("has copy for every code", () => {
    const codes: PlacementReason[] = [
      "max_lifts",
      "off_map",
      "off_lease",
      "bottom_far",
      "too_steep",
      "too_low",
      "too_long",
      "too_close",
      "crosses",
      "cash",
    ];
    for (const c of codes) expect(placementReason(c).length).toBeGreaterThan(5);
    expect(MAX_LIFTS).toBe(3);
    expect(placementReason("max_lifts")).toBe("Dutch Hill only has room for 3 lifts.");
    expect(placementReason("too_close", { type: "chair" })).toBe("Too close to the chair lift. Spread them out.");
    expect(placementReason("cash", { need: 1250 })).toBe("Need $1,250 more for the deposit.");
  });
});
