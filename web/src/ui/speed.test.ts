import { describe, expect, it } from "vitest";
import { DAY_START_MIN, DAY_END_MIN, MS_PER_GAME_MINUTE } from "@/game/types";
import { scaledTickMs } from "./speed";

describe("scaledTickMs", () => {
  it("runs a full day in two minutes at normal speed", () => {
    expect((DAY_END_MIN - DAY_START_MIN) * MS_PER_GAME_MINUTE).toBeCloseTo(120_000);
  });

  it("scales delta and clamps long frames", () => {
    expect(scaledTickMs(0.5, 4)).toBe(400);
    expect(scaledTickMs(0.5, 1)).toBe(100);
    expect(scaledTickMs(0.5, 2)).toBe(200);
    expect(scaledTickMs(0.2, 4)).toBe(400);
    expect(scaledTickMs(0.08, 4)).toBe(320);
  });
});