import { describe, expect, it } from "vitest";
import { REFERENCE_TOPS } from "./descent";
import { TERRAIN } from "./terrain";
import { rulesFor } from "./descent";
import {
  classifyPitch,
  defaultTrails,
  pathLengthFt,
  realGradeFactor,
  routePath,
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
});