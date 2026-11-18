import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { DUTCH_HILL_CALENDAR as cal, dayKind, dayLabel, inHolidayWeek } from "./calendar";
import { meanArrivals, readyStoryBeat } from "./sim";
import { migrate } from "./migrations";
import { acknowledgeBeat, openNight, pickFounder, sleep, startNewSeason } from "./rules";
import { createInitialState, hydrate, toPersisted } from "./state";

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
    expect(dayLabel(cal, 22)).toEqual({ weekday: "Mon", date: "16 Feb", note: "Presidents' Day" });
    expect(dayLabel(cal, 23).note).toBe("February vacation week");
    expect(dayLabel(cal, 28).date).toBe("22 Feb");
  });

  it("finishes an in-progress 14-day save and starts a 28-day winter", () => {
    const state = pickFounder(createBuiltHill(), "elena");
    const night = acknowledgeBeat(openNight({ ...state, dayIndex: 14, weather: state.weatherDays[13].kind }));
    const { mountainId, ...fields } = toPersisted(night);
    const old = {
      ...fields,
      seasonLength: 14,
      weatherDays: state.weatherDays.slice(0, 14),
      nightRecap: { ...fields.nightRecap, costs: undefined, revenue: undefined, loanReceived: undefined, loanRepaid: undefined },
    };
    const result = migrate(old, 3);
    expect(result.reset).toBe(false);
    expect(result.state.seasonLength).toBe(14);
    expect(result.state.weatherDays).toEqual(old.weatherDays);
    expect(result.state.mountainId).toBe(mountainId);
    expect(result.state.nightRecap).toEqual({ ...night.nightRecap, costs: null, revenue: null });
    const review = sleep(hydrate(result.state, createInitialState()));
    expect(review).toMatchObject({ phase: "winter_review", dayIndex: 14 });
    const next = startNewSeason(review);
    expect(next).toMatchObject({ phase: "day", dayIndex: 1, seasonLength: 28 });
    expect(next.weatherDays).toHaveLength(28);
  });

  it("reads the configured length when creating a winter", () => {
    const length = cal.length;
    cal.length = 21;
    try {
      const state = createInitialState();
      expect(state.seasonLength).toBe(21);
      expect(state.weatherDays).toHaveLength(21);
    } finally {
      cal.length = length;
    }
  });

  it("creates a 28-day weather schedule and boosts vacation demand", () => {
    const state = createInitialState();
    expect(state.seasonLength).toBe(28);
    expect(state.weatherDays).toHaveLength(28);
    const opts = { fare: "balanced" as const, snowQuality: 0.6, weather: "clear" as const,
      buildings: [], talentsOwned: [], founderId: null };
    expect(meanArrivals({ ...opts, dayIndex: 22 })).toBe(meanArrivals({ ...opts, dayIndex: 6 }));
    expect(meanArrivals({ ...opts, dayIndex: 23 })).toBeGreaterThan(meanArrivals({ ...opts, dayIndex: 16 }));
    const opened = pickFounder(createBuiltHill(), "elena");
    const share = (day: number) => {
      const night = acknowledgeBeat(openNight({ ...opened, dayIndex: day - 1, weather: opened.weatherDays[day - 2].kind }));
      const rosters = Array.from({ length: 200 }, (_, seed) => sleep({ ...night, rngState: seed + 1 }).guests).flat();
      return rosters.filter((guest) => guest.persona === "regular").length / rosters.length;
    };
    expect(share(16)).toBeCloseTo(0.4, 1);
    expect(share(22)).toBeCloseTo(0.6, 1);
    expect(share(23)).toBeCloseTo(0.6, 1);
  });

  it("keeps Saturday and school-bus attendance gates on their calendar days", () => {
    const day = { liftsOpen: 0, completedRuns: 0, arrivals: 28, snowDepth: 1,
      daysWithoutSnow: 0, reputation: 40, lessonsBooked: false, completedBeats: [] };
    expect(readyStoryBeat({ ...day, dayIndex: 6 })).toBe("saturday");
    expect(readyStoryBeat({ ...day, dayIndex: 7 })).toBeNull();
    expect(readyStoryBeat({ ...day, dayIndex: 22 })).toBeNull();
    expect(readyStoryBeat({ ...day, dayIndex: 23 })).toBe("school_bus");
  });
});
