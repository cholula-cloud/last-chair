import { describe, expect, it } from "vitest";
import * as rules from "./rules";
import { planArrivals } from "./sim";
import { createRng } from "./rng";
import {
  createInitialState,
  hydrate,
  migrate,
  toPersisted,
  type GameState,
} from "./state";
import { BUILDING_COSTS, SNOW_NIGHT_COST, type Guest } from "./types";

const started = () => rules.pickFounder(createInitialState(7), "elena");

/** Runs the rule on a copy and checks the input state was left untouched. */
function pure<A extends unknown[]>(
  rule: (s: GameState, ...a: A) => GameState,
  state: GameState,
  ...args: A
): GameState {
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

  it("requires the warming hut before the lodge", () => {
    const noHut: GameState = { ...started(), buildings: [] };
    expect(rules.buyBuilding(noHut, "lodge")).toBe(noHut);
    expect(rules.buyBuilding(started(), "lodge").buildings).toContain("lodge");
  });
});

describe("confirmLift", () => {
  it("builds a chair on a valid slot", () => {
    const base = rules.setSelectedLiftType(
      rules.setSelectedSlotIndex(started(), 1),
      "chair",
    );
    const s = pure(rules.confirmLift, base);
    expect(s.lifts).toHaveLength(2);
    expect(s.cash).toBeLessThan(base.cash);
    expect(s.buildMode).toBe(false);
  });

  it("rejects an invalid descent", () => {
    // Slot 2 ("Creek") has too little vertical drop.
    const base = rules.setSelectedLiftType(
      rules.setSelectedSlotIndex(started(), 2),
      "chair",
    );
    expect(rules.confirmLift(base)).toBe(base);
  });

  it("rejects a lift the cash cannot cover", () => {
    const poor: GameState = {
      ...rules.setSelectedLiftType(rules.setSelectedSlotIndex(started(), 1), "chair"),
      cash: 100,
    };
    expect(rules.confirmLift(poor)).toBe(poor);
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

const guestAt = (over: Partial<Guest>): Guest => ({
  id: "g",
  label: "Guest",
  state: "ski",
  progress: 0,
  mood: 0.8,
  ...over,
});

/** A running day with exactly the given guests. */
function runningWith(guests: Guest[], seed = 7): GameState {
  return { ...rules.togglePause(started()), guests, rngState: seed };
}

// One tick of 1000 ms = 2 game minutes = dt 0.25; a skier at 0.99 finishes (rate 0.5).
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
      const out = rules.tick(runningWith([guestAt({ progress: 0.99 })], seed), TICK_MS);
      // A guest who laps joins the lift line and may be dispatched within the same tick.
      expect(["queue", "ride", "depart"]).toContain(out.guests[0].state);
      expect(out.dayStats.completedRuns).toBe(1);
    }
  });

  it("does not count guests who were already departed or are not finishing", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const s = runningWith(
        [
          guestAt({ state: "depart", progress: 0.5 }),
          guestAt({ state: "queue", progress: 0.99 }),
          guestAt({ state: "ski", progress: 0 }),
          guestAt({ state: "ski", progress: 0.99 }),
        ],
        seed,
      );
      expect(rules.tick(s, TICK_MS).dayStats.completedRuns).toBe(1);
    }
  });

  it("accumulates across ticks and resets on the next day", () => {
    let s = runningWith([guestAt({ progress: 0.99 }), guestAt({ progress: 0.99 })]);
    s = rules.tick(s, TICK_MS);
    expect(s.dayStats.completedRuns).toBe(2);
    // Guests who departed on that tick add nothing on later ticks.
    const departed = s.guests.filter((g) => g.state === "depart").length;
    const later = rules.tick(s, 1);
    expect(later.dayStats.completedRuns).toBe(2);
    expect(later.guests.filter((g) => g.state === "depart").length).toBe(departed);
    const next = rules.sleep(rules.skipToClose({ ...later, paused: false }));
    expect(next.dayStats.completedRuns).toBe(0);
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
});

describe("liveSatisfaction", () => {
  it("matches the recap satisfaction at close, with cafe and founder bonuses", () => {
    const base = rules.togglePause(started());
    const withCafe: GameState = {
      ...base,
      buildings: [...base.buildings, "cafe", "lodge"],
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
