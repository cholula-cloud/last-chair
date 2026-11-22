import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import {
  decideGroomerDown,
  openNight,
  pickFounder,
  setPendingSnow,
  skipToClose,
  sleep,
} from "./rules";
import { GROOMER_BORROW_COST } from "./groomerDown";
import { groomedFeet } from "./guns";
import type { GameState } from "./state";

describe("groomer down (DH8)", () => {
  const hill = () => pickFounder(createBuiltHill(), "elena");

  function nightSheet(base = hill()) {
    const closed = skipToClose(base);
    const night = openNight(closed);
    if (!night.nightRecap) throw new Error("expected night recap");
    return night;
  }

  it("zeros groom feet tonight when the player skips the borrow", () => {
    let night: GameState = {
      ...nightSheet(),
      pendingBeat: "groomer_down",
      beatAcknowledged: true,
      groomerDownTonight: false,
    };
    night = decideGroomerDown(night, "go_without");
    expect(night.pendingBeat).toBeNull();
    expect(night.groomerDownTonight).toBe(true);
    const morning = sleep(night);
    expect(morning.trails.every((t) => t.groomed?.every((g) => !g) ?? true)).toBe(true);
    expect(morning.groomerDownTonight).toBe(false);
  });

  it("grooms normally after paying to borrow the town cat", () => {
    let night: GameState = {
      ...nightSheet({ ...hill(), cash: GROOMER_BORROW_COST + 500 }),
      pendingBeat: "groomer_down",
      beatAcknowledged: true,
    };
    const cashBefore = night.cash;
    night = setPendingSnow(night, "high");
    night = decideGroomerDown(night, "borrow");
    expect(night.cash).toBe(cashBefore - GROOMER_BORROW_COST);
    expect(night.groomerDownTonight).toBe(false);
    const expectedFt = groomedFeet(night.trails, night.dayStats.runsByTrail, "high", night.talentsOwned);
    const morning = sleep(night);
    expect(morning.seasonGroomFeet).toBeGreaterThanOrEqual(expectedFt * 0.9);
  });

  it("refuses borrow when cash is too low", () => {
    const night = decideGroomerDown({
      ...hill(),
      phase: "night",
      pendingBeat: "groomer_down",
      cash: 0,
    }, "borrow");
    expect(night.groomerDownDecision).toBeNull();
  });
});