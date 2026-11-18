import { freshBaseAssets } from "./base";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatMoney } from "./format";
import { CREW_TALENTS } from "./content";
import {
  applyOvernight,
  buildNightRecap,
  computeDayRevenue,
  emptyDayStats,
  formatClock,
  isWeekend,
  DEMAND,
  fareDemandMultiplier,
  meanArrivals,
  planArrivals,
  readyStoryBeat,
  rollMorningWeather,
  createInitialGuests,
  makeGuest,
  tickGuests,
  weekdayLabel,
  type BeatCheckInput,
  type GuestClock,
} from "./sim";
import { PERSONAS, skiMinutes } from "./personas";
import { defaultTrails } from "./trails";
import { defaultLifts } from "./state";
import { ZERO_TERMS, type DaySatisfaction, type SatTerms } from "./satisfaction";
import { createRng } from "./rng";
import { freshTrail, type Trail } from "./snow";
import {
  ARRIVAL_EARLIEST_MIN,
  ARRIVAL_LATEST_MIN,
  ARRIVE_WALK_MIN,
  DAILY_FIXED_COST,
  DEPART_WALK_MIN,
  LIFT_CLOSE_MIN,
  LIFT_OPS_COST,
  SEASON_LENGTH,
  SNOW_NIGHT_COST,
  type BuildingId,
  type DayStats,
  type FarePreset,
  type Guest,
  type SnowPreset,
} from "./types";

// Characterization tests: they pin what sim.ts does today. Tests marked
// "Pinned" record a simplification that a later roadmap PR replaces.

afterEach(() => {
  vi.restoreAllMocks();
});

describe("clock and calendar helpers", () => {
  it("formatClock renders 12-hour times", () => {
    expect(formatClock(0)).toBe("12:00 AM");
    expect(formatClock(6 * 60)).toBe("6:00 AM");
    expect(formatClock(12 * 60)).toBe("12:00 PM");
    expect(formatClock(13 * 60 + 5)).toBe("1:05 PM");
    expect(formatClock(16 * 60)).toBe("4:00 PM");
    expect(formatClock(6 * 60 + 30.9)).toBe("6:30 AM");
  });

  it("weekdayLabel cycles Mon..Sun from day 1", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(weekdayLabel)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
    expect(weekdayLabel(8)).toBe("Mon");
    expect(weekdayLabel(13)).toBe("Sat");
  });

  it("isWeekend is true for days 6 and 7 of each week", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 14].map(isWeekend)).toEqual([
      false, false, false, false, false, true, true, false, false, true, true,
    ]);
  });
});

describe("computeDayRevenue", () => {
  it("scales arrivals * fare * satisfaction multiplier", () => {
    // mult = 0.5 + 0.7 * s/100
    expect(computeDayRevenue("balanced", 100, 20)).toBe(1152);
    expect(computeDayRevenue("balanced", 0, 20)).toBe(480);
    expect(computeDayRevenue("cheap", 50, 10)).toBe(
      Math.round(10 * 35 * (0.5 + 0.35)),
    );
  });

  it("returns 0 with no arrivals", () => {
    expect(computeDayRevenue("expensive", 80, 0)).toBe(0);
  });
});

