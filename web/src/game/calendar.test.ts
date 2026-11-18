import { describe, expect, it } from "vitest";
import { DUTCH_HILL_CALENDAR as cal, dayKind, dayLabel, inHolidayWeek } from "./calendar";
import { createInitialGuests, meanArrivals } from "./sim";
import { createRng } from "./rng";
import { migrate } from "./migrations";
import { createInitialState, toPersisted } from "./state";

describe("Dutch Hill calendar", () => {
  it("labels weekends, the holiday and vacation week", () => {
    expect(dayKind(cal, 6)).toBe("weekend");
    expect(dayKind(cal, 8)).toBe("weekday");
    expect(dayKind(cal, 22)).toBe("holiday");
    expect(dayKind(cal, 23)).toBe("weekday");
    expect(inHolidayWeek(cal, 19)).toBe(false);
    expect(inHolidayWeek(cal, 23)).toBe(true);
    expect(dayLabel(cal, 1)).toEqual({ weekday: "Mon", date: "26 Jan" });
    expect(dayLabel(cal, 7).date).toBe("1 Feb");
    expect(dayLabel(cal, 28).date).toBe("22 Feb");
  });
  it("preserves an in-progress 14-day save", () => {
    const state = createInitialState();
    const old = { ...toPersisted(state), seasonLength: 14, weatherDays: state.weatherDays.slice(0, 14) };
    const result = migrate(old, 3);
    expect(result.reset).toBe(false);
    expect(result.state.seasonLength).toBe(14);
    expect(result.state.weatherDays).toHaveLength(14);
    expect(result.state.mountainId).toBe("dutch_hill");
  });
  it("creates a 28-day weather schedule and boosts vacation demand", () => {
    const state = createInitialState();
    expect(state.seasonLength).toBe(28);
    expect(state.weatherDays).toHaveLength(28);
    const opts = { fare: "balanced" as const, snowQuality: 0.6, weather: "clear" as const,
      buildings: [], talentsOwned: [], founderId: null };
    expect(meanArrivals({ ...opts, dayIndex: 23 })).toBeGreaterThan(meanArrivals({ ...opts, dayIndex: 16 }));
    const rosters = Array.from({ length: 200 }, (_, seed) => {
      const rng = createRng(seed + 1);
      return createInitialGuests(30, () => rng.next(), dayKind(cal, 23) !== "weekday" || inHolidayWeek(cal, 23));
    }).flat();
    expect(rosters.filter((guest) => guest.persona === "regular").length / rosters.length).toBeCloseTo(0.6, 1);
  });
});
