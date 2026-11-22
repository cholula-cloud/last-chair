import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { resolveLostHill, simulateCaretakerWinter, whiterockBuyoutOffer } from "./caretaker";
import { mapleValleyRadioNote, ORCHARD_PARCEL_COST, INSPECTOR_REPAIR_COST, TUBING_SATURDAY_BONUS } from "./mountains/mapleValley";
import { mountTomNightNet, mountTomRadioNote, NIGHT_LIGHTS_COST } from "./mountains/mountTom";
import { defaultCareerHills } from "./mountains/roster";
import {
  checkGunPlacement,
  decideInspectorNotice,
  decideOrchardParcel,
  decideWhiterockCaretakerBid,
  installNightLights,
  openNight,
  pickFounder,
  resumeSurvivingHill,
  setNightSession,
  sleep,
  startNextHill,
} from "./rules";
import { makeGuest } from "./sim";
import { createInitialState } from "./state";
import { terrainForMountain, TERRAIN } from "./terrain";

describe("Mount Tom, Maple Valley, and Caretaker Career Mechanics", () => {
  it("provides distinct terrain definitions and caches them cleanly", () => {
    expect(terrainForMountain("dutch_hill")).toBe(TERRAIN);
    expect(terrainForMountain("mount_tom").def.verticalFeet).toBe(680);
    expect(terrainForMountain("maple_valley").def.verticalFeet).toBe(900);
    expect(terrainForMountain("mount_tom")).toBe(terrainForMountain("mount_tom"));
  });

  it("unlocks snow guns at Lodge Tier 1 on Mount Tom and supports Night Sessions", () => {
    const tomBase = pickFounder(createInitialState(7, "mount_tom"), "elena");
    const built = createBuiltHill();
    const trailReady = {
      ...tomBase,
      lifts: built.lifts,
      trails: built.trails,
      lodgeTier: 1 as const,
    };
    const mountTomGun = checkGunPlacement(trailReady, TERRAIN.base);
    expect(mountTomGun.ok).toBe(true);
    const dutchGun = checkGunPlacement({ ...trailReady, mountainId: "dutch_hill" }, TERRAIN.base);
    expect(dutchGun).toEqual({ ok: false, reason: "Snow guns need Lodge Tier 2." });

    const lit = installNightLights(trailReady);
    expect(lit.nightLights).toBe(true);
    expect(lit.nightSessionOn).toBe(true);
    expect(lit.cash).toBe(trailReady.cash - NIGHT_LIGHTS_COST);

    const toggledOff = setNightSession(lit, false);
    expect(toggledOff.nightSessionOn).toBe(false);

    const busierNight = mountTomNightNet(36);
    const deadNight = mountTomNightNet(10);
    expect(busierNight.net).toBeGreaterThan(0);
    expect(deadNight.net).toBeLessThan(0);

    for (const kind of ["mill_lights", "whiterock_shuttle", "valley_inversion"] as const) {
      const note = mountTomRadioNote(kind, "Sam");
      expect(note.radio).not.toContain("\u2014");
      expect(note.radio).not.toContain("\u00b7");
      expect(note.radio.length).toBeLessThanOrEqual(220);
    }
  });

  it("handles Maple Valley Orchard Parcel bid, Inspector's Tuesday, Tubing Saturday, and recurring Friday bus", () => {
    const mvBase = pickFounder(createInitialState(9, "maple_valley"), "elena");
    const weatherDays = mvBase.weatherDays;
    const satBuilt = {
      ...mvBase,
      lodgeTier: 2 as const,
      lifts: createBuiltHill().lifts,
      trails: createBuiltHill().trails,
      assets: [{ id: "tubing_hill" as const, at: { x: 1, z: 3 }, builtDay: 1, paid: 0, styleId: "1950s-timber" }],
      dayIndex: 16, // Week 3 Saturday (openDay 8 >= 7)
      operatingDayIndex: 8,
      weather: weatherDays[15].kind,
      schoolContract: { decision: "accepted" as const, day: 16, pupilsTaught: null },
      guests: [
        makeGuest({ id: "school-16-0", schoolPupil: true, schoolLessonCompleted: true, state: "gone", runs: 2 }),
        makeGuest({ id: "mv-1", state: "gone", runs: 3, waitMin: 6, waitCount: 3 }),
      ],
      dayStats: { ...mvBase.dayStats, arrivals: 2, guestsArrived: 2, completedRuns: 5, dispatched: 5 },
      completedBeats: ["first_load", "saturday"] as ("first_load" | "saturday")[],
    };
    const nonMvTubingNight = openNight({ ...satBuilt, mountainId: "dutch_hill" });
    const orchardNight = openNight(satBuilt);
    expect(orchardNight.orchardParcel).toBe("pending");
    expect(orchardNight.cash - nonMvTubingNight.cash).toBe(TUBING_SATURDAY_BONUS);
    expect(orchardNight.schoolContract).toEqual({ decision: "accepted", day: 23, pupilsTaught: 1 });
    expect(TUBING_SATURDAY_BONUS).toBe(320);
    expect(sleep(orchardNight)).toBe(orchardNight);

    const bought = decideOrchardParcel(orchardNight, "buy");
    expect(bought.orchardParcel).toBe("owned");
    expect(bought.cash).toBe(orchardNight.cash - ORCHARD_PARCEL_COST);

    const inspectorNight = openNight({
      ...bought,
      phase: "day",
      dayIndex: 17,
      weather: weatherDays[16].kind,
      guests: [makeGuest({ id: "mv-2", state: "gone", runs: 3 })],
      dayStats: { ...mvBase.dayStats, arrivals: 1, guestsArrived: 1, completedRuns: 3, dispatched: 3 },
    });
    expect(inspectorNight.inspectorNotice).toEqual({ day: 17, liftIndex: 0, decision: "pending" });
    expect(sleep(inspectorNight)).toBe(inspectorNight);

    const repaired = decideInspectorNotice(inspectorNight, "repaired");
    expect(repaired.inspectorNotice?.decision).toBe("repaired");
    expect(repaired.cash).toBe(inspectorNight.cash - INSPECTOR_REPAIR_COST);

    for (const kind of ["windham_bus", "tubing_saturday", "orchard_bid", "inspectors_tuesday"] as const) {
      const note = mapleValleyRadioNote(kind, "Sam");
      expect(note.radio).not.toContain("\u2014");
      expect(note.radio).not.toContain("\u00b7");
      expect(note.radio.length).toBeLessThanOrEqual(220);
    }
  });

  it("runs coarse off-screen caretaker winters, triggers Whiterock bid below rep 45, and handles Lost Hills vs The Forest", () => {
    const lowRepRecord = {
      mountainId: "dutch_hill" as const,
      status: "caretaker" as const,
      caretakerAlly: "Elena Vargas",
      wintersRun: 1,
      lastCashDelta: 0,
      lastReputation: 38,
      bestScore: 64,
    };
    const simmed = simulateCaretakerWinter(lowRepRecord, 42, 1);
    expect(simmed.record.wintersRun).toBe(2);
    expect(simmed.note.mountainId).toBe("dutch_hill");
    expect(simmed.ledger.caretakerAlly).toBe("Elena Vargas");

    // Verify Whiterock buyout bid when rep dips below 45
    const bidHills = defaultCareerHills("mount_tom").map((h) =>
      h.mountainId === "dutch_hill" ? { ...lowRepRecord, whiterockBidOpen: true } : h,
    );
    const mt = pickFounder(createInitialState(7, "mount_tom"), "elena");
    const sold = decideWhiterockCaretakerBid({ ...mt, careerHills: bidHills }, "dutch_hill", "sell");
    expect(sold.cash).toBe(mt.cash + whiterockBuyoutOffer("dutch_hill"));
    expect(sold.careerHills.find((h) => h.mountainId === "dutch_hill")).toMatchObject({
      status: "whiterock",
      whiterockBidOpen: false,
    });

    // Later hill bankruptcy turns its pin Whiterock/forest and leaves surviving career alive
    const mixedHills = defaultCareerHills("mount_tom").map((h) =>
      h.mountainId === "dutch_hill" ? { ...lowRepRecord, status: "caretaker" as const } : h,
    );
    const lost = resolveLostHill(mixedHills, "mount_tom", true);
    expect(lost.lostStatus).toBe("whiterock");
    expect(lost.forestEpilogue).toBe(false);
    expect(lost.survivingHills.map((h) => h.mountainId)).toEqual(["dutch_hill"]);

    // Resume surviving Dutch Hill after Mount Tom forecloses
    const resumed = resumeSurvivingHill(
      { ...mt, phase: "winter_review", outcome: "bankrupt", careerHills: lost.careerHills },
      "dutch_hill",
    );
    expect(resumed.mountainId).toBe("dutch_hill");
    expect(resumed.phase).toBe("day");
    expect(resumed.outcome).toBe("playing");

    // 0 surviving hills reaches The Forest epilogue
    const onlyOneLeft = defaultCareerHills("maple_valley");
    const allGone = resolveLostHill(onlyOneLeft, "maple_valley", false);
    expect(allGone.lostStatus).toBe("forest");
    expect(allGone.forestEpilogue).toBe(true);

    // Moving from Dutch Hill to Mount Tom then Maple Valley logs caretaker Homecoming notes & ledger
    const dhReview = {
      ...pickFounder(createBuiltHill(), "elena"),
      phase: "mountain2" as const,
      outcome: "finished" as const,
      lastWinter: {
        day: 42,
        founder: "elena" as const,
        bankrupt: false,
        cash: 15_000,
        loan: 0,
        construction: 0,
        netWorth: 15_000,
        school: null,
        summitLink: null,
        localMoment: null,
        score: { total: 70, satisfaction: 76, averageReputation: 64, measuredDays: 18 },
      },
    };
    const onTom = startNextHill(dhReview, "mount_tom");
    const onMaple = startNextHill({ ...onTom, phase: "mountain2", outcome: "finished" }, "maple_valley");
    expect(onMaple.homecomingNotes).toHaveLength(1);
    expect(onMaple.homecomingNotes[0].mountainId).toBe("dutch_hill");
    expect(onMaple.caretakerLedger).toHaveLength(1);
  });
});
