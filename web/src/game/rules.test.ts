import { addReferenceDescent, createBuiltHill } from "./__fixtures__/built-hill";
import { ASSET_CATALOG } from "./base";
import { constructionDraw } from "./economy";
import { REFERENCE_TOPS } from "./descent";
import { TERRAIN } from "./terrain";
import { describe, expect, it } from "vitest";
import * as rules from "./rules";
import { makeGuest, meanArrivals, planArrivals } from "./sim";
import { createRng } from "./rng";
import { NO_SKIERS_PROBLEM } from "./satisfaction";
import { migrate } from "./migrations";
import {
  hydrate,
  SAVE_VERSION,
  toPersisted,
  type GameState,
} from "./state";
import { BUILDING_COSTS, MS_PER_GAME_MINUTE, SNOW_NIGHT_COST, type Guest } from "./types";
import { WEATHER_KINDS } from "./weather";
import { observeGuests } from "./why";

const started = () => rules.pickFounder(createBuiltHill(7), "elena");

/** Runs the rule on a copy and checks the input state was left untouched. */
function pure<A extends unknown[], R = GameState>(
  rule: (s: GameState, ...a: A) => R,
  state: GameState,
  ...args: A
): R {
  const before = structuredClone(state);
  const out = rule(state, ...args);
  expect(state).toEqual(before);
  return out;
}

/** Close the day and acknowledge any radio beat, so Sleep is allowed. */
function atNight(): GameState {
  return rules.acknowledgeBeat(pure(rules.skipToClose, rules.togglePause(started())));
}

describe("pickFounder", () => {
  it("starts day 1 with guests and records the founder", () => {
    const s = pure(rules.pickFounder, createBuiltHill(7), "tom");
    expect(s.phase).toBe("day");
    expect(s.founderId).toBe("tom");
    expect(s.guests.length).toBe(s.dayStats.arrivals);
    expect(s.guests.length).toBeGreaterThan(0);
  });

  it("advances the RNG state", () => {
    expect(started().rngState).not.toBe(createBuiltHill(7).rngState);
  });

  it("is reproducible for the same seed", () => {
    expect(started()).toEqual(started());
  });
});

describe("skipToClose and sleep", () => {
  it("skipToClose opens the night with a recap", () => {
    const s = atNight();
    expect(s.phase).toBe("night");
    expect(s.paused).toBe(true);
    expect(s.nightRecap).not.toBeNull();
  });

  it("skipToClose does nothing outside the day phase", () => {
    const setup = createBuiltHill(7);
    expect(rules.skipToClose(setup)).toBe(setup);
  });

  it("sleep advances the day and charges the snow cost", () => {
    const night = atNight();
    const withSnow = pure(rules.setPendingSnow, night, "high");
    const recap = withSnow.nightRecap!;
    const next = pure(rules.sleep, withSnow);
    expect(next.phase).toBe("day");
    expect(next.dayIndex).toBe(night.dayIndex + 1);
    expect(next.cash).toBe(night.cash + recap.cashDelta - SNOW_NIGHT_COST.high);
    expect(next.nightRecap).toBeNull();
    expect(next.guests.length).toBe(next.dayStats.arrivals);
  });

  it("settles the final day's receipts without applying tomorrow's choices", () => {
    const night = { ...atNight(), pendingFare: "cheap" as const, pendingSnow: "high" as const };
    night.dayIndex = night.seasonLength;
    night.weather = night.weatherDays[night.dayIndex - 1].kind;
    const review = pure(rules.sleep, night);
    expect(review.phase).toBe("winter_review");
    expect(review.cash).toBe(night.cash + night.nightRecap!.cashDelta);
    expect(review.lastDay?.cashDelta).toBe(night.nightRecap!.cashDelta);
    expect(review.fare).toBe(night.fare);
    expect(review.snow).toBe(night.snow);
    expect(review.weather).toBe(night.weather);
    expect(review.trails).toEqual(night.trails);
    expect(review.talentsOwned).toEqual(night.talentsOwned);
    expect(review.rngState).toBe(night.rngState);
  });

  it("sleep waits for an unacknowledged story beat", () => {
    const night = atNight();
    const blocked: GameState = {
      ...night,
      pendingBeat: "first_load",
      beatAcknowledged: false,
    };
    expect(rules.sleep(blocked)).toBe(blocked);
    const cleared = rules.acknowledgeBeat(blocked);
    expect(cleared.completedBeats).toContain("first_load");
    expect(rules.sleep(cleared).phase).toBe("day");
  });
});

