import { describe, expect, it } from "vitest";
import * as rules from "./rules";
import { createInitialState, type GameState } from "./state";
import { BUILDING_COSTS, SNOW_NIGHT_COST } from "./types";

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

function atNight(): GameState {
  return pure(rules.skipToClose, rules.togglePause(started()));
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
