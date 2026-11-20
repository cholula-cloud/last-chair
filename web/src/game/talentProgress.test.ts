import { describe, expect, it } from "vitest";
import { pickTalent, canUnlockTalent } from "./talentProgress";
import { createInitialState } from "./state";

describe("talentProgress", () => {
  it("spends a crew point to unlock the next talent in order", () => {
    const state = { ...createInitialState(), crewPoints: 1, lodgeTier: 1 as const };
    const next = pickTalent(state, "rope_tow");
    expect(next.crewPoints).toBe(0);
    expect(next.talentsOwned).toContain("rope_tow");
    expect(canUnlockTalent(next, "rope_tow")).toBe(false);
  });

  it("blocks tier-2 talents at tier 1", () => {
    const state = { ...createInitialState(), crewPoints: 2, lodgeTier: 1 as const, talentsOwned: ["rope_tow"] };
    expect(canUnlockTalent(state, "trail_guns")).toBe(false);
    expect(canUnlockTalent({ ...state, lodgeTier: 2 }, "trail_guns")).toBe(true);
  });
});