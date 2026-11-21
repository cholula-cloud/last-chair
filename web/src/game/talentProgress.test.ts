import { describe, expect, it } from "vitest";
import {
  canUnlockTalent,
  CREW_COLUMN_MIN_TIER,
  pickTalent,
  spendAllCrewPoints,
  talentBlockReason,
  talentCrew,
} from "./talentProgress";
import { createInitialState } from "./state";

describe("talentProgress", () => {
  it("spends a crew point to unlock the next talent in order", () => {
    const state = { ...createInitialState(), crewPoints: 1, lodgeTier: 1 as const };
    const next = pickTalent(state, "rope_tow");
    expect(next.crewPoints).toBe(0);
    expect(next.talentsOwned).toContain("rope_tow");
    expect(canUnlockTalent(next, "rope_tow")).toBe(false);
    expect(next.talentToast).toBe(
      "Surface Lift Tune (Frank) unlocked. Saves $40 a day on every working surface lift.",
    );
  });

  it("spends saved points in column order, skipping gated skills", () => {
    const state = { ...createInitialState(), crewPoints: 2, lodgeTier: 1 as const, talentsOwned: ["rope_tow"] as string[] };
    const { state: spent, picked } = spendAllCrewPoints(state);
    expect(picked).toEqual(["groom_pass", "ticket_booth"]);
    expect(spent.crewPoints).toBe(0);
  });

  it("requires the previous skill in the same crew column", () => {
    const state = { ...createInitialState(), crewPoints: 1, lodgeTier: 2 as const, talentsOwned: [] as string[] };
    expect(canUnlockTalent(state, "trail_guns")).toBe(false);
    expect(talentBlockReason(state, "trail_guns")).toBe("prerequisite");
    expect(canUnlockTalent({ ...state, talentsOwned: ["rope_tow"] }, "corduroy")).toBe(false);
    expect(canUnlockTalent({ ...state, talentsOwned: ["rope_tow", "groom_pass"] }, "corduroy")).toBe(true);
    expect(
      canUnlockTalent({ ...state, talentsOwned: ["rope_tow", "groom_pass", "corduroy"] }, "trail_guns"),
    ).toBe(true);
  });

  it("blocks tier-2 skills at tier 1 lodge", () => {
    const state = { ...createInitialState(), crewPoints: 2, lodgeTier: 1 as const, talentsOwned: ["rope_tow", "groom_pass"] };
    expect(canUnlockTalent(state, "corduroy")).toBe(false);
    expect(canUnlockTalent({ ...state, lodgeTier: 2 }, "corduroy")).toBe(true);
  });

  it("keeps the patrol column locked until lodge tier 2", () => {
    const state = { ...createInitialState(), crewPoints: 1, lodgeTier: 1 as const };
    expect(CREW_COLUMN_MIN_TIER[talentCrew("patrol_radio")]).toBe(2);
    expect(canUnlockTalent(state, "patrol_radio")).toBe(false);
    expect(talentBlockReason(state, "patrol_radio")).toBe("column");
    expect(canUnlockTalent({ ...state, lodgeTier: 2 }, "patrol_radio")).toBe(true);
  });

  it("does not require another crew column for patrol", () => {
    const state = {
      ...createInitialState(),
      crewPoints: 1,
      lodgeTier: 2 as const,
      talentsOwned: ["rope_tow"],
    };
    expect(canUnlockTalent(state, "patrol_radio")).toBe(true);
  });
});