describe("buildNightRecap", () => {
  const stats = (arrivals: number): DayStats => ({
    ...emptyDayStats(),
    arrivals,
    avgQueueMin: 2,
  });
  const day = (score: number, over: Partial<SatTerms> = {}): DaySatisfaction => ({
    score,
    breakdown: { ...ZERO_TERMS, ...over },
    guests: 10,
    hillValue: 45,
  });
  const recapOf = (arrivals: number, lifts: number, founderDelta: number, d = day(71)) =>
    buildNightRecap({
      stats: stats(arrivals),
      fare: "balanced",
      snowQuality: 0.7,
      day: d,
      arrivalMood: 0.7,
      openLiftCount: lifts,
      founderFixedDelta: founderDelta,
    });

  it("cashDelta equals revenue minus fixed, founder and lift costs", () => {
    const recap = recapOf(30, 2, 80);
    const revenue = computeDayRevenue("balanced", 71, 30);
    expect(recap.arrivals).toBe(30);
    expect(recap.satisfaction).toBe(71);
    expect(recap.cashDelta).toBe(
      revenue - (DAILY_FIXED_COST + 80 + LIFT_OPS_COST * 2),
    );
  });

  it("bills at least one lift even with none open", () => {
    expect(recapOf(30, 0, 0).cashDelta).toBe(recapOf(30, 1, 0).cashDelta);
  });

  it("carries the day's breakdown and names its largest negative term", () => {
    const r = recapOf(10, 1, 0, day(50, { queue: -9, snow: -12, value: -2 }));
    expect(r.breakdown).toEqual({ ...ZERO_TERMS, queue: -9, snow: -12, value: -2 });
    expect(r.problem).toContain("Thin, scraped snow");
    expect(r.problem).toContain("70%");
  });

  it("says the day was good when no term is meaningfully negative", () => {
    expect(recapOf(30, 1, 0, day(75, { queue: -2, value: -1 })).problem).toBe(
      "Good day on the hill.",
    );
  });

  it("a losing day with no satisfaction problem names the loss", () => {
    const r = recapOf(12, 1, 0, day(75, { queue: -2 }));
    expect(r.cashDelta).toBeLessThan(0);
    expect(r.problem).toBe(
      `Lost ${formatMoney(-r.cashDelta)} today — running costs beat ticket sales on a quiet day.`,
    );
  });

  // Pinned: the start-of-day defaults. rules.tick fills them in as the day plays out.
  it("pins the emptyDayStats defaults", () => {
    expect(emptyDayStats()).toEqual({
      arrivals: 0,
      guestsArrived: 0,
      completedRuns: 0,
      runsPerGuest: 0,
      turnedAway: 0,
      peakOnHill: 0,
      avgQueueMin: 0,
      dispatched: 0,
      waitSumMin: 0,
      maxQueueLength: 0,
      peakWaitMin: 0,
      byLift: [],
      runsByTrail: [],
      venueRevenue: {},
      refuels: 0,
      balked: 0,
      seatsFullMin: 0,
    });
  });
});

describe("rollMorningWeather", () => {
  it("follows the deterministic day-index roll", () => {
    // roll = (day * 17 + 3) % 10
    expect(rollMorningWeather(1, false)).toBe("snow"); // 0
    expect(rollMorningWeather(3, false)).toBe("thaw"); // 4
    expect(rollMorningWeather(3, true)).toBe("clear"); // 4, guns
    expect(rollMorningWeather(2, false)).toBe("clear"); // 7
    expect(rollMorningWeather(8, false)).toBe("thaw"); // 9
  });
});

