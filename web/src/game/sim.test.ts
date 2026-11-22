import { freshBaseAssets } from "./base";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatMoney } from "./format";
import { CREW_TALENTS } from "./content";
import { stepLifts } from "./lifts";
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
  createInitialGuests,
  makeGuest,
  tickGuests,
  weekdayLabel,
  type BeatCheckInput,
  type GuestClock,
} from "./sim";
import { PERSONAS, skiMinutes } from "./personas";
import { walkDurationMin, walkToLiftPath } from "./walkPaths";
import { defaultTrails } from "./trails";
import { TERRAIN } from "./terrain";
import { starterLifts } from "./__fixtures__/built-hill";
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
  type DayWeather,
} from "./types";
import { generateSeasonWeather, WIND_HOLD } from "./weather";

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
      costs: { fixed: DAILY_FIXED_COST, founder: founderDelta, liftOps: lifts * LIFT_OPS_COST, upkeep: 0 },
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

  it("carries the day's breakdown and names its largest negative term", () => {
    const r = recapOf(10, 1, 0, day(50, { queue: -9, snow: -12, value: -2 }));
    expect(r.breakdown).toEqual({ ...ZERO_TERMS, queue: -9, snow: -12, value: -2 });
    expect(r.problem).toContain("overnight snow prep");
    expect(r.problem).toContain("70%");
  });

  it("says the day was good when no term is meaningfully negative", () => {
    expect(recapOf(30, 1, 0, day(75, { queue: -2, value: -1 })).problem).toBe(
      "Smooth day on the hill. Skiers left happy.",
    );
  });

  it("a losing day with no satisfaction problem names the loss", () => {
    const r = recapOf(12, 1, 0, day(75, { queue: -2 }));
    expect(r.cashDelta).toBeLessThan(0);
    expect(r.problem).toBe(
      `Lost ${formatMoney(-r.cashDelta)} today. Daily costs outpaced revenue on a quiet day.`,
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
      ticketBasePosted: 0,
      schoolBusPosted: 0,
    });
  });
});

