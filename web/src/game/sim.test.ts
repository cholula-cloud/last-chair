import { afterEach, describe, expect, it, vi } from "vitest";
import { CREW_TALENTS } from "./content";
import {
  applyOvernight,
  buildNightRecap,
  computeDayRevenue,
  computeSatisfaction,
  emptyDayStats,
  formatClock,
  isWeekend,
  planArrivals,
  readyStoryBeat,
  rollMorningWeather,
  tickGuests,
  weekdayLabel,
  type BeatCheckInput,
} from "./sim";
import {
  DAILY_FIXED_COST,
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

describe("computeSatisfaction", () => {
  it("clamps to 0..100", () => {
    expect(computeSatisfaction("cheap", 1, 0, 1)).toBe(100);
    expect(computeSatisfaction("expensive", 0, 20, 0)).toBe(0);
  });

  it("drops as the queue gets worse", () => {
    const short = computeSatisfaction("balanced", 0.7, 1);
    const long = computeSatisfaction("balanced", 0.7, 5);
    expect(long).toBeLessThan(short);
  });

  it("rises with better snow", () => {
    const thin = computeSatisfaction("balanced", 0.3, 2);
    const deep = computeSatisfaction("balanced", 0.9, 2);
    expect(deep).toBeGreaterThan(thin);
  });

  it("ranks cheap > balanced > expensive at equal inputs", () => {
    const cheap = computeSatisfaction("cheap", 0.6, 2);
    const balanced = computeSatisfaction("balanced", 0.6, 2);
    const expensive = computeSatisfaction("expensive", 0.6, 2);
    expect(cheap).toBeGreaterThan(balanced);
    expect(balanced).toBeGreaterThan(expensive);
  });

  it("is lowered by snowExpectationPenalty", () => {
    const base = computeSatisfaction("balanced", 0.7, 2, 0.7, 0);
    const penalized = computeSatisfaction("balanced", 0.7, 2, 0.7, 0.1);
    expect(penalized).toBeLessThan(base);
  });

  // Pinned (replaced in PR 7): the queue term is a flat -8 per average queue
  // minute with no cap, so the queue dominates every other input.
  it("pins the current linear queue formula", () => {
    // 70 - 8*2 + 25*0.7 - 15*0.5 + 10*0.7 = 71
    expect(computeSatisfaction("balanced", 0.7, 2)).toBeCloseTo(71, 10);
    // Each extra queue minute costs exactly 8 points.
    const a = computeSatisfaction("balanced", 0.7, 3);
    const b = computeSatisfaction("balanced", 0.7, 4);
    expect(a - b).toBeCloseTo(8, 10);
  });
});

describe("computeDayRevenue", () => {
  it("scales arrivals * fare * satisfaction multiplier", () => {
    // mult = 0.75 + 0.35 * s/100
    expect(computeDayRevenue("balanced", 100, 20)).toBe(1056);
    expect(computeDayRevenue("balanced", 0, 20)).toBe(720);
    expect(computeDayRevenue("cheap", 50, 10)).toBe(
      Math.round(10 * 35 * (0.75 + 0.175)),
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

  it("cashDelta equals revenue minus fixed, founder and lift costs", () => {
    const recap = buildNightRecap(stats(30), "balanced", 0.7, 2, 0.7, 0, 2, 80);
    const revenue = computeDayRevenue("balanced", recap.satisfaction, 30);
    expect(recap.arrivals).toBe(30);
    expect(recap.satisfaction).toBeCloseTo(71, 10);
    expect(recap.cashDelta).toBe(
      revenue - (DAILY_FIXED_COST + 80 + LIFT_OPS_COST * 2),
    );
  });

  it("bills at least one lift even with none open", () => {
    const none = buildNightRecap(stats(30), "balanced", 0.7, 2, 0.7, 0, 0, 0);
    const one = buildNightRecap(stats(30), "balanced", 0.7, 2, 0.7, 0, 1, 0);
    expect(none.cashDelta).toBe(one.cashDelta);
  });

  it("reports a long queue first", () => {
    const r = buildNightRecap(stats(10), "balanced", 0.2, 5, 0.7, 0, 1, 0);
    expect(r.problem).toContain("Lift queue ran long");
  });

  it("reports thin cover when the queue is fine", () => {
    const r = buildNightRecap(stats(10), "balanced", 0.4, 2, 0.7, 0, 1, 0);
    expect(r.problem).toContain("Thin cover");
  });

  it("reports a quiet hill when queue and snow are fine", () => {
    const r = buildNightRecap(stats(17), "balanced", 0.7, 2, 0.7, 0, 1, 0);
    expect(r.problem).toContain("Quiet hill");
  });

  it("reports a good flow otherwise", () => {
    const r = buildNightRecap(stats(18), "balanced", 0.7, 4, 0.7, 0, 1, 0);
    expect(r.problem).toBe("Crowd flowed well.");
  });

  // Pinned: the start-of-day defaults. rules.tick fills them in as the day plays out.
  it("pins the emptyDayStats defaults", () => {
    expect(emptyDayStats()).toEqual({
      arrivals: 0,
      completedRuns: 0,
      avgQueueMin: 0,
      dispatched: 0,
      waitSumMin: 0,
      maxQueueLength: 0,
      peakWaitMin: 0,
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
  const start = {
    cash: 1000,
    snowQuality: 0.5,
    snowDepth: 0.3,
    // next day is 2 -> clear, so weather does not move snow numbers
    dayIndex: 1,
    buildings: [] as BuildingId[],
    talentsOwned: [] as string[],
    daysWithoutSnow: 0,
  };
  const run = (snow: SnowPreset, over: Partial<typeof start> = {}) =>
    applyOvernight({ snow, ...start, ...over });

  it("orders snowQuality High >= Mid >= Minimal from the same start", () => {
    const min = run("minimal");
    const mid = run("mid");
    const high = run("high");
    expect(high.snowQuality).toBeGreaterThanOrEqual(mid.snowQuality);
    expect(mid.snowQuality).toBeGreaterThanOrEqual(min.snowQuality);
    expect(min.snowQuality).toBeCloseTo(0.45, 10);
    expect(mid.snowQuality).toBeCloseTo(0.6, 10);
    expect(high.snowQuality).toBeCloseTo(0.72, 10);
  });

  // Pinned (replaced in PR 8): mid and high overwrite snowQuality with a
  // constant, ignoring the quality the hill started the night with.
  it("pins that mid and high ignore the starting snowQuality", () => {
    expect(run("mid", { snowQuality: 0.1 }).snowQuality).toBeCloseTo(0.6, 10);
    expect(run("mid", { snowQuality: 0.9 }).snowQuality).toBeCloseTo(0.6, 10);
    expect(run("high", { snowQuality: 0.1 }).snowQuality).toBeCloseTo(0.72, 10);
  });

  it("subtracts the snow cost from cash", () => {
    expect(run("minimal").cash).toBe(1000 - SNOW_NIGHT_COST.minimal);
    expect(run("mid").cash).toBe(1000 - SNOW_NIGHT_COST.mid);
    expect(run("high").cash).toBe(1000 - SNOW_NIGHT_COST.high);
  });

  it("snow guns add depth and fire on mid and high only", () => {
    const withGuns = run("mid", { buildings: ["snow_guns"] });
    const without = run("mid");
    expect(withGuns.snowDepth).toBeGreaterThan(without.snowDepth);
    expect(withGuns.gunsFired).toBe(true);
    expect(without.gunsFired).toBe(false);
    expect(run("minimal", { buildings: ["snow_guns"] }).gunsFired).toBe(false);
  });

  it("trail_guns talent fires guns on high only", () => {
    expect(run("high", { talentsOwned: ["trail_guns"] }).gunsFired).toBe(true);
    expect(run("mid", { talentsOwned: ["trail_guns"] }).gunsFired).toBe(false);
  });

  it("groom talents raise mid and high quality", () => {
    expect(run("mid", { talentsOwned: ["groom_pass"] }).snowQuality).toBeCloseTo(
      0.67,
      10,
    );
    expect(run("high", { talentsOwned: ["corduroy"] }).snowQuality).toBeCloseTo(
      0.82,
      10,
    );
  });

  it("groomVisible is false on minimal, true otherwise", () => {
    expect(run("minimal").groomVisible).toBe(false);
    expect(run("mid").groomVisible).toBe(true);
    expect(run("high").groomVisible).toBe(true);
  });

  it("learns the first unowned talent in CREW_TALENTS order", () => {
    expect(run("mid").talentLearned).toBe(CREW_TALENTS[0].name);
    expect(run("mid").nextTalentHint).toBe(CREW_TALENTS[1].name);
    // owning a later talent does not skip an earlier unowned one
    expect(run("mid", { talentsOwned: ["trail_guns"] }).talentLearned).toBe(
      "Rope Tow",
    );
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
    expect(run("mid", { dayIndex: 1 }).weather).toBe(rollMorningWeather(2, false));
    for (const day of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      expect(run("mid", { dayIndex: day }).weather).toBe(
        rollMorningWeather(day + 1, false),
      );
    }
  });

  it("a snow morning adds depth and quality and resets daysWithoutSnow", () => {
    // next day 4 -> roll 1 -> snow
    const r = run("minimal", { dayIndex: 3, daysWithoutSnow: 4 });
    expect(r.weather).toBe("snow");
    expect(r.daysWithoutSnow).toBe(0);
    expect(r.snowDepth).toBeCloseTo(0.3 + 0.02 + 0.12, 10);
    expect(r.snowQuality).toBeCloseTo(0.45 + 0.08, 10);
    expect(r.morningHeadline).toContain("Overnight squall");
  });

  it("a thaw morning removes depth and quality and counts a dry day", () => {
    // next day 8 -> roll 9 -> thaw
    const r = run("minimal", { dayIndex: 7, daysWithoutSnow: 1 });
    expect(r.weather).toBe("thaw");
    expect(r.daysWithoutSnow).toBe(2);
    expect(r.snowDepth).toBeCloseTo(0.3 + 0.02 - 0.08, 10);
    expect(r.snowQuality).toBeCloseTo(0.45 - 0.12, 10);
    expect(r.morningHeadline).toContain("Thaw watch");
  });

  it("a clear morning counts a dry day without changing snow", () => {
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
    expect(cheap).toBe(Math.round(20 * 1.1));
    expect(expensive).toBe(Math.round(20 * 0.9));
  });

  it("applies weather, thin snow, building and talent modifiers", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(planArrivals({ ...base, weather: "snow" })).toBe(21);
    expect(planArrivals({ ...base, weather: "thaw" })).toBe(14);
    expect(planArrivals({ ...base, snowQuality: 0.3 })).toBe(15);
    expect(planArrivals({ ...base, buildings: ["cafe"] })).toBe(19);
    expect(planArrivals({ ...base, talentsOwned: ["school_day"] })).toBe(20);
    expect(
      planArrivals({ ...base, dayIndex: 6, talentsOwned: ["ticket_booth"] }),
    ).toBe(32);
    // elena: round(0.08 * 20) = 2
    expect(planArrivals({ ...base, founderId: "elena" })).toBe(20);
  });

  it("clamps to 12..40", () => {
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
      }),
    ).toBe(40);
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
    buildings: [],
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

  it("school_bus fires on lessons, 28 weekday arrivals, or a lodge", () => {
    expect(readyStoryBeat({ ...quiet, lessonsBooked: true })).toBe("school_bus");
    expect(readyStoryBeat({ ...quiet, buildings: ["lodge"] })).toBe(
      "school_bus",
    );
    const weekday = { ...quiet, dayIndex: 2, arrivals: 28 };
    expect(readyStoryBeat(weekday)).toBe("school_bus");
    expect(readyStoryBeat({ ...weekday, arrivals: 27 })).toBeNull();
    expect(readyStoryBeat({ ...quiet, buildings: ["cafe"] })).toBeNull();
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
  const guest = (over: Partial<Guest> = {}): Guest => ({
    id: "g",
    label: "Guest",
    state: "arrive",
    progress: 0,
    mood: 0.8,
    ...over,
  });

  it("advances progress by dt * the state rate", () => {
    const [g] = tickGuests([guest()], 1);
    expect(g.state).toBe("arrive");
    expect(g.progress).toBeCloseTo(0.35, 10);
  });

  it("moves to the next state and resets progress at 1", () => {
    const [g] = tickGuests([guest({ progress: 0.9 })], 1);
    expect(g.state).toBe("queue");
    expect(g.progress).toBe(0);
  });

  it("moves arrivals to the queue", () => {
    expect(tickGuests([guest({ state: "arrive", progress: 0.99 })], 1)[0].state).toBe("queue");
  });

  it("leaves queued and riding guests to the lifts", () => {
    for (const state of ["queue", "ride"] as const) {
      const g = guest({ state, progress: 0.99 });
      expect(tickGuests([g], 1)[0]).toEqual(g);
    }
  });

  it("sends skiers back to the queue or out, by the random roll", () => {
    const skier = guest({ state: "ski", progress: 0.99 });
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    expect(tickGuests([skier], 1)[0].state).toBe("queue");
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    expect(tickGuests([skier], 1)[0].state).toBe("depart");
  });

  it("draws once per finishing skier, so two skiers can choose differently", () => {
    const skiers = [
      guest({ id: "a", state: "ski", progress: 0.99 }),
      guest({ id: "b", state: "ski", progress: 0.99 }),
    ];
    const rolls = [0.9, 0.1];
    const out = tickGuests(skiers, 1, () => rolls.shift()!);
    expect(out.map((g) => g.state)).toEqual(["queue", "depart"]);
  });

  it("draws nothing for guests that are not finishing a ski run", () => {
    const rand = vi.fn(() => 0.5);
    tickGuests(
      [
        guest({ state: "arrive" }),
        guest({ state: "queue", progress: 0.99 }),
        guest({ state: "ski", progress: 0 }),
      ],
      1,
      rand,
    );
    expect(rand).not.toHaveBeenCalled();
  });

  it("depart is terminal", () => {
    const gone = guest({ state: "depart", progress: 0.5 });
    const [g] = tickGuests([gone], 100);
    expect(g).toBe(gone);
    expect(g.state).toBe("depart");
    expect(g.progress).toBe(0.5);
  });
});

describe("headless season", () => {
  it("runs a full season of nights with finite numbers and ordered talents", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    let day = 1;
    let cash = 5000;
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

      const recap = buildNightRecap(
        { ...emptyDayStats(), arrivals },
        "balanced",
        snowQuality,
        2.5,
        0.7,
        0,
        1,
        0,
      );
      cash += recap.cashDelta;

      const overnight = applyOvernight({
        snow: "mid",
        cash,
        snowQuality,
        snowDepth,
        dayIndex: day,
        buildings,
        talentsOwned,
        daysWithoutSnow,
      });
      cash = overnight.cash;
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