describe("applyOvernight", () => {
  // Snow numbers per segment are tested in snow.test.ts; this block covers the
  // cash, talent, weather and visibility parts of the night.
  const start = {
    cash: 1000,
    trails: [freshTrail(0.3, 0.5)],
    // next day is 2 -> clear
    dayIndex: 1,
    buildings: [] as BuildingId[],
    talentsOwned: [] as string[],
    daysWithoutSnow: 0,
  };
  const run = (snow: SnowPreset, over: Partial<typeof start> = {}) =>
    applyOvernight({ snow, ...start, ...over });

  it("subtracts the snow cost from cash", () => {
    expect(run("minimal").cash).toBe(1000 - SNOW_NIGHT_COST.minimal);
    expect(run("mid").cash).toBe(1000 - SNOW_NIGHT_COST.mid);
    expect(run("high").cash).toBe(1000 - SNOW_NIGHT_COST.high);
  });

  it("snow guns fire on mid and high only", () => {
    expect(run("mid", { buildings: ["snow_guns"] }).gunsFired).toBe(true);
    expect(run("mid").gunsFired).toBe(false);
    expect(run("minimal", { buildings: ["snow_guns"] }).gunsFired).toBe(false);
  });

  it("trail_guns talent fires guns on high only", () => {
    expect(run("high", { talentsOwned: ["trail_guns"] }).gunsFired).toBe(true);
    expect(run("mid", { talentsOwned: ["trail_guns"] }).gunsFired).toBe(false);
  });

  it("groomVisible is false on minimal, true otherwise", () => {
    expect(run("minimal").groomVisible).toBe(false);
    expect(run("mid").groomVisible).toBe(true);
    expect(run("high").groomVisible).toBe(true);
  });

  it("learns the first unowned talent in CREW_TALENTS order", () => {
    expect(run("mid").talentLearned).toBe(CREW_TALENTS[0].name);
    expect(run("mid").nextTalentHint).toBe(CREW_TALENTS[1].name);
    expect(run("mid", { talentsOwned: ["trail_guns"] }).talentLearned).toBe("Rope Tow");
    expect(
      run("mid", { talentsOwned: ["rope_tow", "trail_guns"] }).talentLearned,
    ).toBe("House Band");
  });

  it("returns no talent and no hint once all are owned", () => {
    const r = run("mid", { talentsOwned: CREW_TALENTS.map((t) => t.id) });
    expect(r.talentLearned).toBeNull();
    expect(r.nextTalentHint).toBeNull();
  });

  it("takes next-morning weather from rollMorningWeather", () => {
    for (const day of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      expect(run("mid", { dayIndex: day }).weather).toBe(rollMorningWeather(day + 1, false));
    }
  });

  it("a snow morning resets daysWithoutSnow and adds depth", () => {
    const r = run("minimal", { dayIndex: 3, daysWithoutSnow: 4 }); // next day 4 -> snow
    expect(r.weather).toBe("snow");
    expect(r.daysWithoutSnow).toBe(0);
    expect(r.snowDepth).toBeGreaterThan(0.3);
    expect(r.morningHeadline).toContain("Overnight squall");
  });

  it("a thaw morning removes depth and counts a dry day", () => {
    const r = run("minimal", { dayIndex: 7, daysWithoutSnow: 1 }); // next day 8 -> thaw
    expect(r.weather).toBe("thaw");
    expect(r.daysWithoutSnow).toBe(2);
    expect(r.snowDepth).toBeLessThan(0.3);
    expect(r.morningHeadline).toContain("Thaw watch");
  });

  it("a clear morning counts a dry day", () => {
    const r = run("minimal", { dayIndex: 1, daysWithoutSnow: 1 });
    expect(r.weather).toBe("clear");
    expect(r.daysWithoutSnow).toBe(2);
    expect(r.morningHeadline).toContain("Clear and cold");
  });
});

