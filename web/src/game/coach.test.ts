import { describe, expect, it } from "vitest";
import { COACH_TIPS, COACH_TIP_IDS, nextTip, problemGuide, withTipSeen, type CoachContext } from "./coach";

const base: CoachContext = {
  phase: "day",
  dayIndex: 1,
  opening: "lift",
  running: false,
  placementActive: false,
  buildOpen: false,
  hasGuestsWant: false,
  enabled: true,
};

describe("coach tips", () => {
  it("has ten tips with unique ids and short, plain text", () => {
    expect(COACH_TIPS).toHaveLength(12);
    expect(new Set(COACH_TIP_IDS).size).toBe(COACH_TIP_IDS.length);
    for (const tip of COACH_TIPS) {
      expect(tip.text).toMatch(/[.]$/);
      expect(tip.text).not.toMatch(/[—–·]/);
      expect(tip.text.length).toBeLessThanOrEqual(100);
    }
  });

  it("offers the lift tip first, then the pan tip, one at a time", () => {
    expect(nextTip([], base)?.id).toBe("lift");
    expect(nextTip(["lift"], base)?.id).toBe("pan");
    expect(nextTip(["lift", "pan"], base)).toBeNull();
  });

  it("walks the placement and trail tips", () => {
    expect(nextTip(["lift", "pan"], { ...base, placementActive: true })?.id).toBe("review");
    expect(nextTip(["lift", "pan", "review"], { ...base, opening: "trail" })?.id).toBe("trail");
  });

  it("offers the speed tip once the day runs", () => {
    expect(nextTip(["lift", "pan", "review", "trail"], { ...base, opening: null, running: true })?.id).toBe("speed");
  });

  it("offers recap tips at night, the Guests want tip only when a line shows", () => {
    const night = { ...base, phase: "night" as const, opening: null };
    expect(nextTip([], night)?.id).toBe("recap");
    expect(nextTip(["recap"], night)).toBeNull();
    expect(nextTip(["recap"], { ...night, hasGuestsWant: true })?.id).toBe("guestsWant");
  });

  it("offers the goal and snow gun tips on later days", () => {
    const later = { ...base, opening: null, running: true, dayIndex: 2 };
    const seen = ["lift", "pan", "review", "trail", "speed", "lease", "recap", "guestsWant"];
    expect(nextTip(seen, later)?.id).toBe("goal");
    expect(nextTip([...seen, "goal"], later)).toBeNull();
    expect(nextTip([...seen, "goal"], { ...later, dayIndex: 3 })?.id).toBe("guns");
  });

  it("offers the lease tip while the build sheet is open", () => {
    expect(nextTip(["lift", "pan", "review", "trail"], { ...base, opening: null, buildOpen: true })?.id).toBe("lease");
  });

  it("shows nothing when tips are off or every tip was seen", () => {
    expect(nextTip([], { ...base, enabled: false })).toBeNull();
    expect(nextTip(COACH_TIP_IDS, base)).toBeNull();
  });

  it("records a seen tip once and ignores unknown ids", () => {
    expect(withTipSeen([], "lift")).toEqual(["lift"]);
    expect(withTipSeen(["lift"], "lift")).toEqual(["lift"]);
    expect(withTipSeen(["lift"], "nope")).toEqual(["lift"]);
  });
});

describe("contextual problem guidance", () => {
  const neutral = { queue: 0, snow: 0, runs: 0, arrivalMood: 0, value: 0 };
  it.each([
    ["queue", "slope", "Money"], ["snow", "conditions", "Desk"], ["value", "conditions", "Money"],
    ["runs", "slope", "Crew"], ["arrivalMood", "slope", "Crew"],
  ])("matches %s to an available layer and Office section", (issue, layer, tab) => {
    expect(problemGuide({
      arrivals: 20,
      breakdown: { ...neutral, [issue]: -10 },
      cashDelta: 12,
    })).toMatchObject({ layer, tab });
  });
  it("uses the same measured demand as the Guests want line", () => {
    const recap = { arrivals: 8, breakdown: { ...neutral, value: -8 }, cashDelta: 30 };
    expect(problemGuide(recap, "seats")).toMatchObject({ layer: "slope", tab: "Crew", text: expect.stringMatching(/lodge/) });
    expect(problemGuide(recap, "green")?.text).toMatch(/gentle descent/);
    expect(problemGuide(recap, "snow")).toMatchObject({ layer: "conditions", tab: "Desk" });
  });
  it("offers a real cash shortfall and stays silent on a quiet profitable day", () => {
    expect(problemGuide({ arrivals: 0, breakdown: neutral, cashDelta: -40 })?.tab).toBe("Money");
    expect(problemGuide({ arrivals: 5, breakdown: neutral, cashDelta: 40 })).toBeNull();
  });
});
