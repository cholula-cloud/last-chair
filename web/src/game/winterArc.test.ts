import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { DUTCH_HILL_CALENDAR } from "./calendar";
import { acknowledgeBeat, pickFounder, skipToClose, sleep } from "./rules";
import { operatingGoals } from "./winterArc";

describe("Dutch Hill operating goals", () => {
  it("unlocks the vacation goal after an actual positive day and credits only a qualifying Saturday", () => {
    const hill = pickFounder(createBuiltHill(7), "elena");
    const report = sleep(acknowledgeBeat(skipToClose(hill))).dayHistory[0];
    const day = (date: number, margin: number, wait = 5, rides = 1) => ({
      ...report, day: date, snowCost: 100,
      recap: { ...report.recap, arrivals: 10, cashDelta: 100 + margin,
        facts: { ...report.recap.facts, avgWaitMin: wait, dispatched: rides } },
    });
    const goals = (history: ReturnType<typeof day>[]) => operatingGoals(DUTCH_HILL_CALENDAR, history);
    expect(goals([])).toEqual({ firstMarginDay: null, vacationDay: null });
    expect(goals([day(1, 0), day(20, 10)])).toEqual({ firstMarginDay: 20, vacationDay: null });
    expect(goals([day(1, 100), day(19, 20), day(20, 0), day(27, 20, 6)]).vacationDay).toBeNull();
    expect(goals([day(1, 100), day(20, 20, 0, 0), day(27, 20)])).toEqual({ firstMarginDay: 1, vacationDay: 27 });
  });
});