describe("planArrivals", () => {
  const base = {
    dayIndex: 2,
    fare: "balanced" as FarePreset,
    snowQuality: 0.7,
    weather: "clear" as const,
    buildings: [] as BuildingId[],
    talentsOwned: [] as string[],
    founderId: null,
  };

  it("gives weekends more arrivals than weekdays at the same inputs", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const weekday = planArrivals({ ...base, dayIndex: 2 });
    const weekend = planArrivals({ ...base, dayIndex: 6 });
    expect(weekday).toBe(18);
    expect(weekend).toBe(31);
    expect(weekend).toBeGreaterThan(weekday);
  });

  it("gives cheap at least as many arrivals as expensive", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const cheap = planArrivals({ ...base, fare: "cheap" });
    const expensive = planArrivals({ ...base, fare: "expensive" });
    expect(cheap).toBeGreaterThanOrEqual(expensive);
    expect(planArrivals({ ...base, fare: "balanced" })).toBe(20);
    expect(cheap).toBe(25);
    expect(expensive).toBe(17);
  });

  it("applies weather, thin snow, building and talent modifiers", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(planArrivals({ ...base, weather: "snow" })).toBe(21);
    expect(planArrivals({ ...base, weather: "thaw" })).toBe(14);
    expect(planArrivals({ ...base, snowQuality: 0.3 })).toBe(15);
    // +1 for the café itself, +1 because a café raises what the town expects a day to be worth.
    expect(planArrivals({ ...base, buildings: ["cafe"] })).toBe(20);
    expect(planArrivals({ ...base, talentsOwned: ["school_day"] })).toBe(20);
    expect(
      planArrivals({ ...base, dayIndex: 6, talentsOwned: ["ticket_booth"] }),
    ).toBe(32);
    // elena: round(0.08 * 20) = 2
    expect(planArrivals({ ...base, founderId: "elena" })).toBe(20);
  });

  it("clamps to 12..48", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(
      planArrivals({
        ...base,
        fare: "expensive",
        weather: "thaw",
        snowQuality: 0.2,
      }),
    ).toBe(12);
    expect(
      planArrivals({
        ...base,
        dayIndex: 6,
        fare: "cheap",
        weather: "snow",
        buildings: ["cafe"],
        talentsOwned: ["ticket_booth"],
        founderId: "elena",
        reputation: 100,
        rand: () => 0.99,
      }),
    ).toBe(48);
  });
});

