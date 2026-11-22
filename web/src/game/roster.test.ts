import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { DUTCH_HILL_CALENDAR } from "./calendar";
import {
  buildCallOffers,
  defaultCareerHills,
  ensureCareerHills,
  HILL_ROSTER,
  LORE_PINS,
  pinTone,
  townMatchBonus,
  townMatchCash,
} from "./mountains/roster";
import { pickFounder, startNextHill } from "./rules";

describe("New England mountain roster & The Call", () => {
  it("lists the eight lost New England hills plus Hogback conservation lore without cut hills", () => {
    expect(HILL_ROSTER).toHaveLength(8);
    expect(HILL_ROSTER.map((h) => h.id)).toEqual([
      "dutch_hill",
      "mount_tom",
      "maple_valley",
      "snow_valley",
      "enchanted_mountain",
      "evergreen_valley",
      "brodie",
      "mount_whittier",
    ]);
    expect(HILL_ROSTER.filter((h) => h.playable).map((h) => h.id)).toEqual([
      "dutch_hill",
      "mount_tom",
      "maple_valley",
    ]);
    expect(LORE_PINS.map((l) => l.id)).toEqual(["hogback"]);
  });

  it("keeps roster copy and heritage cards free of em dashes and middle dots", () => {
    const texts = [
      ...HILL_ROSTER.flatMap((h) => [h.name, h.signatureHook, h.heritage, h.localContact, h.contactRole]),
      ...LORE_PINS.flatMap((l) => [l.name, l.heritage]),
    ];
    for (const text of texts) {
      expect(text).not.toContain("\u2014");
      expect(text).not.toContain("\u00b7");
    }
  });

  it("maps career statuses to three-color Atlas tones and backfills old career histories", () => {
    expect(pinTone("open")).toBe("pine");
    expect(pinTone("caretaker")).toBe("pine");
    expect(pinTone("whiterock")).toBe("whiterock");
    expect(pinTone("unopened")).toBe("slate");
    expect(pinTone("forest")).toBe("slate");

    const seeded = defaultCareerHills("dutch_hill");
    expect(seeded.find((r) => r.mountainId === "dutch_hill")?.status).toBe("open");
    expect(seeded.filter((r) => r.status === "unopened")).toHaveLength(7);

    const partial = seeded.slice(0, 2);
    expect(ensureCareerHills(partial, "dutch_hill")).toHaveLength(8);
  });

  it("applies +10% town match at score 60-79 and +20% at 80+, quoting measured winter facts", () => {
    expect(townMatchBonus(59)).toBe(0);
    expect(townMatchBonus(60)).toBe(0.1);
    expect(townMatchBonus(80)).toBe(0.2);
    expect(townMatchCash("mount_tom", 72)).toBe(27_500);
    expect(townMatchCash("maple_valley", 84)).toBe(42_000);

    const offers = buildCallOffers({
      mountainId: "dutch_hill",
      calendar: DUTCH_HILL_CALENDAR,
      seasonDays: [
        { day: 1, fare: "balanced", snow: "mid", arrivals: 28, satisfaction: 82, closingReputation: 58 },
        { day: 2, fare: "balanced", snow: "mid", arrivals: 46, satisfaction: 85, closingReputation: 64 },
      ],
      dayHistory: [],
      lastDay: {
        arrivals: 46,
        satisfaction: 85,
        cashDelta: 400,
        avgWaitMin: 3,
        snowNightCost: 150,
        fare: "balanced",
        snow: "mid",
      },
      schoolContract: { decision: "accepted", day: 11, pupilsTaught: 6 },
      lastWinter: {
        day: 42,
        founder: "elena",
        bankrupt: false,
        cash: 15_000,
        loan: 0,
        construction: 0,
        netWorth: 15_000,
        school: null,
        summitLink: null,
        localMoment: null,
        score: { total: 82, satisfaction: 84, averageReputation: 72, measuredDays: 18 },
      },
    });
    expect(offers).toHaveLength(2);
    expect(offers[0].pitch).toContain("46 skiers");
    expect(offers[0].pitch).toContain("3-minute wait");
    expect(offers[0].bonusPct).toBe(20);
    expect(offers[0].startingCash).toBe(30_000);
    expect(offers[1].pitch).toContain("six-for-six");
    expect(offers[1].startingCash).toBe(42_000);
  });

  it("transitions to a playable Act II hill, marks Dutch Hill with its caretaker, and switches calendar to 49 days", () => {
    const hill = pickFounder(createBuiltHill(), "elena");
    const winterDone = {
      ...hill,
      phase: "mountain2" as const,
      outcome: "finished" as const,
      lastWinter: {
        day: 42,
        founder: "elena" as const,
        bankrupt: false,
        cash: 14_500,
        loan: 0,
        construction: 0,
        netWorth: 14_500,
        school: null,
        summitLink: null,
        localMoment: null,
        score: { total: 68, satisfaction: 74, averageReputation: 62, measuredDays: 18 },
      },
    };
    const next = startNextHill(winterDone, "mount_tom");
    expect(next.mountainId).toBe("mount_tom");
    expect(next.phase).toBe("day");
    expect(next.seasonLength).toBe(49);
    expect(next.cash).toBe(27_500); // 25,000 * 1.10 town match
    expect(next.careerHills.find((r) => r.mountainId === "dutch_hill")).toMatchObject({
      status: "caretaker",
      caretakerAlly: "Elena Vargas",
      wintersRun: 1,
      bestScore: 68,
    });
    expect(next.careerHills.find((r) => r.mountainId === "mount_tom")?.status).toBe("open");
  });
});
