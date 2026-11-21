import { describe, expect, it } from "vitest";
import { demandContext, guestsWantLine, type DemandContext } from "./guestsWant";
import { createInitialState } from "./state";

const calm: Parameters<typeof guestsWantLine>[0] = {
  breakdown: { arrivalMood: 0, queue: 0, snow: 0, value: 0, runs: 0 },
  facts: {
    avgWaitMin: 1,
    dispatched: 20,
    snowQuality: 0.7,
    snowLabel: "Good cover",
    farePrice: 45,
    hillValue: 50,
    runsPerGuest: 4,
    turnedAway: 0,
    arrivalMood: 0.7,
  },
};
const ctx: DemandContext = { liftCount: 1, greenTrailCount: 1, greenRuns: 3, seatsFullMin: 0 };

const withBreakdown = (patch: Partial<typeof calm.breakdown>) => ({ ...calm, breakdown: { ...calm.breakdown, ...patch } });

describe("guestsWantLine", () => {
  it("shows nothing when nothing is pressing", () => {
    expect(guestsWantLine(calm, ctx)).toBeNull();
    expect(guestsWantLine(withBreakdown({ queue: -1.5, snow: -1 }), ctx)).toBeNull();
  });

  it("shows no lift-line demand at 5 min or less even when the queue term hurts", () => {
    const recap = {
      ...withBreakdown({ queue: -12 }),
      facts: { ...calm.facts, avgWaitMin: 5, busiestLift: { label: "Surface lift 1", min: 4.8 } },
    };
    expect(guestsWantLine(recap, ctx)).toBeNull();
    const atTwo = { ...recap, facts: { ...recap.facts, avgWaitMin: 2, busiestLift: undefined } };
    expect(guestsWantLine(atTwo, ctx)).toBeNull();
  });

  it("asks for a second lift when one lift has long lines", () => {
    const recap = { ...withBreakdown({ queue: -9 }), facts: { ...calm.facts, avgWaitMin: 7, busiestLift: { label: "Surface lift 1", min: 10.4 } } };
    expect(guestsWantLine(recap, ctx)).toBe("Lift lines topped 10 minutes today. Skiers want a second lift.");
  });

  it("names the busiest lift when there are already two", () => {
    const recap = { ...withBreakdown({ queue: -6 }), facts: { ...calm.facts, busiestLift: { label: "Chair 2", min: 6.2 } } };
    expect(guestsWantLine(recap, { ...ctx, liftCount: 2 })).toBe("Chair 2 backed up past 6 minutes. Skiers want shorter lift lines.");
  });

  it("asks for another green trail when beginner terrain is crowded", () => {
    const line = guestsWantLine(withBreakdown({ runs: -3 }), { ...ctx, greenTrailCount: 1, greenRuns: 40 });
    expect(line).toBe("The green trail was packed with beginners. Skiers want another easy run.");
  });

  it("does not call a quiet green trail crowded", () => {
    expect(guestsWantLine(withBreakdown({ runs: -3 }), { ...ctx, greenRuns: 10 })).toBeNull();
  });

  it("asks for more lodge seats when the lodge was full for long", () => {
    expect(guestsWantLine(calm, { ...ctx, seatsFullMin: 90 })).toBe("The lodge ran out of seats at lunch. Skiers want more indoor space.");
  });

  it("asks for better snow when the snow term hurts", () => {
    const recap = { ...withBreakdown({ snow: -8 }), facts: { ...calm.facts, snowLabel: "Icy bottom" } };
    expect(guestsWantLine(recap, ctx)).toBe("Snow cover was icy bottom today. Skiers want better grooming or snowmaking.");
  });

  it("picks the largest pain when several apply", () => {
    const recap = { ...withBreakdown({ queue: -4, snow: -10 }), facts: { ...calm.facts, busiestLift: { label: "Surface lift 1", min: 5 } } };
    expect(guestsWantLine(recap, { ...ctx, seatsFullMin: 60 })).toMatch(/grooming or snowmaking/);
  });

  it("writes plain sentences with no dashes or middle dots", () => {
    const line = guestsWantLine(withBreakdown({ queue: -9 }), ctx) ?? "";
    expect(line).not.toMatch(/[—–·]/);
  });
});

describe("demandContext", () => {
  it("counts confirmed lifts, green trails and their runs", () => {
    const state = createInitialState(1);
    const ctxOut = demandContext({
      lifts: [{ ...(state.lifts[0] ?? { type: "surface", anchor: { x: 0, z: 0 }, queue: [], dispatchCredit: 0 }), confirmed: true }],
      trails: [{ difficulty: "green" }, { difficulty: "blue" }] as never,
      dayStats: { ...state.dayStats, runsByTrail: [12, 5], seatsFullMin: 30 },
    });
    expect(ctxOut).toEqual({ liftCount: 1, greenTrailCount: 1, greenRuns: 12, seatsFullMin: 30 });
  });
});