describe("applyOvernight", () => {
  // Snow numbers per segment are tested in snow.test.ts; this block covers the
  // cash, talent, weather and visibility parts of the night.
  const start = {
    cash: 1000,
    trails: [freshTrail(0.3, 0.5)],
    weatherTomorrow: { kind: "clear", wind: "calm" } as DayWeather,
    buildings: [] as BuildingId[],
    talentsOwned: [] as string[],
    daysWithoutSnow: 0,
    hasPlacedGuns: false,
    gunCoverage: undefined as boolean[][] | undefined,
  };
  const run = (snow: SnowPreset, over: Partial<typeof start> = {}) =>
    applyOvernight({ snow, ...start, ...over });

  it("subtracts the snow cost from cash", () => {
    expect(run("minimal").cash).toBe(1000 - SNOW_NIGHT_COST.minimal);
    expect(run("mid").cash).toBe(1000 - SNOW_NIGHT_COST.mid);
    expect(run("high").cash).toBe(1000 - SNOW_NIGHT_COST.high);
  });

  it("snow guns fire on mid and high only", () => {
    expect(run("mid", { hasPlacedGuns: true, gunCoverage: [[true]] }).gunsFired).toBe(true);
    expect(run("mid").gunsFired).toBe(false);
    expect(run("minimal", { hasPlacedGuns: true, gunCoverage: [[true]] }).gunsFired).toBe(false);
  });

  it("trail_guns stays dormant without equipment", () => {
    expect(run("high", { talentsOwned: ["trail_guns"] }).gunsFired).toBe(false);
    expect(run("mid", { talentsOwned: ["trail_guns"] }).gunsFired).toBe(false);
  });

  it("groomVisible is false on minimal, true otherwise", () => {
    expect(run("minimal").groomVisible).toBe(false);
    expect(run("mid").groomVisible).toBe(true);
    expect(run("high").groomVisible).toBe(true);
  });

  it("earns a crew point instead of auto-learning talents", () => {
    expect(run("mid").talentLearned).toBeNull();
    expect(run("mid").crewPointsEarned).toBe(1);
    expect(run("mid").nextTalentHint).toBe("Surface Lift Tune");
    expect(run("mid", { talentsOwned: ["rope_tow"] }).nextTalentHint).toBe("Wide Grooming Pass");
  });

  it("returns no hint once all talents are owned", () => {
    const r = run("mid", { talentsOwned: CREW_TALENTS.map((t) => t.id) });
    expect(r.talentLearned).toBeNull();
    expect(r.crewPointsEarned).toBe(1);
    expect(r.nextTalentHint).toBeNull();
  });

  it("snow guns do not affect the scheduled weather", () => {
    const weatherTomorrow = { kind: "thaw", wind: "gusty" } as const;
    expect(run("mid", { weatherTomorrow }).weather).toBe("thaw");
    expect(run("mid", { weatherTomorrow, hasPlacedGuns: true }).weather).toBe("thaw");
  });

  it("a snow morning resets daysWithoutSnow and adds depth", () => {
    const r = run("minimal", { weatherTomorrow: { kind: "snow", wind: "calm" }, daysWithoutSnow: 4 });
    expect(r.weather).toBe("snow");
    expect(r.daysWithoutSnow).toBe(0);
    expect(r.snowDepth).toBeGreaterThan(0.3);
    expect(r.morningHeadline).toContain("A squall came through overnight");
  });

  it("a storm morning resets daysWithoutSnow and names the storm", () => {
    const r = run("minimal", { weatherTomorrow: { kind: "storm", wind: "gusty" }, daysWithoutSnow: 4 });
    expect(r.weather).toBe("storm");
    expect(r.daysWithoutSnow).toBe(0);
    expect(r.morningHeadline).toMatch(/storm/i);
  });

  it("a thaw morning removes depth and counts a dry day", () => {
    const r = run("minimal", { weatherTomorrow: { kind: "thaw", wind: "calm" }, daysWithoutSnow: 1 });
    expect(r.weather).toBe("thaw");
    expect(r.daysWithoutSnow).toBe(2);
    expect(r.snowDepth).toBeLessThan(0.3);
    expect(r.morningHeadline).toContain("Thaw today");
  });

  it("a clear morning counts a dry day", () => {
    const r = run("minimal", { daysWithoutSnow: 1 });
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

  it("has busier typical weekdays and weekends at the same starting fare", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const weekday = planArrivals({ ...base, dayIndex: 2 });
    const weekend = planArrivals({ ...base, dayIndex: 6 });
    expect(weekday).toBe(22);
    expect(weekend).toBe(36);
    expect(weekend).toBeGreaterThan(weekday);
  });

  it("gives cheap at least as many arrivals as expensive", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const cheap = planArrivals({ ...base, fare: "cheap" });
    const expensive = planArrivals({ ...base, fare: "expensive" });
    const balanced = planArrivals({ ...base, fare: "balanced" });
    expect(cheap).toBeGreaterThan(balanced);
    expect(balanced).toBe(24);
    expect(expensive).toBeLessThan(balanced);
  });

  it("applies weather, thin snow, building and talent modifiers", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const clear = planArrivals(base);
    expect(planArrivals({ ...base, weather: "snow" })).toBe(clear + 3);
    expect(planArrivals({ ...base, weather: "thaw" })).toBe(clear - 4);
    expect(planArrivals({ ...base, weather: "storm" })).toBe(clear - 5);
    expect(planArrivals({ ...base, snowQuality: 0.3 })).toBe(clear - 3);
    // +1 for the café itself, +1 because a café raises what the town expects a day to be worth.
    expect(planArrivals({ ...base, buildings: ["cafe"] })).toBe(clear + 2);
    expect(planArrivals({ ...base, talentsOwned: ["school_day"] })).toBe(clear + 2);
    expect(
      planArrivals({ ...base, dayIndex: 6, talentsOwned: ["ticket_booth"] }),
    ).toBe(planArrivals({ ...base, dayIndex: 6 }) + 1);
    // elena: round(0.08 * 20) = 2
    expect(planArrivals({ ...base, founderId: "elena" })).toBe(clear + 2);
  });

  it("keeps a minimum roster of 12 and clamps busy weekends to the lodge cap", () => {
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
    ).toBe(58);
  });

  it("raises the arrival cap with lodge tier", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const busy = {
      ...base,
      dayIndex: 6,
      fare: "cheap" as const,
      weather: "snow" as const,
      reputation: 100,
      founderId: "elena" as const,
      talentsOwned: ["ticket_booth"] as string[],
      buildings: ["cafe"] as BuildingId[],
      rand: () => 0.99,
    };
    expect(planArrivals({ ...busy, lodgeTier: 1 })).toBe(58);
    expect(planArrivals({ ...busy, lodgeTier: 3 })).toBeGreaterThan(58);
    expect(planArrivals({ ...busy, lodgeTier: 3 })).toBeLessThanOrEqual(84);
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
        expect(mean({ dayIndex, fare })).toBeCloseTo(avg, 12);
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
    schoolOfferReady: false,
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

  it("school_bus fires only when an offer is available", () => {
    expect(readyStoryBeat({ ...quiet, schoolOfferReady: true })).toBe("school_bus");
    expect(readyStoryBeat({ ...quiet, dayIndex: 2, arrivals: 28 })).toBeNull();
  });

  it("groomer_down fires in the midpoint window with groom history and recent Mid/High", () => {
    const mid = 10;
    const eligible = {
      ...quiet,
      seasonLength: 28,
      dayIndex: mid,
      seasonGroomFeet: 6000,
      recentSnowPresets: ["mid", "high", "mid", "high", "minimal"] as const,
    };
    expect(readyStoryBeat(eligible)).toBe("groomer_down");
    expect(readyStoryBeat({ ...eligible, dayIndex: 5 })).toBeNull();
    expect(readyStoryBeat({ ...eligible, seasonGroomFeet: 1000 })).toBeNull();
    expect(readyStoryBeat({ ...eligible, recentSnowPresets: ["minimal", "minimal", "mid"] })).toBeNull();
  });

  it("dry_week fires at 3 dry days and depth under 0.35, not at the edge", () => {
    const at = { ...quiet, daysWithoutSnow: 3, snowDepth: 0.34 };
    expect(readyStoryBeat(at)).toBe("dry_week");
    expect(readyStoryBeat({ ...at, daysWithoutSnow: 2 })).toBeNull();
    expect(readyStoryBeat({ ...at, snowDepth: 0.35 })).toBeNull();
  });

  it("summit_link requires reputation 40 from day 18 through the penultimate day", () => {
    const eligible = { ...quiet, reputation: 40, dayIndex: 18 };
    expect(readyStoryBeat(eligible)).toBe("summit_link");
    expect(readyStoryBeat({ ...eligible, reputation: 39 })).toBeNull();
    expect(readyStoryBeat({ ...eligible, dayIndex: 17 })).toBeNull();
    expect(readyStoryBeat({ ...eligible, dayIndex: 27 })).toBe("summit_link");
    expect(readyStoryBeat({ ...eligible, dayIndex: 28 })).toBeNull();
  });

  it("returns the earliest beat in STORY_BEATS order when several are ready", () => {
    const many: BeatCheckInput = {
      ...quiet,
      liftsOpen: 1,
      completedRuns: 5,
      reputation: 80,
      schoolOfferReady: true,
    };
    expect(readyStoryBeat(many)).toBe("first_load");
    expect(readyStoryBeat({ ...many, completedBeats: ["first_load"] })).toBe(
      "school_bus",
    );
  });

  it("skips completed beats", () => {
    const input = { ...quiet, dayIndex: 18, reputation: 55, completedBeats: ["summit_link" as const] };
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
    lifts: starterLifts(),
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

  it("walks from a remote trail end before joining the selected lift", () => {
    const trail = { ...defaultTrails()[0], path: [defaultTrails()[0].path[0], { x: 10, z: 0 }] };
    const options = { trails: [trail] };
    const [walking] = tickGuests([skier({ targetRuns: 9, energy: 1 })], clock(T0 + 30, options));
    expect(walking.state).toBe("walk_lift");
    expect(walking.liftIndex).toBe(0);
    const [halfway] = tickGuests([walking], clock(T0 + 31, options));
    expect(halfway.state).toBe("walk_lift");
    const [queued] = tickGuests([walking], clock(T0 + 40, options));
    expect(queued.state).toBe("queue");
    expect(queued.liftIndex).toBe(0);
  });

  it("walks a skier home from a painted trail that ends about 5 units from the base", () => {
    const base = TERRAIN.base;
    const [first] = defaultTrails();
    const trail = { ...first, path: [first.path[0], { x: base.x + 5, z: base.z }] };
    const options = { trails: [trail] };
    const [walking] = tickGuests([skier({ targetRuns: 9, energy: 1 })], clock(T0 + 30, options));
    expect(walking).toMatchObject({ state: "walk_lift", liftIndex: 0, runs: 1 });
    const liftBottom = starterLifts()[0].bottom ?? TERRAIN.base;
    const walkMin = walkDurationMin(walkToLiftPath(trail.path, liftBottom), TERRAIN);
    expect(Number.isFinite(walkMin)).toBe(true);
    const [queued] = tickGuests([walking], clock(T0 + 30 + Math.ceil(walkMin) + 1, options));
    expect(queued).toMatchObject({ state: "queue", liftIndex: 0 });
  });

  it("keeps a skier on the hill when the only lift is temporarily wind-held", () => {
    const [surface] = starterLifts();
    const lifts = [{ ...surface, type: "chair" as const }];
    const options = { lifts, wind: "gusty" as const };
    const [returning] = tickGuests(
      [skier({ targetRuns: 9, joinedQueueAtMin: T0 - 5 })],
      clock(WIND_HOLD.fromMin, options),
    );
    expect(returning).toMatchObject({ state: "walk_lift", runs: 1, liftIndex: 0 });
    const trailPath = defaultTrails()[0].path;
    const walkMin = walkDurationMin(walkToLiftPath(trailPath, lifts[0].bottom ?? TERRAIN.base), TERRAIN);
    const doneAt = returning.stateSinceMin + Math.ceil(walkMin) + 1;
    const [waiting] = tickGuests([returning], clock(doneAt, options));
    expect(waiting).toMatchObject({ state: "walk_lift", progress: 1, joinedQueueAtMin: doneAt });
    const reopening = clock(WIND_HOLD.toMin, options);
    const queued = tickGuests([waiting], reopening);
    const loading = stepLifts(queued, lifts, reopening.trails, [], WIND_HOLD.toMin + 2, 2, "gusty");
    expect(loading.guests[0]).toMatchObject({ state: "ride", runs: 1, liftIndex: 0 });
    expect(loading.waits[0]).toBeGreaterThanOrEqual(WIND_HOLD.toMin - doneAt);
    expect(loading.waits[0]).toBeLessThanOrEqual(WIND_HOLD.toMin - WIND_HOLD.fromMin + 1);
  });

  it("keeps an arriving walker at the intended lift during a wind hold", () => {
    const [surface] = starterLifts();
    const lifts = [surface, { ...surface, type: "chair" as const, bottom: { x: 10, z: 0 } }];
    const [trail] = defaultTrails();
    const options = { lifts, trails: [trail, { ...trail, liftIndex: 1 }], wind: "gusty" as const };
    const trailPath = options.trails?.[1]?.path ?? trail.path;
    const walkMin = walkDurationMin(walkToLiftPath(trailPath, lifts[1].bottom ?? TERRAIN.base), TERRAIN);
    const walker = skier({
      state: "walk_lift",
      stateSinceMin: WIND_HOLD.fromMin - Math.ceil(walkMin) - 2,
      liftIndex: 1,
      trailIndex: 1,
    });
    const [waiting] = tickGuests([walker], clock(WIND_HOLD.fromMin, options));
    expect(waiting).toMatchObject({ state: "walk_lift", progress: 1, liftIndex: 1 });
    const held = stepLifts([waiting], lifts, options.trails, [], WIND_HOLD.fromMin, 0.5, "gusty");
    expect(held.lifts[0].queue).toEqual([]);
    const queued = tickGuests(held.guests, clock(WIND_HOLD.toMin, options));
    const opened = stepLifts(queued, held.lifts, options.trails, [], WIND_HOLD.toMin, 0.5, "gusty");
    expect(opened.lifts[1].queue).toEqual([walker.id]);
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
    const noLift = starterLifts().map((l) => ({ ...l, confirmed: false }));
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

  it("draws every persona from its weekday, weekend and holiday mix", () => {
    for (const mix of ["weekday", "weekend", "holiday"] as const) {
      const rng = createRng(17);
      const roster = createInitialGuests(5000, () => rng.next(), mix);
      for (const p of Object.values(PERSONAS)) {
        const share = roster.filter(g => g.persona === p.id).length / roster.length;
        expect(Math.abs(share - p[`${mix}Share`])).toBeLessThan(0.03);
      }
    }
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
    const weatherDays = generateSeasonWeather(7, SEASON_LENGTH + 1);
    let weather = weatherDays[0].kind;
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
      expect(arrivals).toBeLessThanOrEqual(64);

      const recap = buildNightRecap({
        stats: { ...emptyDayStats(), arrivals },
        fare: "balanced",
        snowQuality,
        day: { score: 70, breakdown: ZERO_TERMS, guests: arrivals, hillValue: 45 },
        arrivalMood: 0.7,
        costs: { fixed: DAILY_FIXED_COST, founder: 0, liftOps: LIFT_OPS_COST, upkeep: 0 },
      });
      cash += recap.cashDelta;

      const overnight = applyOvernight({
        snow: "mid",
        cash,
        trails,
        weatherTomorrow: weatherDays[day],
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
      // Crew points are spent in Office; overnight no longer auto-learns talents.

      expect(Number.isFinite(cash)).toBe(true);
      expect(Number.isFinite(snowQuality)).toBe(true);
      expect(Number.isFinite(snowDepth)).toBe(true);
      day += 1;
      nights += 1;
    }

    expect(nights).toBe(SEASON_LENGTH);
    expect(day).toBe(SEASON_LENGTH + 1);
    // Talents are chosen in Office; this harness does not spend crew points.
    expect(talentsOwned).toHaveLength(0);
  });
});
