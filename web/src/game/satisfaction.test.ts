import { freshTrail } from "./snow";
import { describe, expect, it } from "vitest";
import { LIFT_PREVIEW_SLOTS } from "./descent";
import { createRng } from "./rng";
import * as rules from "./rules";
import {
  NO_PROBLEM,
  SAT,
  ZERO_TERMS,
  biggestProblem,
  daySatisfaction,
  guestSatisfaction,
  guestTerms,
  problemLine,
  queuePain,
  type SatisfactionContext,
} from "./satisfaction";
import { createInitialGuests, emptyDayStats, makeGuest, planArrivals, tickGuests } from "./sim";
import { createInitialState, migrate, toPersisted, type GameState } from "./state";
import { stepLifts } from "./lifts";
import { DAY_START_MIN, LIFT_CLOSE_MIN, type Guest } from "./types";

const ctx = (over: Partial<SatisfactionContext> = {}): SatisfactionContext => ({
  fare: "balanced",
  arrivalMood: SAT.ARRIVAL_NEUTRAL,
  snowExpectation: SAT.SNOW_EXPECTED,
  now: 12 * 60,
  ...over,
});

/** A guest who has finished a day with the given tallies. */
const finished = (over: Partial<Guest> = {}): Guest =>
  makeGuest({
    state: "gone",
    persona: "regular",
    runs: 8,
    targetRuns: 8,
    waitMin: 0,
    waitCount: 8,
    snowSum: 8 * SAT.SNOW_EXPECTED,
    ...over,
  });

const score = (g: Guest, c = ctx()) => guestSatisfaction(g, c);