describe("fare elasticity of arrivals", () => {
  const base = {
    dayIndex: 2,
    snowQuality: 0.7,
    weather: "clear" as const,
    buildings: [] as BuildingId[],
    talentsOwned: [] as string[],
    founderId: null,
  };
  const mean = (over: Partial<Parameters<typeof meanArrivals>[0]> = {}) =>
    meanArrivals({ ...base, fare: "balanced", ...over });

  it("a cheaper fare brings more expected arrivals", () => {
    const cheap = mean({ fare: "cheap" });
    const balanced = mean({ fare: "balanced" });
    const expensive = mean({ fare: "expensive" });
    expect(cheap).toBeGreaterThan(balanced);
    expect(balanced).toBeGreaterThan(expensive);
  });

  it("a better reputation brings more at every fare", () => {
    for (const fare of ["cheap", "balanced", "expensive"] as const) {
      expect(mean({ fare, reputation: 85 })).toBeGreaterThan(mean({ fare, reputation: 40 }));
      expect(mean({ fare, reputation: 40 })).toBeGreaterThanOrEqual(mean({ fare, reputation: 10 }));
    }
    // Reputation is what makes a high fare tolerable.
    expect(mean({ fare: "expensive", reputation: 85 })).toBeGreaterThanOrEqual(
      mean({ fare: "balanced", reputation: 40 }) - 1,
    );
  });

  it("regulars are more price-sensitive than first-timers", () => {
    // The weekend roster is mostly regulars, so the same fare move shifts demand further.
    const swing = (weekend: boolean) =>
      fareDemandMultiplier("cheap", 39, weekend) - fareDemandMultiplier("expensive", 39, weekend);
    expect(swing(true)).toBeGreaterThan(swing(false));
    expect(fareDemandMultiplier("balanced", 39, false)).toBeCloseTo(1, 2);
  });

  it("keeps the multiplier inside its clamps", () => {
    expect(fareDemandMultiplier("cheap", 1000, true)).toBe(DEMAND.MAX_MULT);
    expect(fareDemandMultiplier("expensive", 1, false)).toBe(DEMAND.MIN_MULT);
  });

  it("meanArrivals is deterministic and the mean of planArrivals over the day noise", () => {
    expect(mean({ fare: "cheap" })).toBe(mean({ fare: "cheap" }));
    for (const dayIndex of [2, 6]) {
      for (const fare of ["cheap", "balanced", "expensive"] as const) {
        const draws = [0, 0.2, 0.4, 0.6, 0.8].map((r) =>
          planArrivals({ ...base, dayIndex, fare, rand: () => r }),
        );
        const avg = draws.reduce((a, b) => a + b, 0) / draws.length;
        expect(Math.abs(mean({ dayIndex, fare }) - avg)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("readyStoryBeat", () => {
  // Fires no beat: Monday, nothing open, deep snow, no reputation.
  const quiet: BeatCheckInput = {
    dayIndex: 1,
    liftsOpen: 0,
    completedRuns: 0,
    arrivals: 0,
    snowDepth: 1,
    daysWithoutSnow: 0,
    reputation: 0,
    lessonsBooked: false,
    completedBeats: [],
  };

  it("returns null when no gate is met", () => {
    expect(readyStoryBeat(quiet)).toBeNull();
  });

  // completedRuns is the number of finished ski runs (rules.tick), not departures.
  it("first_load fires at 1 open lift and 5 completed runs, not below", () => {
    const at = { ...quiet, liftsOpen: 1, completedRuns: 5 };
    expect(readyStoryBeat(at)).toBe("first_load");
    expect(readyStoryBeat({ ...at, completedRuns: 4 })).toBeNull();
    expect(readyStoryBeat({ ...at, liftsOpen: 0 })).toBeNull();
  });

  it("saturday fires on a weekend with 22 arrivals, not below", () => {
    const at = { ...quiet, dayIndex: 6, arrivals: 22 };
    expect(readyStoryBeat(at)).toBe("saturday");
    expect(readyStoryBeat({ ...at, arrivals: 21 })).toBeNull();
    expect(readyStoryBeat({ ...at, dayIndex: 5 })).toBeNull();
  });

  it("school_bus fires on lessons or 28 weekday arrivals", () => {
    expect(readyStoryBeat({ ...quiet, lessonsBooked: true })).toBe("school_bus");
    const weekday = { ...quiet, dayIndex: 2, arrivals: 28 };
    expect(readyStoryBeat(weekday)).toBe("school_bus");
    expect(readyStoryBeat({ ...weekday, arrivals: 27 })).toBeNull();
  });

  it("dry_week fires at 3 dry days and depth under 0.35, not at the edge", () => {
    const at = { ...quiet, daysWithoutSnow: 3, snowDepth: 0.34 };
    expect(readyStoryBeat(at)).toBe("dry_week");
    expect(readyStoryBeat({ ...at, daysWithoutSnow: 2 })).toBeNull();
    expect(readyStoryBeat({ ...at, snowDepth: 0.35 })).toBeNull();
  });

  it("summit_link fires at reputation 50, not below", () => {
    expect(readyStoryBeat({ ...quiet, reputation: 50 })).toBe("summit_link");
    expect(readyStoryBeat({ ...quiet, reputation: 49 })).toBeNull();
  });

  it("returns the earliest beat in STORY_BEATS order when several are ready", () => {
    const many: BeatCheckInput = {
      ...quiet,
      liftsOpen: 1,
      completedRuns: 5,
      reputation: 80,
      lessonsBooked: true,
    };
    expect(readyStoryBeat(many)).toBe("first_load");
    expect(readyStoryBeat({ ...many, completedBeats: ["first_load"] })).toBe(
      "school_bus",
    );
  });

  it("skips completed beats", () => {
    const input = { ...quiet, reputation: 50, completedBeats: ["summit_link" as const] };
    expect(readyStoryBeat(input)).toBeNull();
  });

  it("never returns winter_review, even at season end", () => {
    expect(readyStoryBeat({ ...quiet, dayIndex: SEASON_LENGTH })).toBeNull();
    expect(
      readyStoryBeat({
        ...quiet,
        dayIndex: SEASON_LENGTH + 5,
        completedBeats: [
          "first_load",
          "saturday",
          "school_bus",
          "dry_week",
          "summit_link",
        ],
      }),
    ).toBeNull();
  });
});

describe("tickGuests", () => {
  const T0 = 10 * 60;
  const clock = (now: number, over: Partial<GuestClock> = {}): GuestClock => ({
    now,
    snowQuality: 1,
    lapOverheadMin: 5,
    trails: defaultTrails(),
    lifts: defaultLifts(),
    talentsOwned: [],
    ...over,
  });
  const skier = (over: Partial<Guest> = {}) =>
    makeGuest({
      state: "ski",
      stateSinceMin: T0,
      persona: "regular",
      trailIndex: 0,
      liftIndex: 0,
      ...over,
    });

  it("keeps a pending guest at home until their arrival minute, then starts the walk in", () => {
    const g = makeGuest({ state: "pending", arriveAtMin: T0 + 5 });
    expect(tickGuests([g], clock(T0 + 4.5))[0]).toBe(g);
    const [a] = tickGuests([g], clock(T0 + 5));
    expect(a.state).toBe("arrive");
    expect(a.stateSinceMin).toBe(T0 + 5);
    expect(a.progress).toBe(0);
  });

  it("arrive progress is elapsed over the walk, then the guest joins the line", () => {
    const g = makeGuest({ state: "arrive", stateSinceMin: T0 });
    const [half] = tickGuests([g], clock(T0 + ARRIVE_WALK_MIN / 2));
    expect(half.state).toBe("arrive");
    expect(half.progress).toBeCloseTo(0.5, 10);
    const [done] = tickGuests([g], clock(T0 + ARRIVE_WALK_MIN));
    expect(done.state).toBe("queue");
    expect(done.progress).toBe(0);
  });

  it("ski progress is elapsed over the persona's run time; first-timers and bad snow are slower", () => {
    const at = (persona: "regular" | "first_timer", q: number, now: number) =>
      tickGuests([skier({ persona })], clock(now, { snowQuality: q }))[0].progress;
    expect(at("regular", 1, T0 + 4)).toBeCloseTo(4 / PERSONAS.regular.skiMin, 10);
    expect(at("first_timer", 1, T0 + 4)).toBeLessThan(at("regular", 1, T0 + 4));
    expect(at("regular", 0.3, T0 + 4)).toBeLessThan(at("regular", 1, T0 + 4));
    expect(skiMinutes("regular", 0)).toBeGreaterThan(skiMinutes("regular", 1));
  });

  it("counts a finished run, spends energy, and sends the guest back to the line", () => {
    const end = T0 + skiMinutes("regular", 1);
    const [g] = tickGuests([skier({ runs: 2, targetRuns: 9 })], clock(end));
    expect(g.runs).toBe(3);
    expect(g.energy).toBeCloseTo(1 - PERSONAS.regular.energyPerRun, 10);
    expect(g.state).toBe("queue");
  });

  it("spends more stamina on a longer descent without making a short lap free", () => {
    const reference = defaultTrails()[0];
    const regular = PERSONAS.regular.energyPerRun;
    const finish = (lengthScale: number) => tickGuests(
      [skier({ targetRuns: 9 })],
      clock(T0 + 60, { trails: [{ ...reference, lengthFt: reference.lengthFt * lengthScale }] }),
    )[0];
    expect(finish(0.25).energy).toBeCloseTo(1 - regular * 0.5, 10);
    expect(finish(1).energy).toBeCloseTo(1 - regular, 10);
    expect(finish(1.75).energy).toBeCloseTo(1 - regular * 1.75, 10);
  });

  it("goes home when energy runs out, when the target is reached, or when a lap cannot finish", () => {
    const end = T0 + skiMinutes("regular", 1);
    expect(tickGuests([skier({ energy: 0.05, targetRuns: 9 })], clock(end))[0].state).toBe("depart");
    expect(tickGuests([skier({ runs: 5, targetRuns: 6 })], clock(end))[0].state).toBe("depart");
    // 15:33 finish + 5 min to the top + 8 min run ends after the 15:45 close.
    const late = LIFT_CLOSE_MIN - 12 - skiMinutes("regular", 1);
    const lateEnd = late + skiMinutes("regular", 1);
    const lateSkier = skier({ stateSinceMin: late, targetRuns: 9 });
    expect(tickGuests([lateSkier], clock(lateEnd))[0].state).toBe("depart");
    expect(
      tickGuests([lateSkier], clock(lateEnd, { lapOverheadMin: 1, lifts: [] }))[0].state,
    ).toBe("depart");
    // No open lift at all: nobody laps.
    const noLift = defaultLifts().map((l) => ({ ...l, confirmed: false }));
    expect(
      tickGuests([skier({ targetRuns: 9 })], clock(end, { lapOverheadMin: Infinity, lifts: noLift }))[0]
        .state,
    ).toBe("depart");
  });

  it("lets a guest leave an existing long line for a venue and retains their measured wait", () => {
    const guest = makeGuest({ state: "queue", joinedQueueAtMin: 585 });
    const [visited] = tickGuests([guest], clock(600, { assets: freshBaseAssets() }));
    expect(visited).toMatchObject({
      state: "refuel", visitMinutes: 15, balks: 1, waitMin: 15, waitCount: 1,
    });
  });

  it("sends everyone still in line home when the lifts close, and counts nobody's run for it", () => {
    const g = makeGuest({ state: "queue", runs: 0 });
    expect(tickGuests([g], clock(LIFT_CLOSE_MIN - 0.5))[0].state).toBe("queue");
    const [out] = tickGuests([g], clock(LIFT_CLOSE_MIN));
    expect(out.state).toBe("depart");
    expect(out.runs).toBe(0);
  });

  it("walks departers to the car park, then they are gone for good", () => {
    const g = makeGuest({ state: "depart", stateSinceMin: T0 });
    const [mid] = tickGuests([g], clock(T0 + DEPART_WALK_MIN / 2));
    expect(mid.state).toBe("depart");
    expect(mid.progress).toBeCloseTo(0.5, 10);
    const [gone] = tickGuests([g], clock(T0 + DEPART_WALK_MIN));
    expect(gone.state).toBe("gone");
    expect(tickGuests([gone], clock(T0 + 500))[0]).toBe(gone);
  });

  it("leaves riders and the pending roster to the lifts and the clock", () => {
    const rider = makeGuest({ state: "ride", progress: 0.4 });
    expect(tickGuests([rider], clock(T0 + 100))[0]).toBe(rider);
  });
});

describe("arrival curve and roster", () => {
  const rosterFor = (seed: number, count = 200, weekend = false) => {
    const rng = createRng(seed);
    return createInitialGuests(count, () => rng.next(), weekend);
  };

  it("every arrival falls between 08:00 and 13:30", () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const g of rosterFor(seed, 40)) {
        expect(g.arriveAtMin).toBeGreaterThanOrEqual(ARRIVAL_EARLIEST_MIN);
        expect(g.arriveAtMin).toBeLessThanOrEqual(ARRIVAL_LATEST_MIN);
      }
    }
  });

  it("opens at 08:00, has about a fifth in by 09:00 and most in by 11:00, peaking mid-morning", () => {
    const all = Array.from({ length: 40 }, (_, i) => rosterFor(i + 1, 40)).flat();
    const share = (to: number) => all.filter((g) => g.arriveAtMin < to * 60).length / all.length;
    expect(Math.min(...all.map((g) => g.arriveAtMin))).toBeGreaterThanOrEqual(8 * 60);
    expect(share(9)).toBeGreaterThan(0.17);
    expect(share(9)).toBeLessThan(0.28);
    expect(share(11)).toBeGreaterThan(0.7);
    expect(share(11)).toBeLessThan(0.88);
    const inHour = (from: number, to: number) =>
      all.filter((g) => g.arriveAtMin >= from * 60 && g.arriveAtMin < to * 60).length;
    expect(inHour(9, 10)).toBeGreaterThan(inHour(8, 9));
    expect(inHour(9, 10)).toBeGreaterThan(inHour(12, 13) * 2);
  });

  it("builds a pending roster sorted by arrival, with full energy and no runs", () => {
    const guests = rosterFor(3, 25);
    expect(guests).toHaveLength(25);
    expect(guests.every((g) => g.state === "pending" && g.runs === 0 && g.energy === 1)).toBe(true);
    expect(guests.map((g) => g.arriveAtMin)).toEqual(
      [...guests.map((g) => g.arriveAtMin)].sort((x, y) => x - y),
    );
    expect(new Set(guests.map((g) => g.id)).size).toBe(25);
    for (const g of guests) {
      const [lo, hi] = PERSONAS[g.persona].targetRuns;
      expect(g.targetRuns).toBeGreaterThanOrEqual(lo);
      expect(g.targetRuns).toBeLessThanOrEqual(hi);
    }
  });

  it("splits personas about 60/40 first-timer on weekdays and 40/60 on weekends", () => {
    const share = (weekend: boolean) => {
      const all = Array.from({ length: 20 }, (_, i) => rosterFor(i + 1, 40, weekend)).flat();
      return all.filter((g) => g.persona === "first_timer").length / all.length;
    };
    expect(share(false)).toBeGreaterThan(0.53);
    expect(share(false)).toBeLessThan(0.67);
    expect(share(true)).toBeGreaterThan(0.33);
    expect(share(true)).toBeLessThan(0.47);
  });

  it("is deterministic for a given seed", () => {
    expect(rosterFor(9)).toEqual(rosterFor(9));
    expect(rosterFor(9)).not.toEqual(rosterFor(10));
  });
});

describe("headless season", () => {
  it("runs a full season of nights with finite numbers and ordered talents", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    let day = 1;
    let cash = 5000;
    let trails: Trail[] = [freshTrail(0.45, 0.6)];
    let snowQuality = 0.6;
    let snowDepth = 0.5;
    let daysWithoutSnow = 0;
    let weather: "snow" | "clear" | "thaw" = "clear";
    const talentsOwned: string[] = [];
    const buildings: BuildingId[] = [];
    let nights = 0;

    for (let i = 0; i < SEASON_LENGTH; i++) {
      const arrivals = planArrivals({
        dayIndex: day,
        fare: "balanced",
        snowQuality,
        weather,
        buildings,
        talentsOwned,
        founderId: null,
      });
      expect(arrivals).toBeGreaterThanOrEqual(12);
      expect(arrivals).toBeLessThanOrEqual(40);

      const recap = buildNightRecap({
        stats: { ...emptyDayStats(), arrivals },
        fare: "balanced",
        snowQuality,
        day: { score: 70, breakdown: ZERO_TERMS, guests: arrivals, hillValue: 45 },
        arrivalMood: 0.7,
        openLiftCount: 1,
        founderFixedDelta: 0,
      });
      cash += recap.cashDelta;

      const overnight = applyOvernight({
        snow: "mid",
        cash,
        trails,
        dayIndex: day,
        buildings,
        talentsOwned,
        daysWithoutSnow,
      });
      cash = overnight.cash;
      trails = overnight.trails;
      snowQuality = overnight.snowQuality;
      snowDepth = overnight.snowDepth;
      daysWithoutSnow = overnight.daysWithoutSnow;
      weather = overnight.weather;
      if (overnight.talentLearned) {
        const t = CREW_TALENTS.find((c) => c.name === overnight.talentLearned);
        talentsOwned.push(t!.id);
      }

      expect(Number.isFinite(cash)).toBe(true);
      expect(Number.isFinite(snowQuality)).toBe(true);
      expect(Number.isFinite(snowDepth)).toBe(true);
      day += 1;
      nights += 1;
    }

    expect(nights).toBe(SEASON_LENGTH);
    expect(day).toBe(SEASON_LENGTH + 1);
    // One talent per night until the list runs out, never a duplicate.
    expect(talentsOwned).toHaveLength(Math.min(nights, CREW_TALENTS.length));
    expect(new Set(talentsOwned).size).toBe(talentsOwned.length);
  });
});