describe("buyBuilding", () => {
  it("buys a building and deducts its deposit", () => {
    const s = pure(rules.buyBuilding, started(), "cafe");
    expect(s.buildings).toContain("cafe");
    expect(s.cash).toBe(started().cash - constructionDraw(BUILDING_COSTS.cafe).deposit);
  });

  it("rejects a building that is already owned", () => {
    const owned = rules.buyBuilding(started(), "cafe");
    expect(rules.buyBuilding(owned, "cafe")).toBe(owned);
    const base = started();
    expect(rules.buyBuilding(base, "warming_hut")).toBe(base);
  });

  it("rejects a purchase the cash cannot cover", () => {
    const poor: GameState = { ...started(), cash: constructionDraw(BUILDING_COSTS.cafe).deposit - 1 };
    expect(rules.buyBuilding(poor, "cafe")).toBe(poor);
  });

  it("starts with a fixed Tier 1 lodge and no lodge purchase", () => {
    const state = started();
    expect(state.lodgeTier).toBe(1);
    expect(rules.buyBuilding(state, "lodge")).toBe(state);
  });
});

describe("tick", () => {
  it("does nothing while paused", () => {
    const s = started();
    expect(rules.tick(s, 1000)).toBe(s);
  });

  it("is deterministic for a given RNG state", () => {
    const running = rules.togglePause(started());
    expect(pure(rules.tick, running, 2000)).toEqual(rules.tick(running, 2000));
  });
});

const MORNING = 10 * 60;
/** A skier whose run ended long ago, so the next tick counts it. */
const guestAt = (over: Partial<Guest>): Guest =>
  makeGuest({ state: "ski", stateSinceMin: MORNING - 30, targetRuns: 9, ...over });

/** A running mid-morning day with exactly the given guests. */
function runningWith(guests: Guest[], seed = 7): GameState {
  return { ...rules.togglePause(started()), guests, rngState: seed, clockMin: MORNING };
}

const TICK_MS = 2 * MS_PER_GAME_MINUTE;

describe("night reload", () => {
  it("restores the night sheet so sleeping after a reload matches sleeping without one", () => {
    const night = rules.setPendingSnow(atNight(), "high");
    const saved = JSON.parse(JSON.stringify(toPersisted(night)));
    const reloaded = hydrate(saved, createBuiltHill(999));
    expect(reloaded.phase).toBe("night");
    expect(reloaded.nightRecap).toEqual(night.nightRecap);
    expect(reloaded.dayStats).toEqual(night.dayStats);
    const direct = rules.sleep(night);
    const viaReload = rules.sleep(reloaded);
    expect(viaReload.cash).toBe(direct.cash);
    expect(viaReload.cash).not.toBe(night.cash);
    expect(viaReload.dayIndex).toBe(night.dayIndex + 1);
  });
});

describe("completedRuns", () => {
  it("counts a finishing skier once, whether they lap or leave", () => {
    for (let seed = 1; seed <= 25; seed++) {
      for (const targetRuns of [1, 9]) {
        const out = rules.tick(runningWith([guestAt({ targetRuns })], seed), TICK_MS);
        // A guest who laps joins the lift line and may be dispatched within the same tick.
        expect(["queue", "ride", "depart"]).toContain(out.guests[0].state);
        expect(out.guests[0].runs).toBe(1);
        expect(out.dayStats.completedRuns).toBe(1);
      }
    }
  });

  it("does not count guests who were already departed or are not finishing", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const s = runningWith(
        [
          guestAt({ state: "depart", stateSinceMin: MORNING }),
          guestAt({ state: "queue" }),
          guestAt({ state: "ski", stateSinceMin: MORNING }),
          guestAt({ state: "ski" }),
        ],
        seed,
      );
      expect(rules.tick(s, TICK_MS).dayStats.completedRuns).toBe(1);
    }
  });

  it("equals the sum of per-guest runs after a full day, and resets on the next day", () => {
    const night = rules.skipToClose(rules.togglePause(started()));
    const sum = night.guests.reduce((n, g) => n + g.runs, 0);
    expect(night.dayStats.completedRuns).toBe(sum);
    expect(sum).toBeGreaterThan(0);
    const next = rules.sleep(rules.acknowledgeBeat(night));
    expect(next.dayStats.completedRuns).toBe(0);
  });

  it("accumulates across ticks without recounting departed guests", () => {
    let s = runningWith([guestAt({ targetRuns: 1 }), guestAt({ targetRuns: 1 })]);
    s = rules.tick(s, TICK_MS);
    expect(s.dayStats.completedRuns).toBe(2);
    const later = rules.tick(s, 1);
    expect(later.dayStats.completedRuns).toBe(2);
  });
});