describe("guest satisfaction terms", () => {
  it("scores a neutral day at the base plus the full-target runs bonus", () => {
    const t = guestTerms(finished(), ctx());
    expect(t.queue).toBeCloseTo(0, 10);
    expect(t.snow).toBeCloseTo(0, 10);
    expect(t.value).toBeCloseTo(0, 10);
    expect(t.arrivalMood).toBeCloseTo(0, 10);
    expect(t.runs).toBe(SAT.RUNS_BONUS);
    expect(score(finished())).toBeCloseTo(SAT.BASE + SAT.RUNS_BONUS, 10);
  });

  it("longer waits lower the score", () => {
    const waits = [1, 2, 3, 4.5, 6, 7].map((m) => score(finished({ waitMin: m * 8 })));
    for (let i = 1; i < waits.length; i++) expect(waits[i]).toBeLessThan(waits[i - 1]);
    // A wait inside the free minute costs nothing.
    expect(score(finished({ waitMin: 0 }))).toBe(waits[0]);
  });

  it("a wait of a minute or less is free, and pain eases past the knee", () => {
    expect(queuePain(0.9)).toBe(0);
    expect(queuePain(SAT.QUEUE_KNEE_MIN) - queuePain(SAT.QUEUE_KNEE_MIN - 1)).toBeCloseTo(1, 10);
    expect(queuePain(SAT.QUEUE_KNEE_MIN + 1) - queuePain(SAT.QUEUE_KNEE_MIN)).toBeCloseTo(
      SAT.QUEUE_FAR_SLOPE,
      10,
    );
  });

  it("caps the queue term so one long line cannot zero the score", () => {
    const awful = guestTerms(finished({ waitMin: 8 * 60 }), ctx());
    const worse = guestTerms(finished({ waitMin: 8 * 600 }), ctx());
    expect(awful.queue).toBe(-SAT.QUEUE_CAP);
    expect(worse.queue).toBe(-SAT.QUEUE_CAP);
    expect(score(finished({ waitMin: 8 * 600 }))).toBeGreaterThan(SAT.BASE - SAT.QUEUE_CAP - 1);
  });

  it("weighs queue pain by persona (regulars mind more than first-timers)", () => {
    const wait = { waitMin: 8 * 5 };
    const reg = guestTerms(finished({ ...wait, persona: "regular" }), ctx()).queue;
    const first = guestTerms(finished({ ...wait, persona: "first_timer" }), ctx()).queue;
    expect(reg).toBeLessThan(first);
    expect(reg / first).toBeCloseTo(1.5 / 1.2, 10);
  });

  it("counts the line a guest is standing in right now", () => {
    const waiting = makeGuest({ state: "queue", joinedQueueAtMin: 600 });
    const early = guestTerms(waiting, ctx({ now: 602 })).queue;
    const later = guestTerms(waiting, ctx({ now: 615 })).queue;
    expect(later).toBeLessThan(early);
    // A guest in a line they have not joined yet has no wait.
    expect(guestTerms(makeGuest({ state: "queue" }), ctx({ now: 615 })).queue).toBe(0);
  });

  it("better snow raises the score and thin snow lowers it", () => {
    const at = (q: number) => score(finished({ snowSum: 8 * q }));
    expect(at(0.9)).toBeGreaterThan(at(0.7));
    expect(at(0.7)).toBeGreaterThan(at(SAT.SNOW_EXPECTED));
    expect(at(0.3)).toBeLessThan(at(SAT.SNOW_EXPECTED));
  });

  it("a higher snow expectation lowers the snow term", () => {
    const g = finished({ snowSum: 8 * 0.7 });
    expect(score(g, ctx({ snowExpectation: SAT.SNOW_EXPECTED + 0.1 }))).toBeLessThan(score(g));
  });

  it("a guest with no run has felt no snow", () => {
    expect(guestTerms(makeGuest({ state: "ski", runs: 0 }), ctx()).snow).toBe(0);
  });

  it("pricier fares lower the score, regulars by more than first-timers", () => {
    const at = (fare: "cheap" | "balanced" | "expensive", persona: "regular" | "first_timer") =>
      score(finished({ persona }), ctx({ fare }));
    for (const persona of ["regular", "first_timer"] as const) {
      expect(at("cheap", persona)).toBeGreaterThan(at("balanced", persona));
      expect(at("balanced", persona)).toBeGreaterThan(at("expensive", persona));
    }
    const dropReg = at("balanced", "regular") - at("expensive", "regular");
    const dropFirst = at("balanced", "first_timer") - at("expensive", "first_timer");
    expect(dropReg).toBeGreaterThan(dropFirst);
    expect(dropReg / dropFirst).toBeCloseTo(1.3 / 0.8, 10);
  });

  it("more runs raise the score up to the target, then stop", () => {
    const at = (runs: number) => score(finished({ runs, targetRuns: 8, snowSum: 0 }), ctx({ snowExpectation: 0 }));
    for (let r = 1; r <= 8; r++) expect(at(r)).toBeGreaterThan(at(r - 1));
    expect(at(12)).toBe(at(8));
  });

  it("very few runs cost points, and a guest turned away costs the most", () => {
    const t = (runs: number) => guestTerms(finished({ runs, snowSum: 0 }), ctx()).runs;
    expect(t(1)).toBeLessThan(0);
    expect(t(0)).toBe(-SAT.RUNS_PENALTY);
    expect(t(0)).toBeLessThan(t(1));
  });

  it("applies the runs term only once the guest's day is over", () => {
    expect(guestTerms(makeGuest({ state: "ski", runs: 1, targetRuns: 8 }), ctx()).runs).toBe(0);
    expect(guestTerms(makeGuest({ state: "depart", runs: 1, targetRuns: 8 }), ctx()).runs).toBeLessThan(0);
  });

  it("arrival mood raises the score, and weather moves it", () => {
    const at = (m: number) => score(finished(), ctx({ arrivalMood: m }));
    expect(at(0.9)).toBeGreaterThan(at(0.7));
    expect(at(0.5)).toBeLessThan(at(0.7));
    const b = ["warming_hut"] as const;
    const snow = rules.arrivalMood([...b], null, "snow");
    const clear = rules.arrivalMood([...b], null, "clear");
    const thaw = rules.arrivalMood([...b], null, "thaw");
    expect(snow).toBeGreaterThan(clear);
    expect(clear).toBeGreaterThan(thaw);
    expect(rules.arrivalMood([...b, "lodge"], null)).toBeGreaterThan(clear);
  });

  it("clamps to 0..100", () => {
    const best = finished({ snowSum: 8, waitMin: 0 });
    expect(score(best, ctx({ fare: "cheap", arrivalMood: 0.95, snowExpectation: 0 }))).toBeLessThanOrEqual(100);
    const worst = finished({ runs: 0, waitMin: 1e6, snowSum: 0 });
    expect(score(worst, ctx({ fare: "expensive", arrivalMood: 0 }))).toBeGreaterThanOrEqual(0);
  });
});

