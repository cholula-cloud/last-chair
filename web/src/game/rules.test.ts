import { describe, expect, it } from "vitest";
import * as rules from "./rules";
import { makeGuest, planArrivals } from "./sim";
import { createRng } from "./rng";
import {
  createInitialState,
  hydrate,
  migrate,
  toPersisted,
  type GameState,
} from "./state";
import { BUILDING_COSTS, SNOW_NIGHT_COST, type BuildingId, type Guest } from "./types";

const started = () => rules.pickFounder(createInitialState(7), "elena");

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
    const s = pure(rules.pickFounder, createInitialState(7), "tom");
    expect(s.phase).toBe("day");
    expect(s.founderId).toBe("tom");
    expect(s.guests.length).toBe(s.dayStats.arrivals);
    expect(s.guests.length).toBeGreaterThan(0);
  });

  it("advances the RNG state", () => {
    expect(started().rngState).not.toBe(createInitialState(7).rngState);
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
    const setup = createInitialState(7);
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
  it("buys a building and deducts its cost", () => {
    const s = pure(rules.buyBuilding, started(), "cafe");
    expect(s.buildings).toContain("cafe");
    expect(s.cash).toBe(started().cash - BUILDING_COSTS.cafe);
  });

  it("rejects a building that is already owned", () => {
    const owned = rules.buyBuilding(started(), "cafe");
    expect(rules.buyBuilding(owned, "cafe")).toBe(owned);
    const base = started();
    expect(rules.buyBuilding(base, "warming_hut")).toBe(base);
  });

  it("rejects a purchase the cash cannot cover", () => {
    const poor: GameState = { ...started(), cash: BUILDING_COSTS.cafe - 1 };
    expect(rules.buyBuilding(poor, "cafe")).toBe(poor);
  });

  it("starts with a fixed lodge that does not charge a build cost", () => {
    const state = started();
    expect(state.lodgeTier).toBe(1);
    expect(state.buildings).not.toContain("lodge");
    expect(rules.buyBuilding(state, "lodge" as BuildingId)).toBe(state);
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

const TICK_MS = 1000;

describe("night reload", () => {
  it("restores the night sheet so sleeping after a reload matches sleeping without one", () => {
    const night = rules.setPendingSnow(atNight(), "high");
    const saved = JSON.parse(JSON.stringify(toPersisted(night)));
    const reloaded = hydrate(saved, createInitialState(999));
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
      buildings: ["warming_hut"],
      talentsOwned: [],
      founderId: "riley",
      rand: () => rng.next(),
    });
    const s = pure(rules.startNewSeason, base);
    expect(s.dayStats.arrivals).toBe(expected);
    expect(s.guests).toHaveLength(expected);
  });
});

describe("save migration", () => {
  it("loads an unversioned v0 night save as a playable day", () => {
    const v0 = JSON.parse(JSON.stringify(toPersisted(atNight())));
    delete v0.rngState;
    delete v0.nightRecap;
    delete v0.dayStats;
    expect(v0.phase).toBe("night");
    const migrated = migrate(v0, 0);
    // A v0 night save has no recap to restore, so it resumes as a day.
    expect(migrated.phase).toBe("day");
    expect(migrated.nightRecap).toBeNull();
    expect(typeof migrated.rngState).toBe("number");
    expect(migrated.dayStats).toEqual(createInitialState().dayStats);
    const loaded = hydrate(migrated, createInitialState(5));
    expect(loaded.phase).toBe("day");
    expect(rules.tick(rules.togglePause(loaded), 500)).toBeDefined();
  });

  it("keeps a v1 night save in the night with its recap", () => {
    const night = atNight();
    const migrated = migrate(JSON.parse(JSON.stringify(toPersisted(night))), 1);
    expect(migrated.phase).toBe("night");
    expect(migrated.nightRecap).toEqual(night.nightRecap);
  });

  it("folds a purchased v10 lodge into the fixed Tier 1 headquarters without changing the rest of the save", () => {
    const state = atNight();
    const { lodgeTier, ...persisted } = toPersisted(state);
    const saved = { ...persisted, buildings: ["warming_hut", "lodge", "cafe"], cash: 4590 };
    const migrated = migrate(saved, 10);
    expect(lodgeTier).toBe(1);
    expect(migrated).toEqual({ ...saved, buildings: ["warming_hut", "cafe"], lodgeTier });
    expect(toPersisted(hydrate(migrated, createInitialState(2)))).toEqual(migrated);
  });

  it("gives a v11 trail a Standard width per saved point without changing its path or snow", () => {
    const persisted = toPersisted(atNight());
    const legacy = {
      ...persisted,
      trails: persisted.trails.map(({ widths, ...trail }) => {
        expect(widths).toHaveLength(trail.path.length);
        return trail;
      }),
    };
    const migrated = migrate(legacy, 11);
    expect(migrated).toEqual(persisted);
    expect(migrated.trails.every((trail) => trail.widths.length === trail.path.length &&
      trail.widths.every((width) => width === 60))).toBe(true);
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

  it("expectedArrivals tracks what Sleep will actually plan", () => {
    const night = atNight();
    const expected = rules.expectedArrivals(night, night.pendingFare);
    const next = rules.sleep(night);
    // Sleep draws day-to-day noise of 0 to 4 (mean 2) on top of the preview.
    expect(Math.abs(next.dayStats.arrivals - expected)).toBeLessThanOrEqual(3);
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

  it("previewOvernight matches the snow Sleep produces", () => {
    const night = { ...atNight(), pendingSnow: "high" as const };
    const preview = rules.previewOvernight(night, "high");
    const next = rules.sleep(night);
    expect(next.snowQuality).toBeCloseTo(preview.meanQuality, 10);
    expect(next.weather).toBe(preview.weather);
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
      fare: "expensive",
      snow: "high",
    });
    expect(next.fare).toBe("cheap");
    expect(rules.startNewSeason(next).lastDay).toBeNull();
  });

  it("survives a save and reload, and a v5 save loads without it", () => {
    const night = atNight();
    const next = rules.sleep(night);
    const saved = JSON.parse(JSON.stringify(toPersisted(next)));
    expect(migrate(saved, 6).lastDay).toEqual(next.lastDay);
    delete saved.lastDay;
    expect(migrate(saved, 5).lastDay).toBeNull();
  });

  it("a v5 night save gains recap facts so the Why? list can render", () => {
    const night = atNight();
    const saved = JSON.parse(JSON.stringify(toPersisted(night)));
    delete saved.nightRecap.facts;
    delete saved.lastDay;
    const migrated = migrate(saved, 5);
    expect(migrated.phase).toBe("night");
    expect(migrated.nightRecap!.facts.farePrice).toBeGreaterThan(0);
    expect(migrated.lastDay).toBeNull();
  });
});
