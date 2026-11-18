import { createBuiltHill } from "./__fixtures__/built-hill";
import { describe, expect, it } from "vitest";
import { REFERENCE_TOPS } from "./descent";
import { TERRAIN } from "./terrain";
import { rulesFor } from "./descent";
import { PERSONAS } from "./personas";
import * as rules from "./rules";
import {
  classifyPitch,
  defaultTrails,
  fallLineTrailForLift,
  isOverSkill,
  pathLengthFt,
  pickTrailIndex,
  realGradeFactor,
  routeOptions,
  routePath,
  runSkiMinutes,
  REF_TRAIL_FT,
  segmentElevationsForPath,
} from "./trails";

describe("trails", () => {
  it("classifies pitch thresholds", () => {
    expect(classifyPitch(0.25)).toBe("green");
    expect(classifyPitch(0.2501)).toBe("blue");
    expect(classifyPitch(0.45)).toBe("blue");
    expect(classifyPitch(0.4501)).toBe("black");
  });

  it("default Dutch Meadows is green and reaches the base", () => {
    const d = defaultTrails()[0];
    expect(d.name).toBe("Dutch Meadows");
    expect(d.difficulty).toBe("green");
    expect(d.pitch).toBeLessThanOrEqual(0.25);
    const base = TERRAIN.base;
    const last = d.path[d.path.length - 1];
    expect(Math.hypot(last.x - base.x, last.z - base.z)).toBeLessThanOrEqual(
      rulesFor(TERRAIN).baseAreaRadius + 0.2,
    );
    expect(pathLengthFt(d.path)).toBeGreaterThan(1200);
    expect(pathLengthFt(d.path)).toBeLessThan(2100);
  });

  it("routes are deterministic", () => {
    const top = REFERENCE_TOPS[1];
    const a = routePath(top, null);
    const b = routePath(top, null);
    expect(a).toEqual(b);
  });

  it("real grade factor matches 6/3 calibration", () => {
    expect(realGradeFactor(TERRAIN)).toBeGreaterThan(0.65);
    expect(realGradeFactor(TERRAIN)).toBeLessThan(0.75);
  });

  it("routeOptions from Ridge includes green and blue fall-line choices", () => {
    const ridge = REFERENCE_TOPS[0];
    const opts = routeOptions(ridge);
  const green = opts.find((o) => o.difficulty === "green" && o.pitch <= 0.25);
    expect(green).toBeDefined();
    expect(green!.lengthFt).toBeGreaterThan(1200);
    expect(green!.lengthFt).toBeLessThan(2100);
    expect(opts.some((o) => o.difficulty === "blue")).toBe(true);
  });

  it("routePath from Mid at gentle target is green and under 1,200 ft", () => {
    const mid = REFERENCE_TOPS[1];
    const path = routePath(mid, 0.22);
    const pitch = TERRAIN.sustainedPitch(path) * realGradeFactor(TERRAIN);
    expect(pitch).toBeLessThanOrEqual(0.45);
    expect(pathLengthFt(path)).toBeGreaterThan(700);
    expect(pathLengthFt(path)).toBeLessThan(1200);
  });

  it("guests pick trails by skill", () => {
    let trails = defaultTrails();
    const lift = createBuiltHill(1).lifts[0];
    const blue = fallLineTrailForLift(0, { ...lift, anchor: REFERENCE_TOPS[0] }, trails[0].snow);
    trails = [
      { ...trails[0], difficulty: "green" as const },
      { ...blue, liftIndex: 0, name: "Steep", open: true },
    ];
    const ft = pickTrailIndex("first_timer", trails, 0, "a", 0);
    expect(trails[ft].difficulty).toBe("green");
    const reg = pickTrailIndex("regular", trails, 0, "b", 0);
    expect(trails[reg].difficulty).toBe("blue");
    const onlyBlue = [{ ...trails[1], open: true }];
    const over = pickTrailIndex("first_timer", onlyBlue, 0, "c", 0);
    expect(isOverSkill("first_timer", onlyBlue[over].difficulty)).toBe(true);
  });

  it("default-trail ski time for a regular at q = 1 is exactly 8 minutes", () => {
    const d = defaultTrails()[0];
    expect(runSkiMinutes("regular", d, 1)).toBeCloseTo(PERSONAS.regular.skiMin, 10);
    expect(REF_TRAIL_FT).toBe(d.lengthFt);
  });

  it("segment elevations follow real height along the path", () => {
    const d = defaultTrails()[0];
    expect(d.elevations[0]).toBeGreaterThan(0.85);
    expect(d.elevations[d.elevations.length - 1]).toBeLessThan(0.15);
    const midFall = fallLineTrailForLift(
      1,
      { type: "chair", anchor: REFERENCE_TOPS[1], confirmed: true, queue: [], dispatchCredit: 0 },
      d.snow,
    );
    expect(midFall.elevations[0]).toBeGreaterThan(0.5);
    expect(midFall.elevations[0]).toBeLessThan(0.75);
    expect(segmentElevationsForPath(d.path)).toEqual(d.elevations);
  });

  it("cutTrail spends cash and refuses at night", () => {
    let s = rules.pickFounder(createBuiltHill(3), "elena");
    const cash0 = s.cash;
    const opts = rules.trailOptions(s, 0);
    expect(opts.length).toBeGreaterThan(0);
    s = rules.cutTrail(s, 0, 0);
    expect(s.cash).toBeLessThan(cash0);
    s = { ...s, phase: "night" as const };
    expect(rules.cutTrail(s, 0, 0)).toBe(s);
  });
});