describe("day satisfaction", () => {
  const happy = finished();
  const grumpy = finished({ waitMin: 8 * 12, runs: 2, snowSum: 2 * 0.3 });

  it("is the mean of the guests who arrived", () => {
    const day = daySatisfaction([happy, grumpy], ctx());
    expect(day.guests).toBe(2);
    expect(day.score).toBeCloseTo((score(happy) + score(grumpy)) / 2, 10);
  });

  it("leaves out guests who have not arrived yet", () => {
    const pending = makeGuest({ state: "pending" });
    expect(daySatisfaction([happy, pending], ctx()).score).toBe(daySatisfaction([happy], ctx()).score);
  });

  it("counts a guest turned away with their low score, which lowers the day", () => {
    const turnedAway = finished({ runs: 0, snowSum: 0, waitMin: 20, waitCount: 1 });
    expect(score(turnedAway)).toBeLessThan(SAT.BASE - 10);
    const without = daySatisfaction([happy, happy, happy], ctx()).score;
    const withOne = daySatisfaction([happy, happy, turnedAway], ctx()).score;
    expect(withOne).toBeLessThan(without);
    expect(withOne).toBeCloseTo((2 * score(happy) + score(turnedAway)) / 3, 10);
  });

  it("includes guests still on the hill by what has happened so far", () => {
    const skiing = makeGuest({ state: "ski", runs: 2, targetRuns: 8, snowSum: 2 * 0.8, waitMin: 4, waitCount: 2 });
    const day = daySatisfaction([skiing], ctx());
    expect(day.score).toBeCloseTo(score(skiing), 10);
    expect(day.breakdown.runs).toBe(0);
  });

  it("averages each term into the breakdown", () => {
    const day = daySatisfaction([happy, grumpy], ctx());
    const a = guestTerms(happy, ctx());
    const b = guestTerms(grumpy, ctx());
    expect(day.breakdown.queue).toBeCloseTo((a.queue + b.queue) / 2, 10);
    expect(day.breakdown.snow).toBeCloseTo((a.snow + b.snow) / 2, 10);
    expect(day.breakdown.runs).toBeCloseTo((a.runs + b.runs) / 2, 10);
  });

  it("before anyone arrives is the score of a fresh guest", () => {
    const day = daySatisfaction([], ctx());
    expect(day.guests).toBe(0);
    expect(day.score).toBeCloseTo(SAT.BASE, 10);
    expect(daySatisfaction([makeGuest({ state: "pending" })], ctx()).score).toBe(day.score);
  });
});

describe("problem line", () => {
  const facts = {
    avgWaitMin: 7.4,
    snowQuality: 0.3,
    fare: "expensive" as const,
    turnedAway: 3,
    runsPerGuest: 2.5,
    arrivalMood: 0.6,
  };

  it("picks the term with the largest negative contribution", () => {
    expect(biggestProblem({ ...ZERO_TERMS, queue: -9, snow: -12, value: -4 })).toBe("snow");
    expect(biggestProblem({ ...ZERO_TERMS, queue: -20, snow: -12 })).toBe("queue");
    expect(biggestProblem({ ...ZERO_TERMS, value: -6, runs: -4 })).toBe("value");
    expect(biggestProblem({ ...ZERO_TERMS, runs: -5, arrivalMood: -3.5 })).toBe("runs");
    expect(biggestProblem({ ...ZERO_TERMS, arrivalMood: -4 })).toBe("arrivalMood");
  });

  it("ignores positive terms and small negatives", () => {
    expect(biggestProblem({ ...ZERO_TERMS, queue: -2.9, snow: 20 })).toBeNull();
    expect(problemLine({ ...ZERO_TERMS, snow: 15 }, facts)).toBe(NO_PROBLEM);
  });

  it("quotes the real number in each sentence", () => {
    expect(problemLine({ ...ZERO_TERMS, queue: -10 }, facts)).toContain("~7 min a ride");
    expect(problemLine({ ...ZERO_TERMS, snow: -10 }, facts)).toContain("30%");
    expect(problemLine({ ...ZERO_TERMS, value: -10 }, facts)).toContain("$62");
    expect(problemLine({ ...ZERO_TERMS, runs: -10 }, facts)).toContain("3 turned away");
    expect(problemLine({ ...ZERO_TERMS, runs: -10 }, { ...facts, turnedAway: 0 })).toContain("2.5 runs");
    expect(problemLine({ ...ZERO_TERMS, arrivalMood: -10 }, facts)).toContain("60");
  });
});