describe("queue time", () => {
  it("the HUD and the night recap use the same measured wait", () => {
    // Twelve guests join at once; the surface lift dispatches them one by one.
    const queued = Array.from({ length: 12 }, (_, i) =>
      guestAt({ id: `q${i}`, state: "queue", progress: 0 }),
    );
    let s = { ...runningWith(queued), clockMin: 15 * 60 + 40 };
    s = rules.tick(s, 4000);
    expect(s.phase).toBe("day");
    expect(s.dayStats.dispatched).toBeGreaterThan(0);
    // skipToClose simulates the remaining minutes, so the recap reflects them too.
    const night = rules.skipToClose(s);
    expect(night.dayStats.avgQueueMin).toBeCloseTo(
      night.dayStats.waitSumMin / night.dayStats.dispatched,
      10,
    );
    // A tick that crosses close shows the same figure in the recap.
    const closing = rules.tick({ ...s, clockMin: 15 * 60 + 59 }, 4000);
    expect(closing.phase).toBe("night");
    expect(closing.nightRecap?.satisfaction).toBeCloseTo(
      rules.liveSatisfaction({ ...closing, phase: "day" }),
      10,
    );
  });

  it("before anyone is dispatched the live figure is the current expected wait", () => {
    const s = runningWith([]);
    expect(rules.measuredWaitMin(s)).toBe(0);
  });
});

describe("startNewSeason", () => {
  it("plans day-1 arrivals with planArrivals instead of a hardcoded 22", () => {
    const base: GameState = { ...started(), founderId: "riley", rngState: 99 };
    const rng = createRng(99);
    const expected = planArrivals({
      dayIndex: 1,
      fare: "balanced",
      snowQuality: 0.55,
      weather: "clear",
      buildings: [],
      talentsOwned: [],
      founderId: "riley",
      rand: () => rng.next(),
    });
    const s = pure(rules.startNewSeason, base);
    expect(s.dayStats.arrivals).toBe(expected);
    expect(s.guests).toHaveLength(expected);
  });
});

describe("liveSatisfaction", () => {
  it("matches the recap satisfaction at close, with cafe and founder bonuses", () => {
    const base = rules.togglePause(started());
    const withCafe: GameState = {
      ...base,
      buildings: [...base.buildings, "cafe"],
    };
    const cases = [base, withCafe, { ...withCafe, fare: "expensive" as const }];
    for (const s of cases) {
      const live = rules.liveSatisfaction(s);
      const recap = rules.openNight(s).nightRecap!.satisfaction;
      expect(Math.round(live)).toBe(Math.round(recap));
    }
    const noFounder = { ...withCafe, founderId: null };
    expect(rules.liveSatisfaction(withCafe)).not.toBe(
      rules.liveSatisfaction(noFounder),
    );
  });
});

