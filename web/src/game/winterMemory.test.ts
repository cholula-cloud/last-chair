import historicalSaves from "./__fixtures__/m3-saves.json";
import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { migrate } from "./migrations";
import { SAVE_VERSION, toPersisted } from "./state";
import { acknowledgeBeat, finishWinterReview, pickFounder, skipToClose, sleep, startNewSeason } from "./rules";
import { schoolMemory, winterScore, winterRecord } from "./winterMemory";

describe("Dutch Hill winter review", () => {
  it("remembers the commitment separately from the lessons actually taught", () => {
    expect(schoolMemory(null)).toContain("No Readsboro school visit this winter");
    expect(schoolMemory({ decision: "declined" })).toContain("Al offered a school day and you passed");
    const booking = { decision: "accepted", day: 9 } as const;
    expect(schoolMemory({ ...booking, pupilsTaught: null })).toContain("the winter ended before it could pull in");
    expect(schoolMemory({ ...booking, pupilsTaught: 0 })).toContain("no pupil finished a lesson");
    expect(schoolMemory({ ...booking, pupilsTaught: 3 })).toContain("3 finished a lesson");
    expect(schoolMemory({ ...booking, pupilsTaught: 6 })).toContain("All 6 Readsboro pupils");
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
    const raw = historicalSaves.find(save => save.version === 6)!.state;
    const old = { ...raw, completedBeats: ["school_bus", "summit_link"] };
    const migrated = migrate(old, 6);
    expect(migrated).toMatchObject({ reset: false, state: {
      beatLog: [{ id: "school_bus", day: null }, { id: "summit_link", day: null }],
      schoolContract: null, summitLinkDecision: null, seasonDays: [],
    } });
    const record = winterRecord({ ...createBuiltHill(5), ...migrated.state });
    expect(record.score).toBeNull();
  });

  it("settles a legacy review while retaining a distinct earlier replay record", () => {
    const settled = { ...createBuiltHill(2), founderId: "elena", dayIndex: 28, phase: "winter_review", outcome: "finished" } as const;
    const review = { ...settled, weather: settled.weatherDays[27].kind };
    const old = historicalSaves.find(save => save.version === 6)!.state;
    const legacy = { ...old, dayIndex: review.dayIndex, weather: old.weatherDays![27].kind,
      phase: review.phase, outcome: review.outcome, founderId: review.founderId, cash: review.cash };
    const earlier = winterRecord({ ...review, cash: 7300 });
    const current = winterRecord(review);
    for (const previous of [undefined, earlier, current]) {
      const result = migrate({ ...legacy, lastWinter: previous }, 6);
      expect(result.reset).toBe(false);
      expect(result.state.lastWinter).toMatchObject({ cash: review.cash, goalMet: true, score: null });
      expect(result.state.career).toHaveLength(previous === earlier ? 2 : 1);
      if (previous === earlier) expect(result.state.career[0]).toEqual(earlier);
    }
  });

  it("averages closing reputation over the same guest days as satisfaction", () => {
    const day = { arrivals: 5, fare: "cheap", snow: "mid", satisfaction: 80 } as const;
    const state = { ...createBuiltHill(3), dayIndex: 3, reputation: 99, seasonDays: [
      { ...day, day: 1, closingReputation: 40 },
      { ...day, day: 2, arrivals: 0, closingReputation: 10 },
      { ...day, day: 3, satisfaction: 60, closingReputation: 80 },
    ] };
    expect(winterScore(state)).toEqual({ satisfaction: 70, averageReputation: 60, measuredDays: 2, total: 65 });
    expect(winterScore({ ...state, seasonDays: [{ ...day, day: 1 }, ...state.seasonDays.slice(1)] })).toBeNull();
  });

  it("preserves a settled v7 score that originally used final reputation", () => {
    const hill = createBuiltHill(7);
    const score = { satisfaction: 75, measuredDays: 2, total: 82 };
    const record = { ...winterRecord(hill), score, reputation: 89 };
    const result = migrate({ ...toPersisted(hill), lastWinter: record, career: [record] }, 7);
    expect(result.reset).toBe(false);
    expect(result.state.lastWinter?.score).toEqual(score);
    expect(result.state.career[0].score).toEqual(score);
  });

});
