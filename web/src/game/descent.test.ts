import { describe, expect, it } from "vitest";
import {
  LIFT_PREVIEW_SLOTS,
  MAX_LIFT_LENGTH,
  MAX_LOAD_GRADE,
  MIN_LIFT_VERTICAL,
  checkDescentValid,
} from "./descent";
import { TERRAIN } from "./terrain";

const slot = (label: string) => {
  const s = LIFT_PREVIEW_SLOTS.find((x) => x.label === label);
  if (!s) throw new Error(label);
  return s;
};

describe("checkDescentValid", () => {
  it("accepts the Ridge and Mid slots", () => {
    expect(checkDescentValid(slot("Ridge"))).toBe(true);
    expect(checkDescentValid(slot("Mid"))).toBe(true);
  });

  it("rejects Creek for too little vertical, not for length or grade", () => {
    const creek = slot("Creek");
    const vertical = TERRAIN.height(creek.x, creek.z) - TERRAIN.height(TERRAIN.base.x, TERRAIN.base.z);
    expect(vertical).toBeLessThan(MIN_LIFT_VERTICAL);
    expect(Math.hypot(creek.x - TERRAIN.base.x, creek.z - TERRAIN.base.z)).toBeLessThanOrEqual(MAX_LIFT_LENGTH);
    expect(TERRAIN.grade(creek.x, creek.z)).toBeLessThanOrEqual(MAX_LOAD_GRADE);
    expect(checkDescentValid(creek)).toBe(false);
  });

  it("rejects an anchor outside the map", () => {
    expect(checkDescentValid({ x: TERRAIN.bounds.xMin - 1, z: 0 })).toBe(false);
    expect(checkDescentValid({ x: 0, z: TERRAIN.bounds.zMin - 1 })).toBe(false);
    expect(checkDescentValid({ x: Number.NaN, z: 0 })).toBe(false);
    expect(checkDescentValid({ x: 0, z: Number.NaN })).toBe(false);
    expect(checkDescentValid({ x: Number.POSITIVE_INFINITY, z: 0 })).toBe(false);
    expect(checkDescentValid({ x: 0, z: Number.NEGATIVE_INFINITY })).toBe(false);
  });

  it("rejects an anchor on the flat base", () => {
    expect(checkDescentValid({ x: 2.2, z: 2.4 })).toBe(false);
    expect(checkDescentValid(TERRAIN.base)).toBe(false);
  });

  it("rejects a top that is too far from the base", () => {
    // High ground, but past the longest allowed lift.
    expect(checkDescentValid({ x: -1.2, z: -3.2 })).toBe(false);
  });

  it("rejects a terminal on the steep rollover band", () => {
    const x = 0.45;
    const z = -0.45;
    expect(TERRAIN.grade(x, z)).toBeGreaterThan(MAX_LOAD_GRADE);
    expect(checkDescentValid({ x, z })).toBe(false);
  });
});
