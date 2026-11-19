import { describe, expect, it } from "vitest";
import { activeTip, COACH_INTROS, freshCoach, observeCoach, TIPS } from "./coach";
import { FOUNDERS } from "./content";
import { createInitialState, type GameState } from "./state";

describe("first-winter tips", () => {
  it("follows the first day, choices and Sleep without changing the game", () => {
    const day: GameState = { ...createInitialState(), phase: "day", founderId: "elena" };
    let progress = freshCoach;
    const check = (step: number | null) => {
      const snapshot = structuredClone(day);
      progress = observeCoach(progress, day);
      expect(activeTip(progress, day)).toBe(step);
      expect(day).toEqual(snapshot);
    };
    check(0);
    day.paused = false;
    check(null);
    day.dayStats.dispatched = 1;
    check(1);
    day.clockMin += 20;
    check(null);
    day.dayStats.completedRuns = 5;
    check(2);
    day.clockMin += 20;
    check(3);
    day.followId = "guest";
    check(4);
    day.buildMode = true;
    check(null);
    day.clockMin = 840;
    check(5);
    day.phase = "night";
    check(6);
    for (const next of [7, 8, 9, 10]) {
      progress = { index: progress.index + 1, entered: null };
      check(next === 10 ? null : next);
    }
  });

  it("handles early close, setup, a skipped coach and later mornings", () => {
    const setup = createInitialState();
    const night: GameState = { ...setup, phase: "night", founderId: "elena" };
    for (let index = 0; index < TIPS.length; index++) {
      expect(activeTip({ index, entered: null }, setup)).toBeNull();
    }
    expect(observeCoach(freshCoach, night).index).toBe(6);
    const skipped = { index: TIPS.length, entered: null };
    for (const phase of ["day", "night"] as const) {
      const state = { ...night, phase };
      expect(activeTip(observeCoach(skipped, state), state)).toBeNull();
    }
    expect(activeTip(freshCoach, { ...night, dayIndex: 2 })).toBeNull();
  });

  it("gives each founder a short introduction", () => {
    expect(Object.keys(COACH_INTROS).sort()).toEqual(FOUNDERS.map(f => f.id).sort());
    for (const line of [...Object.values(COACH_INTROS), ...TIPS.map(tip => tip[1])]) {
      expect(line.length).toBeLessThanOrEqual(90);
    }
  });
});
