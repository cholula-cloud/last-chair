import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import {
  DUTCH_HILL_CALENDAR,
  DUTCH_HILL_CALENDAR_LEGACY,
  calendarForSeason,
  closedDaysBeforeNextOpen,
  dayKind,
  dayLabel,
  inHolidayWeek,
  isOperatingDay,
  operatingSeasonLength,
} from "./calendar";
import { meanArrivals, readyStoryBeat } from "./sim";
import { migrate } from "./migrations";
import { acknowledgeBeat, openNight, pickFounder, sleep, startNewSeason } from "./rules";
import { createInitialState, hydrate, toPersisted } from "./state";
import { advanceClosedDays, simulateClosedDay } from "./closedDays";

describe("Dutch Hill calendar", () => {
  const legacy = DUTCH_HILL_CALENDAR_LEGACY;

  it("labels weekends, the holiday and vacation week on the legacy map", () => {
    expect(dayKind(legacy, 6)).toBe("weekend");
    expect(dayKind(legacy, 8)).toBe("weekday");
    expect(dayKind(legacy, 22)).toBe("holiday");
    expect(dayKind(legacy, 23)).toBe("weekday");
    expect(inHolidayWeek(legacy, 19)).toBe(false);
    expect(inHolidayWeek(legacy, 23)).toBe(true);
    expect(dayLabel(legacy, 1)).toEqual({ weekday: "Mon", date: "26 Jan" });
    expect(dayLabel(legacy, 7).date).toBe("1 Feb");
    expect(dayLabel(legacy, 22)).toEqual({ weekday: "Mon", date: "16 Feb", note: "Presidents' Day" });
    expect(dayLabel(legacy, 23).note).toBe("February vacation week");
    expect(dayLabel(legacy, 28).date).toBe("22 Feb");
  });

  it("opens Fri–Sun for 6 weekends (18 operating days / 42 civil days) on Dutch Hill", () => {
    expect(DUTCH_HILL_CALENDAR.length).toBe(42);
    expect(operatingSeasonLength(DUTCH_HILL_CALENDAR)).toBe(18);
    expect(dayLabel(DUTCH_HILL_CALENDAR, 1)).toMatchObject({ weekday: "Fri", date: "26 Dec" });
    expect(isOperatingDay(DUTCH_HILL_CALENDAR, 1)).toBe(true);
    expect(isOperatingDay(DUTCH_HILL_CALENDAR, 2)).toBe(true);
    expect(isOperatingDay(DUTCH_HILL_CALENDAR, 4)).toBe(false);
    expect(closedDaysBeforeNextOpen(DUTCH_HILL_CALENDAR, 3)).toEqual([4, 5, 6, 7]);
  });

  it("finishes an in-progress 14-day save and starts a 42-day Dutch Hill winter", () => {
    const state = pickFounder(createBuiltHill(), "elena");
    const night = acknowledgeBeat(openNight({ ...state, dayIndex: 14, weather: state.weatherDays[13].kind }));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip mountainId for v3 migration fixture
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
    const review = sleep(hydrate(result.state, createInitialState()));
    expect(review).toMatchObject({ phase: "winter_review", dayIndex: 14 });
    const next = startNewSeason(review);
    expect(next).toMatchObject({ phase: "day", dayIndex: 1, seasonLength: 42, operatingDayIndex: 1 });
    expect(next.weatherDays).toHaveLength(42);
  });

  it("reads the configured length when creating a winter", () => {
    expect(createInitialState().seasonLength).toBe(42);
    expect(calendarForSeason("dutch_hill", 28).length).toBe(28);
  });

  it("advances Mon–Thu in the background after Sunday sleep", () => {
    let state = pickFounder(createBuiltHill(7, true), "elena");
    state = { ...state, dayIndex: 3, weather: state.weatherDays[2].kind };
    const night = acknowledgeBeat(openNight(state));
    const after = sleep({ ...night, pendingBeat: null, beatAcknowledged: true });
    expect(after.dayIndex).toBe(8);
    expect(after.operatingDayIndex).toBe(4);
    expect(after.morningHeadline).toMatch(/Readsboro Olympic committee.*gates and race training/);
  });

  it("boosts vacation demand on the legacy 28-day map", () => {
    const opts = { fare: "balanced" as const, snowQuality: 0.6, weather: "clear" as const,
      buildings: [], talentsOwned: [], founderId: null, calendar: legacy };
    expect(meanArrivals({ ...opts, dayIndex: 22 })).toBe(meanArrivals({ ...opts, dayIndex: 6 }));
    expect(meanArrivals({ ...opts, dayIndex: 23 })).toBeGreaterThan(meanArrivals({ ...opts, dayIndex: 16 }));
  });

  it("keeps the Saturday gate on its calendar day", () => {
    const day = { liftsOpen: 0, completedRuns: 0, arrivals: 28, snowDepth: 1,
      daysWithoutSnow: 0, reputation: 40, schoolOfferReady: false, completedBeats: [], calendar: DUTCH_HILL_CALENDAR };
    expect(readyStoryBeat({ ...day, dayIndex: 2 })).toBe("saturday");
    expect(readyStoryBeat({ ...day, dayIndex: 3 })).toBeNull();
  });
});

describe("closed day advance", () => {
  it("matches four single-day steps", () => {
    const base = pickFounder(createBuiltHill(7, true), "elena");
    const cal = DUTCH_HILL_CALENDAR;
    const sunday = { ...base, dayIndex: 3, cash: 9000 };
    let batch = sunday;
    for (const d of [4, 5, 6, 7]) batch = simulateClosedDay(batch, d);
    const once = advanceClosedDays(sunday, cal, 3).state;
    expect(batch.cash).toBeCloseTo(once.cash, 2);
    expect(batch.dayIndex).toBe(7);
  });

  it("keeps cash even on operations while the Olympic committee covers weekdays", () => {
    const base = pickFounder(createBuiltHill(7, true), "elena");
    const cal = DUTCH_HILL_CALENDAR;
    const { state } = advanceClosedDays({ ...base, dayIndex: 3, cash: 9000, loan: null, payables: [] }, cal, 3);
    expect(state.cash).toBe(9000);
  });
});