describe("guest tallies", () => {
  it("adds a wait to the guest each time a lift dispatches them", () => {
    const lifts = createInitialState(1).lifts;
    const g = makeGuest({ id: "a", state: "queue" });
    let guests = [g];
    let l = lifts;
    let now = 600;
    for (let i = 0; i < 20 && guests[0].state === "queue"; i++) {
      now += 0.5;
      const r = stepLifts(guests, l, [], now, 0.5);
      guests = r.guests;
      l = r.lifts;
    }
    expect(guests[0].state).toBe("ride");
    expect(guests[0].waitCount).toBe(1);
    expect(guests[0].waitMin).toBeGreaterThan(0);
  });

  it("adds the snow quality under each finished run", () => {
    const skier = makeGuest({ state: "ski", stateSinceMin: 600, targetRuns: 9 });
    const clock = { now: 700, snowQuality: 0.8, lapOverheadMin: 3 };
    const [done] = tickGuests([skier], clock);
    expect(done.runs).toBe(1);
    expect(done.snowSum).toBeCloseTo(0.8, 10);
  });

  it("counts the wait of a guest sent home from a line at close", () => {
    const stuck = makeGuest({ state: "queue", joinedQueueAtMin: LIFT_CLOSE_MIN - 20 });
    const [home] = tickGuests([stuck], { now: LIFT_CLOSE_MIN, snowQuality: 0.6, lapOverheadMin: 3 });
    expect(home.state).toBe("depart");
    expect(home.waitCount).toBe(1);
    expect(home.waitMin).toBeCloseTo(20, 10);
    expect(guestTerms(home, ctx()).queue).toBeLessThan(-10);
  });

  it("a guest returning to the line starts a fresh wait", () => {
    const skier = makeGuest({ state: "ski", stateSinceMin: 600, joinedQueueAtMin: 500, targetRuns: 9 });
    const [back] = tickGuests([skier], { now: 700, snowQuality: 0.6, lapOverheadMin: 3 });
    expect(back.state).toBe("queue");
    expect(back.joinedQueueAtMin).toBeUndefined();
  });
});

