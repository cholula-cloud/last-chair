import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { migrate } from "./migrations";
import { SAVE_VERSION, toPersisted } from "./state";
import { acknowledgeBeat, finishWinterReview, pickFounder, skipToClose, sleep, startNewSeason } from "./rules";
import { schoolMemory, winterRecord } from "./winterMemory";

describe("Dutch Hill winter review", () => {
  it("remembers the commitment separately from the lessons actually taught", () => {
    expect(schoolMemory(null)).toContain("on record");
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
  it("writes final-day measures and each career settlement exactly once, including after reload", () => {
    const hill = { ...pickFounder(createBuiltHill(7), "elena"), seasonLength: 1 };
    const night = acknowledgeBeat(skipToClose(hill));
    const first = sleep(night);
    expect(first.phase).toBe("winter_review");
    expect(first.career).toHaveLength(1);
    expect(first.lastWinter).toMatchObject({ completedDays: 1, goalMet: true,
      days: [{ day: 1, satisfaction: night.nightRecap!.satisfaction }],
      score: { measuredDays: 1, total: Math.round((night.nightRecap!.satisfaction + night.reputation) / 2) },
    });
    expect(sleep(first)).toBe(first);
    const replay = startNewSeason(finishWinterReview(first));
    expect(replay.seasonDays).toEqual([]);
    expect(replay.beatLog).toEqual([]);
    expect(replay.career).toEqual(first.career);
    const secondNight = acknowledgeBeat(skipToClose({ ...hill, career: replay.career, cash: -100000, debtMornings: 2 }));
    const second = sleep(secondNight);
    expect(second.career).toHaveLength(2);
    expect(second.lastWinter).toMatchObject({ bankrupt: true, goalMet: false });
    const saved = migrate(toPersisted(startNewSeason(second)), SAVE_VERSION);
    expect(saved).toMatchObject({ reset: false, state: { career: second.career } });
  });

  it("keeps pre-log broadcasts undated and never manufactures missing scores or contract decisions", () => {
    const raw = toPersisted(createBuiltHill(5));
    const old = { ...raw, completedBeats: ["school_bus", "summit_link"] };
    const migrated = migrate(old, 6);
    expect(migrated).toMatchObject({ reset: false, state: {
      beatLog: [{ id: "school_bus", day: null }, { id: "summit_link", day: null }],
      schoolContract: null, summitLinkDecision: null, seasonDays: [],
    } });
    const record = winterRecord({ ...createBuiltHill(5), ...migrated.state });
    expect(record.score).toBeNull();
  });

});
