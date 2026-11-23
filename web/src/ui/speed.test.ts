import { describe, expect, it } from "vitest";
import { DAY_START_MIN, DAY_END_MIN, MS_PER_GAME_MINUTE } from "@/game/types";
import { SPEED_FACTORS, scaledTickMs } from "./speed";

describe("scaledTickMs", () => {
  it("runs a full day in six minutes at calm speed", () => {
    const fullDayGameMs = (DAY_END_MIN - DAY_START_MIN) * MS_PER_GAME_MINUTE;
    expect(fullDayGameMs / SPEED_FACTORS.calm).toBeCloseTo(360_000);
  });

  it("scales delta and clamps long frames", () => {
    expect(scaledTickMs(0.5, "fast")).toBe(400);
    expect(scaledTickMs(0.5, "calm")).toBeCloseTo(100 / 3);
    expect(scaledTickMs(0.5, "normal")).toBe(100);
    expect(scaledTickMs(0.2, "fast")).toBe(400);
    expect(scaledTickMs(0.08, "fast")).toBe(320);
  });
});