describe("whole days", () => {
  /** Play a day to close from 07:30 with the whole roster pending. */
  function playDay(seed: number, dayIndex: number, over: Partial<GameState> = {}, chair = false) {
    const base = rules.pickFounder(createInitialState(seed), "elena");
    const rng = createRng(seed * 7919 + 13);
    const rand = () => rng.next();
    const arrivals = planArrivals({
      dayIndex,
      fare: "balanced",
      snowQuality: base.snowQuality,
      weather: "clear",
      buildings: base.buildings,
      talentsOwned: [],
      founderId: "elena",
      rand,
    });
    const lifts = chair
      ? [
          ...base.lifts,
          { type: "chair" as const, anchor: LIFT_PREVIEW_SLOTS[1], confirmed: true, queue: [], dispatchCredit: 0, trail: freshTrail() },
        ]
      : base.lifts;
    const s: GameState = {
      ...base,
      dayIndex,
      clockMin: DAY_START_MIN,
      lifts,
      guests: createInitialGuests(arrivals, rand, dayIndex === 6),
      dayStats: { ...emptyDayStats(), arrivals },
      paused: false,
      ...over,
    };
    // Snow lives on the trails; a snowQuality override means an even trail at that quality.
    if (over.snowQuality !== undefined) {
      s.lifts = s.lifts.map((l) => ({ ...l, trail: freshTrail(0.45, over.snowQuality) }));
    }
    return rules.skipToClose(s);
  }
  const WEEKDAY = 2;
  const SATURDAY = 6;
  const seeds = [1, 2, 3, 4, 5];

  it("a short-queue weekday lands in the good range with no problem to name", () => {
    for (const seed of seeds) {
      const r = playDay(seed, WEEKDAY, {}, true).nightRecap!;
      expect(r.satisfaction).toBeGreaterThan(65);
      expect(r.satisfaction).toBeLessThan(85);
      expect(r.problem).toBe(NO_PROBLEM);
    }
  });

  it("a Saturday on the surface lift alone blames the queue", () => {
    for (const seed of seeds) {
      const r = playDay(seed, SATURDAY).nightRecap!;
      expect(r.breakdown.queue).toBeLessThan(-10);
      expect(r.problem).toContain("Long lift lines");
      expect(r.satisfaction).toBeLessThan(65);
    }
  });

  it("a thin-snow day blames the snow, a steep-fare day the ticket", () => {
    for (const seed of seeds) {
      const thin = playDay(seed, WEEKDAY, { snowQuality: 0.3 }, true).nightRecap!;
      expect(thin.problem).toContain("Thin, scraped snow");
      // The day's traffic wears the 30% trail a little, so the quoted mean is a bit under 30%.
      expect(thin.problem).toMatch(/\(mean quality (2\d|30)%\)/);
      const steep = playDay(seed, WEEKDAY, { fare: "expensive" }, true).nightRecap!;
      expect(steep.problem).toContain("steep");
      expect(steep.problem).toContain("$62");
    }
  });

  it("the problem is always the most negative term of the stored breakdown", () => {
    const keyword = {
      queue: "Long lift lines",
      snow: "Thin, scraped snow",
      value: "ticket was steep",
      runs: "barely skied",
      arrivalMood: "cold welcome",
    } as const;
    for (const seed of seeds) {
      for (const over of [{}, { snowQuality: 0.3 }, { fare: "expensive" as const }]) {
        const r = playDay(seed, SATURDAY, over).nightRecap!;
        const worst = biggestProblem(r.breakdown);
        if (worst === null) expect(r.problem).toBe(NO_PROBLEM);
        else expect(r.problem).toContain(keyword[worst]);
      }
    }
  });

  it("each lever moves the day the right way", () => {
    const day = (over: Partial<GameState>, chair = true) =>
      playDay(3, WEEKDAY, over, chair).nightRecap!.satisfaction;
    expect(day({ snowQuality: 0.85 })).toBeGreaterThan(day({ snowQuality: 0.55 }));
    expect(day({ snowQuality: 0.3 })).toBeLessThan(day({ snowQuality: 0.55 }));
    expect(day({ fare: "cheap" })).toBeGreaterThan(day({ fare: "balanced" }));
    expect(day({ fare: "expensive" })).toBeLessThan(day({ fare: "balanced" }));
    expect(day({}, false)).toBeLessThanOrEqual(day({}, true));
    expect(day({ weather: "snow" })).toBeGreaterThan(day({ weather: "thaw" }));
  });

  it("the HUD reading equals the recap at close and is reproducible", () => {
    for (const seed of seeds) {
      const night = playDay(seed, SATURDAY);
      expect(night.nightRecap!.satisfaction).toBe(rules.liveSatisfaction({ ...night, phase: "day" }));
      expect(playDay(seed, SATURDAY).nightRecap).toEqual(night.nightRecap);
    }
  });

  it("a day with turned-away guests scores below the same day without them", () => {
    const happyOnes = Array.from({ length: 10 }, (_, i) =>
      finished({ id: `h${i}`, arriveAtMin: 9 * 60 }),
    );
    const lined = Array.from({ length: 20 }, (_, i) =>
      makeGuest({ id: `q${i}`, state: "queue", persona: "regular", targetRuns: 8, arriveAtMin: 15 * 60 }),
    );
    const base = rules.pickFounder(createInitialState(1), "elena");
    const night = rules.skipToClose({
      ...base,
      clockMin: 15 * 60 + 40,
      paused: false,
      guests: [...happyOnes, ...lined],
      dayStats: { ...emptyDayStats(), arrivals: 30, guestsArrived: 30 },
    });
    expect(night.dayStats.turnedAway).toBeGreaterThan(5);
    const c = rules.satisfactionContext(night);
    const sent = night.guests.filter((g) => g.runs === 0);
    expect(sent.length).toBe(night.dayStats.turnedAway);
    const rest = night.guests.filter((g) => g.runs > 0);
    expect(daySatisfaction(night.guests, c).score).toBeLessThan(daySatisfaction(rest, c).score);
    expect(night.nightRecap!.breakdown.runs).toBeLessThan(0);
  });
});

describe("save migration to v4", () => {
  it("gives mid-day guests zeroed tallies and a night recap an empty breakdown", () => {
    const night = playDayNight();
    const saved = JSON.parse(JSON.stringify(toPersisted(night)));
    for (const g of saved.guests) {
      delete g.waitMin;
      delete g.waitCount;
      delete g.snowSum;
    }
    delete saved.nightRecap.breakdown;
    const m = migrate(saved, 3);
    expect(m.guests.every((g) => g.waitMin === 0 && g.waitCount === 0 && g.snowSum === 0)).toBe(true);
    expect(m.nightRecap?.breakdown).toEqual(ZERO_TERMS);
    expect(Number.isFinite(rules.liveSatisfaction({ ...createInitialState(1), ...m }))).toBe(true);
  });

  function playDayNight(): GameState {
    return rules.skipToClose(rules.togglePause(rules.pickFounder(createInitialState(7), "elena")));
  }
});
