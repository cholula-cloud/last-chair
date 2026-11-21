import { describe, expect, it } from "vitest";
import { activityTicketRevenue, winterCarnivalBonus } from "./activities";
import { ASSET_CATALOG } from "./base";
import { seasonCalendar, weekdayForDay } from "./calendar";
import { createInitialState } from "./state";
import { pickFounder } from "./rules";

describe("activities", () => {
  it("tubing and rink accrue ticket revenue from arrivals", () => {
    let state = createInitialState();
    state = pickFounder(state, "elena");
    state = {
      ...state,
      assets: [
        { id: "tubing_hill", at: { x: 2, z: 6 }, styleId: ASSET_CATALOG.tubing_hill.styleId },
        { id: "ice_rink", at: { x: 4, z: 8 }, styleId: ASSET_CATALOG.ice_rink.styleId },
      ],
      dayStats: { ...state.dayStats, guestsArrived: 100 },
    };
    const revenue = activityTicketRevenue(state);
    expect(revenue.tubing_hill).toBeGreaterThan(0);
    expect(revenue.ice_rink).toBeGreaterThan(0);
  });

  it("winter carnival pays on Saturday when tubing and rink exist", () => {
    let state = createInitialState();
    const calendar = seasonCalendar(state);
    const saturday = Array.from({ length: state.seasonLength }, (_, i) => i + 1)
      .find((day) => weekdayForDay(calendar, day) === "Sat") ?? 6;
    state = {
      ...state,
      dayIndex: saturday,
      assets: [
        { id: "tubing_hill", at: { x: 2, z: 6 }, styleId: "1950s-timber" },
        { id: "ice_rink", at: { x: 4, z: 8 }, styleId: "1950s-timber" },
      ],
      dayStats: { ...state.dayStats, guestsArrived: 80 },
    };
    expect(winterCarnivalBonus(state)).toBeGreaterThan(100);
  });
});