describe("night previews", () => {
  it("expectedArrivals is pure, deterministic and moves with the fare", () => {
    const night = atNight();
    const a = pure(rules.expectedArrivals, night, "balanced");
    expect(rules.expectedArrivals(night, "balanced")).toBe(a);
    expect(rules.expectedArrivals(night, "cheap")).toBeGreaterThan(a);
    expect(rules.expectedArrivals(night, "expensive")).toBeLessThan(a);
  });

  it("previews do not move when the radio beat is acknowledged", () => {
    const night = pure(rules.skipToClose, rules.togglePause(started()));
    expect(night.pendingBeat).not.toBeNull();
    expect(night.beatAcknowledged).toBe(false);
    const fares = ["cheap", "balanced", "expensive"] as const;
    const before = fares.map((f) => rules.expectedArrivals(night, f));
    const snows = (["minimal", "mid", "high"] as const).map((v) => rules.previewOvernight(night, v));
    const read = rules.acknowledgeBeat(night);
    expect(read.reputation).toBe(night.reputation);
    expect(fares.map((f) => rules.expectedArrivals(read, f))).toEqual(before);
    expect((["minimal", "mid", "high"] as const).map((v) => rules.previewOvernight(read, v))).toEqual(snows);
  });

  it("expectedArrivals averages the demand of each weather scenario", () => {
    const night = atNight();
    const { outlook, results } = rules.previewOvernight(night, night.pendingSnow);
    const inputs = (weather: typeof WEATHER_KINDS[number]) => ({
      dayIndex: night.dayIndex + 1,
      fare: night.pendingFare,
      snowQuality: results[weather].overnight.snowQuality,
      weather,
      buildings: night.buildings,
      talentsOwned: results[weather].talentsOwned,
      founderId: night.founderId,
      reputation: night.reputation,
    });
    const weighted = WEATHER_KINDS.reduce((sum, kind) => sum + outlook![kind] * meanArrivals(inputs(kind)), 0);
    expect(rules.expectedArrivals(night, night.pendingFare)).toBeCloseTo(weighted, 12);

    const rng = createRng(night.rngState);
    const tomorrow = night.weatherDays[night.dayIndex].kind;
    const next = rules.sleep(night);
    expect(next.dayStats.arrivals).toBe(planArrivals({ ...inputs(tomorrow), rand: () => rng.next() }));
  });

  it("higher reputation raises expected arrivals", () => {
    const night = atNight();
    const famous = { ...night, reputation: 85 };
    expect(rules.expectedArrivals(famous, "expensive")).toBeGreaterThan(
      rules.expectedArrivals({ ...night, reputation: 20 }, "expensive"),
    );
  });

  it("previewOvernight is pure and deterministic, and High previews better than Minimal", () => {
    const night = atNight();
    const minimal = pure(rules.previewOvernight, night, "minimal");
    expect(rules.previewOvernight(night, "minimal")).toEqual(minimal);
    const mid = rules.previewOvernight(night, "mid");
    const high = rules.previewOvernight(night, "high");
    expect(high.meanQuality).toBeGreaterThan(mid.meanQuality);
    expect(mid.meanQuality).toBeGreaterThan(minimal.meanQuality);
    expect(high.cost).toBe(SNOW_NIGHT_COST.high);
    expect(minimal.cost).toBe(0);
    expect(typeof high.label).toBe("string");
  });

  it("previewOvernight weights the snow and predicts the actual outcome for each kind", () => {
    const night = { ...atNight(), pendingSnow: "high" as const };
    const preview = rules.previewOvernight(night, "high");
    const mean = WEATHER_KINDS.reduce((sum, kind) =>
      sum + preview.outlook![kind] * preview.results[kind].overnight.snowQuality, 0);
    expect(preview.meanQuality).toBeCloseTo(mean, 12);
    const next = rules.sleep(night);
    const actual = night.weatherDays[night.dayIndex].kind;
    expect(next.snowQuality).toBeCloseTo(preview.results[actual].overnight.snowQuality, 12);
    expect(next.weather).toBe(actual);
  });

  it("keeps every field and the day RNG unchanged after repeated previews", () => {
    const night = atNight();
    const before = structuredClone(night);
    const expected = rules.expectedArrivals(night, "cheap");
    const forecast = rules.previewOvernight(night, "mid");
    for (let i = 0; i < 100; i++) {
      expect(rules.expectedArrivals(night, "cheap")).toBe(expected);
      expect(rules.previewOvernight(night, "mid")).toEqual(forecast);
    }
    expect(night).toEqual(before);
  });
});

