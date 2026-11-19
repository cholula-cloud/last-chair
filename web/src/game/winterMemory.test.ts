import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { migrate } from "./migrations";
import { SAVE_VERSION, toPersisted } from "./state";
import { finishWinterReview, startNewSeason } from "./rules";
import { schoolMemory, winterRecord } from "./winterMemory";

describe("Dutch Hill winter review", () => {
  it("remembers the commitment separately from the lessons actually taught", () => {
    expect(schoolMemory(null)).toContain("never settled");
    expect(schoolMemory({ decision: "declined" })).toContain("offered");
    const booking = { decision: "accepted", day: 9 } as const;
    expect(schoolMemory({ ...booking, pupilsTaught: null })).toContain("before its visit");
    expect(schoolMemory({ ...booking, pupilsTaught: 0 })).toContain("without a lesson");
    expect(schoolMemory({ ...booking, pupilsTaught: 3 })).toContain("3 finished");
    expect(schoolMemory({ ...booking, pupilsTaught: 6 })).toContain("all 6");
  });

  it("unlocks Tenney at break-even after outstanding obligations, regardless of school history", () => {
    const review = { ...createBuiltHill(3), phase: "winter_review", outcome: "finished",
      cash: 100, payables: [{ amount: 100, dueDay: 29, what: "cafe" }] } as const;
    const winter = { ...review, payables: [...review.payables] };
    const next = finishWinterReview(winter);
    expect(next.phase).toBe("mountain2");
    const replay = startNewSeason(next);
    expect(replay.lastWinter).toEqual(winterRecord(winter));
    expect(migrate(JSON.parse(JSON.stringify(toPersisted(replay))), SAVE_VERSION))
      .toMatchObject({ reset: false, state: { lastWinter: { cash: 100, construction: 100, netWorth: 0 } } });
    expect(finishWinterReview({ ...winter, cash: 99 }).phase).toBe("winter_review");
    expect(finishWinterReview({ ...winter, outcome: "bankrupt" }).phase).toBe("winter_review");
  });
});
