import { describe, expect, it } from "vitest";
import { runSeason, type Strategy } from "./balance";

// The same hill, founder and weather can be played for different commitments.
const schoolOperator: Strategy = {
  id: "school_operator",
  label: "School operator",
  build: ({ state }) => state.dayIndex === 1 ? ["upgrade_lodge"] :
    state.lodgeTier >= 2 && !state.assets.some((asset) => asset.id === "ski_school") ? ["ski_school"] : [],
  night: () => ({ fare: "balanced", snow: "mid" }),
};
const independent: Strategy = { ...schoolOperator, night: () => ({ fare: "expensive", snow: "mid" }) };

describe("matched Dutch Hill winters", () => {
  it.each([3, 17])("accepting a bus earns a visit; declining keeps the weekday public, seed %i", { timeout: 30_000 }, (seed) => {
    const host = runSeason(seed, schoolOperator, "elena", { school: "accepted" });
    const publicHill = runSeason(seed, schoolOperator, "elena", { school: "declined" });
    expect(host.schoolContract?.decision).toBe("accepted");
    expect(publicHill.schoolContract?.decision).toBe("declined");
    if (host.schoolContract?.decision !== "accepted") throw new Error("Bus was never booked");
    const { day, pupilsTaught } = host.schoolContract;
    expect(pupilsTaught).not.toBeNull();
    expect(host.days[day - 1].arrivals).toBe(publicHill.days[day - 1].arrivals + 6);
    expect(host.days.slice(0, day - 1)).toEqual(publicHill.days.slice(0, day - 1));
  });

  it("Vivian's terms change the available fares in the same winter", { timeout: 30_000 }, () => {
    const joined = runSeason(3, independent, "elena", { summitLink: "accepted" });
    const local = runSeason(3, independent, "elena", { summitLink: "declined" });
    expect(joined.summitLinkDecision).toBe("accepted");
    expect(local.summitLinkDecision).toBe("declined");
    expect(joined.days.at(-1)?.fare).toBe("balanced");
    expect(local.days.at(-1)?.fare).toBe("expensive");
  });
});