describe("lastDay", () => {
  it("is empty on day 1, recorded at Sleep, and cleared by a new season", () => {
    const night = atNight();
    expect(night.lastDay).toBeNull();
    const recap = night.nightRecap!;
    const next = rules.sleep({ ...night, fare: "expensive", snow: "high", pendingFare: "cheap" });
    expect(next.lastDay).toEqual({
      arrivals: recap.arrivals,
      satisfaction: recap.satisfaction,
      cashDelta: recap.cashDelta,
      avgWaitMin: recap.facts.avgWaitMin,
      observation: observeGuests(recap),
      snowNightCost: SNOW_NIGHT_COST[night.pendingSnow],
      fare: "expensive",
      snow: "high",
    });
    expect(next.fare).toBe("cheap");
    expect(rules.startNewSeason(next).lastDay).toBeNull();
  });

  it("survives a save and reload", () => {
    const next = rules.sleep(atNight());
    const saved = JSON.parse(JSON.stringify(toPersisted(next)));
    const loaded = migrate(saved, SAVE_VERSION);
    expect(loaded.reset).toBe(false);
    expect(hydrate(loaded.state, createBuiltHill()).lastDay).toEqual(next.lastDay);

    delete saved.lastDay.observation;
    expect(migrate(saved, SAVE_VERSION)).toMatchObject({ reset: false, state: { lastDay: saved.lastDay } });
  });

  it("uses actual skiers and records no guest observations from an empty day", () => {
    const day = started();
    expect(day.dayStats.arrivals).toBeGreaterThan(0);
    const night = rules.openNight(day);
    const recap = night.nightRecap!;
    expect(recap).toMatchObject({ arrivals: 0, revenue: 0, problem: NO_SKIERS_PROBLEM });
    expect(night.reputation).toBe(day.reputation);
    expect(observeGuests(recap)).toBeNull();
    expect(rules.sleep(night).lastDay?.observation).toBeUndefined();
  });
});

describe("building and save continuity", () => {
  const chair = { type: "chair" as const, top: REFERENCE_TOPS[1], bottom: TERRAIN.base };
  const overnight = (state: GameState) => {
    let night = rules.skipToClose(state);
    night = rules.decideSchoolContract(night, "declined");
    night = rules.replyToSummitLink(night, "declined");
    return rules.sleep(rules.acknowledgeBeat(night));
  };

  it("finishes a saved lodge upgrade after exactly two nights and gates chairs and guns", () => {
    const base = started();
    expect(rules.placeLift(base, chair)).toBe(base);
    expect(rules.placeGun(base, TERRAIN.base)).toBe(base);

    const upgrading = rules.beginLodgeUpgrade(base);
    expect(upgrading.cash).toBe(base.cash - 1400);
    const first = overnight(upgrading);
    expect(first.lodgeTier).toBe(1);
    expect(first.lodgeUpgrade?.nightsRemaining).toBe(1);
    const resumed = hydrate(toPersisted(first), createBuiltHill());
    const second = overnight(resumed);
    expect(second.lodgeTier).toBe(2);
    expect(second.lodgeUpgrade).toBeNull();
    expect(second.crewPoints).toBe(3);
    expect(second.morningHeadline).toContain("Lodge Tier 2");
    expect(rules.placeLift(second, chair).lifts).toHaveLength(2);
    const guns = rules.placeGun(second, TERRAIN.base);
    expect(guns.guns).toHaveLength(1);
    expect(guns.cash).toBe(second.cash - constructionDraw(ASSET_CATALOG.snow_guns.cost).deposit);
  });

  it("rolls back the exact cash and cells of a same-minute trail undo", () => {
    const before = started();
    const top = before.trails[0].path[0];
    const painted = rules.commitPaint(before, [{
      widthFt: 60,
      points: [top, { x: top.x - 1.6, z: top.z + 2.5 }, { x: top.x - 2, z: top.z + 6 },
        { x: -3, z: 11 }, TERRAIN.base],
    }]);
    expect(painted.cash).toBeLessThan(before.cash);
    expect(painted.clearedCells.length).toBeGreaterThan(before.clearedCells.length);
    const undone = rules.undoTrail(painted);
    expect(undone.cash).toBe(before.cash);
    expect(undone.clearedCells).toEqual(before.clearedCells);
    expect(undone.trails).toEqual(before.trails);
  });

  it("keeps a lift running until Sleep when closing during the day", () => {
    const built = rules.placeLift({ ...started(), lodgeTier: 2 }, chair);
    const midday = { ...addReferenceDescent(built, 1), clockMin: 600 };
    const closing = rules.closeLift(midday, 1);
    expect(closing.lifts[1]).toMatchObject({ confirmed: true, closing: true });
    expect(rules.closeLift(closing, 0)).toBe(closing);
    const nextDay = overnight(closing);
    expect(nextDay.lifts[1]).toMatchObject({ confirmed: false, closing: false });
    expect(nextDay.trails.every((trail) => trail.liftIndex !== 1 || !trail.open)).toBe(true);
  });
});
