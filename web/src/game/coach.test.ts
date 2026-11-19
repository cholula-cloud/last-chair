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


import { COACH_TIPS, COACH_TIP_IDS, nextTip, withTipSeen, type CoachContext } from "./coach";

const base: CoachContext = {
  phase: "day",
  dayIndex: 1,
  opening: "lift",
  running: false,
  placementActive: false,
  buildOpen: false,
  hasGuestsWant: false,
  enabled: true,
};

describe("coach tips", () => {
  it("has ten tips with unique ids and plain one-sentence text", () => {
    expect(COACH_TIPS).toHaveLength(10);
    expect(new Set(COACH_TIP_IDS).size).toBe(10);
    for (const tip of COACH_TIPS) {
      expect(tip.text).toMatch(/[.]$/);
      expect(tip.text).not.toMatch(/[—–·]/);
      expect(tip.text.length).toBeLessThanOrEqual(80);
    }
  });

  it("offers the lift tip first, then the pan tip, one at a time", () => {
    expect(nextTip([], base)?.id).toBe("lift");
    expect(nextTip(["lift"], base)?.id).toBe("pan");
    expect(nextTip(["lift", "pan"], base)).toBeNull();
  });

  it("walks the placement and trail tips", () => {
    expect(nextTip(["lift", "pan"], { ...base, placementActive: true })?.id).toBe("review");
    expect(nextTip(["lift", "pan", "review"], { ...base, opening: "trail" })?.id).toBe("trail");
  });

  it("offers the speed tip once the day runs", () => {
    expect(nextTip(["lift", "pan", "review", "trail"], { ...base, opening: null, running: true })?.id).toBe("speed");
  });

  it("offers recap tips at night, the Guests want tip only when a line shows", () => {
    const night = { ...base, phase: "night" as const, opening: null };
    expect(nextTip([], night)?.id).toBe("recap");
    expect(nextTip(["recap"], night)).toBeNull();
    expect(nextTip(["recap"], { ...night, hasGuestsWant: true })?.id).toBe("guestsWant");
  });

  it("offers the goal and snow gun tips on later days", () => {
    const later = { ...base, opening: null, running: true, dayIndex: 2 };
    const seen = ["lift", "pan", "review", "trail", "speed", "lease", "recap", "guestsWant"];
    expect(nextTip(seen, later)?.id).toBe("goal");
    expect(nextTip([...seen, "goal"], later)).toBeNull();
    expect(nextTip([...seen, "goal"], { ...later, dayIndex: 3 })?.id).toBe("guns");
  });

  it("offers the lease tip while the build sheet is open", () => {
    expect(nextTip(["lift", "pan", "review", "trail"], { ...base, opening: null, buildOpen: true })?.id).toBe("lease");
  });

  it("shows nothing when tips are off or every tip was seen", () => {
    expect(nextTip([], { ...base, enabled: false })).toBeNull();
    expect(nextTip(COACH_TIP_IDS, base)).toBeNull();
  });

  it("records a seen tip once and ignores unknown ids", () => {
    expect(withTipSeen([], "lift")).toEqual(["lift"]);
    expect(withTipSeen(["lift"], "lift")).toEqual(["lift"]);
    expect(withTipSeen(["lift"], "nope")).toEqual(["lift"]);
  });
});
