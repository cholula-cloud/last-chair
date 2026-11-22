import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { runSeason, type Strategy } from "./balance";
import { pickFounder, replyToSummitLink, skipToClose } from "./rules";

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

  it("Vivian's terms change pending fare when you accept or decline", () => {
    const offer = {
      ...skipToClose(pickFounder(createBuiltHill(3), "elena")),
      pendingBeat: "summit_link" as const,
      beatAcknowledged: false,
      summitLinkDecision: null,
      pendingFare: "expensive" as const,
    };
    const joined = replyToSummitLink(offer, "accepted");
    const local = replyToSummitLink(offer, "declined");
    expect(joined.summitLinkDecision).toBe("accepted");
    expect(local.summitLinkDecision).toBe("declined");
    expect(joined.pendingFare).toBe("balanced");
    expect(local.pendingFare).toBe("expensive");
  });
});
