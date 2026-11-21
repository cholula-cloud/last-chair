import { describe, expect, it } from "vitest";
import { ASSET_CATALOG } from "./base";
import { daysLeftLine, goalChips, goalInputs, type GoalChip } from "./goals";
import { createInitialState, type GameState } from "./state";

const fresh = createInitialState(7);
const ready: GameState = { ...fresh, lodgeTier: 2, assets: [{ id: "ski_school", at: { x: 1, z: 1 }, styleId: ASSET_CATALOG.ski_school.styleId }], schoolProgramProven: true };
const chip = (state: Partial<GameState>, id: GoalChip["id"]) => goalChips(goalInputs({ ...fresh, ...state })).find(goal => goal.id === id);

describe("goalChips", () => {
  it("shows the optional visit once the school can actually receive an offer", () => {
    for (const state of [fresh, { ...ready, lodgeTier: 1 as const }, { ...ready, assets: [] },
      { ...ready, schoolProgramProven: false }, { ...ready, dayIndex: ready.seasonLength }]) {
      expect(chip(state, "bus")).toBeUndefined();
    }
    expect(chip(ready, "bus")).toMatchObject({ status: "To do", explainer: "Watch Route 100 Radio for Al Waters to call about the Readsboro school bus." });
  });

  it("shows booked, declined, delivered and missed visits after offer eligibility ends", () => {
    const school = { decision: "accepted", day: 9, pupilsTaught: null } as const;
    expect(chip({ schoolContract: school }, "bus")).toMatchObject({ status: "Booked", explainer: "The Readsboro bus arrives on day 9." });
    expect(chip({ schoolContract: school, outcome: "bankrupt" }, "bus")?.status).toBe("Missed");
    expect(chip({ schoolContract: { ...school, pupilsTaught: 6 } }, "bus")?.status).toBe("Done");
    expect(chip({ schoolContract: { ...school, pupilsTaught: 0 } }, "bus")?.status).toBe("Missed");
    expect(chip({ schoolContract: { decision: "declined" } }, "bus")?.status).toBe("Declined");
  });

  it("marks the lodge done at Tier 2 or higher", () => {
    expect(chip({}, "lodge")?.status).toBe("To do");
    expect(chip({ lodgeTier: 2 }, "lodge")?.status).toBe("Done");
    expect(chip({ lodgeTier: 3 }, "lodge")?.explainer).toContain("Tier 3");
  });

  it("distinguishes the live balance from the settled solvency goal", () => {
    const cash = 12000;
    const loan = { principal: 5000, balance: 13000, ratePerDay: 0.01, takenDay: 2 };
    const payables = [{ what: "lift" as const, liftIndex: 0, amount: 13000, dueDay: 3 }];
    expect(chip({ cash }, "solvent")?.status).toBe("On track");
    for (const state of [{ cash: -1 }, { cash, loan }, { cash, payables }]) {
      expect(chip(state, "solvent")?.status).toBe("At risk");
      expect(chip({ ...state, outcome: "finished" }, "solvent")?.status).toBe("Missed");
    }
    expect(chip({ cash: 0, outcome: "finished" }, "solvent")?.status).toBe("Done");
    expect(chip({ cash, outcome: "bankrupt" }, "solvent")?.status).toBe("Missed");
  });
});

it("counts the current day until the winter settles", () => {
  expect(daysLeftLine(1, 28)).toBe("28 days left.");
  expect(daysLeftLine(28, 28)).toBe("1 day left.");
  expect(daysLeftLine(3, 28, true)).toBe("0 days left.");
});
