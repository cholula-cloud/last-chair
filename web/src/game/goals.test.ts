import { describe, expect, it } from "vitest";
import { daysLeftLine, goalChips } from "./goals";

const fresh = {
  lodgeTier: 1 as const,
  schoolContract: null,
  outcome: "playing" as const,
  cash: 12000,
  loan: null,
  payables: [],
};

describe("goalChips", () => {
  it("starts with only solvency done", () => {
    expect(goalChips(fresh).map((c) => [c.id, c.done])).toEqual([["lodge", false], ["bus", false], ["solvent", true]]);
  });

  it("marks the lodge done at Tier 2 and above", () => {
    expect(goalChips({ ...fresh, lodgeTier: 2 })[0].done).toBe(true);
    expect(goalChips({ ...fresh, lodgeTier: 3 })[0].done).toBe(true);
  });

  it("explains the school bus with the radio line until a visit is accepted", () => {
    expect(goalChips(fresh)[1].explainer).toBe("Reach the school bus beat on the radio.");
  });

  it("tracks the accepted, declined and delivered school visit", () => {
    const accepted = goalChips({ ...fresh, schoolContract: { decision: "accepted", day: 9, pupilsTaught: null } })[1];
    expect(accepted.done).toBe(false);
    expect(accepted.explainer).toBe("The school bus comes on day 9.");
    const delivered = goalChips({ ...fresh, schoolContract: { decision: "accepted", day: 9, pupilsTaught: 6 } })[1];
    expect(delivered.done).toBe(true);
    const missed = goalChips({ ...fresh, schoolContract: { decision: "accepted", day: 9, pupilsTaught: 0 } })[1];
    expect(missed.done).toBe(false);
    const declined = goalChips({ ...fresh, schoolContract: { decision: "declined" } })[1];
    expect(declined.done).toBe(false);
    expect(declined.explainer).toBe("You declined the Readsboro school visit.");
  });

  it("is solvent by liquid net worth, after loans and unpaid construction", () => {
    expect(goalChips({ ...fresh, cash: -50 })[2].done).toBe(false);
    const loan = { principal: 5000, balance: 13000, ratePerDay: 0.01, takenDay: 2 };
    expect(goalChips({ ...fresh, loan })[2].done).toBe(false);
    const payables = [{ what: "lift" as const, liftIndex: 0, amount: 13000, dueDay: 3 }];
    expect(goalChips({ ...fresh, payables })[2].done).toBe(false);
    expect(goalChips({ ...fresh, outcome: "bankrupt" })[2].done).toBe(false);
  });

  it("writes explainers as single plain sentences", () => {
    for (const chip of goalChips({ ...fresh, cash: -1 })) {
      expect(chip.explainer).not.toMatch(/[—–·]/);
      expect(chip.label).not.toMatch(/[—–·]/);
    }
  });
});

describe("daysLeftLine", () => {
  it("counts the current day", () => {
    expect(daysLeftLine(1, 28)).toBe("28 days left.");
    expect(daysLeftLine(28, 28)).toBe("1 day left.");
  });
});
