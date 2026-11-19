import { describe, expect, it } from "vitest";
import { DAY_END_MIN, DAY_START_MIN } from "@/game/types";
import { COOL, WARM, dayTintAt, dayWarmth, type Tint } from "./dayTint";

const tint = (min: number) => dayTintAt(min, { r: 1, g: 1, b: 1 });

describe("day tint curve", () => {
  it("is cool at opening, neutral at midday and warm at closing", () => {
    const morning = tint(DAY_START_MIN);
    expect(morning).toEqual(COOL);
    expect(morning.b).toBeGreaterThan(morning.r);

    const noon = tint(12 * 60 + 15);
    expect(noon).toEqual({ r: 1, g: 1, b: 1 });

    const late = tint(DAY_END_MIN);
    expect(late).toEqual(WARM);
    expect(late.r).toBeGreaterThan(late.b);
  });

  it("moves steadily from cool to warm with no jumps", () => {
    let prev = dayWarmth(DAY_START_MIN);
    for (let m = DAY_START_MIN + 1; m <= DAY_END_MIN; m++) {
      const w = dayWarmth(m);
      expect(w).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(Math.abs(w - prev)).toBeLessThan(0.02);
      prev = w;
    }
  });

  it("stays subtle: no channel moves more than 12 percent", () => {
    for (let m = DAY_START_MIN; m <= DAY_END_MIN; m += 5) {
      const t = tint(m);
      for (const c of [t.r, t.g, t.b]) expect(Math.abs(c - 1)).toBeLessThanOrEqual(0.12);
    }
  });

  it("clamps outside the day and writes into the object it is given", () => {
    expect(dayWarmth(0)).toBe(-1);
    expect(dayWarmth(24 * 60)).toBe(1);
    const out: Tint = { r: 0, g: 0, b: 0 };
    expect(dayTintAt(DAY_END_MIN, out)).toBe(out);
  });
});
