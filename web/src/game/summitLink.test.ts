import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { morningCash } from "./economy";
import { migrate } from "./migrations";
import {
  acknowledgeBeat,
  decideClubBooking,
  decideGroomerDown,
  openNight,
  pickFounder,
  previewOvernight,
  replyToSummitLink,
  setPendingFare,
  sleep,
  startNewSeason,
} from "./rules";
import { hydrate, SAVE_VERSION, toPersisted } from "./state";
import {
  CLUB_BUS_DISCOUNT,
  CLUB_BUS_SKIERS,
  GROOMER_REPAIR_COST,
  SUMMIT_LINK_FIRST_DAY_LEGACY,
  SUMMIT_LINK_PAYMENT,
  SUMMIT_LINK_REDUCED_PAYMENT,
  summitLinkFirstDay,
} from "./summitLink";
import { makeGuest } from "./sim";
import type { FounderId } from "./types";

function openingNight(founder: FounderId = "elena") {
  const state = pickFounder(createBuiltHill(), founder);
  return openNight({
    ...state,
    dayIndex: SUMMIT_LINK_FIRST_DAY_LEGACY,
    weather: state.weatherDays[SUMMIT_LINK_FIRST_DAY_LEGACY - 1].kind,
    reputation: 80,
    fare: "expensive",
    completedBeats: ["first_load"],
  });
}

describe("Abominable Snowglomerate offer", () => {
  it("requires an explicit answer and pays immediately with a season-long Balanced fare cap", () => {
    const night = openingNight();
    expect(night.pendingBeat).toBe("summit_link");
    expect(acknowledgeBeat(night)).toBe(night);
    expect(sleep(night)).toBe(night);

    const accepted = replyToSummitLink(night, "accepted");
    expect(accepted).toMatchObject({
      cash: night.cash + SUMMIT_LINK_PAYMENT,
      fare: "expensive",
      pendingFare: "balanced",
      pendingBeat: null,
      summitLinkDecision: "accepted",
      nightRecap: { summitLinkReply: "accepted", cashDelta: night.nightRecap!.cashDelta },
    });
    expect(morningCash(accepted)).toBe(morningCash(night) + SUMMIT_LINK_PAYMENT);
    expect(accepted.completedBeats).toContain("summit_link");
    expect(replyToSummitLink(accepted, "accepted")).toBe(accepted);
    expect(replyToSummitLink(accepted, "declined")).toBe(accepted);
    expect(setPendingFare(accepted, "expensive")).toBe(accepted);

    const morning = sleep(accepted);
    expect(morning.fare).toBe("balanced");
    const nextNight = openNight(morning);
    expect(nextNight.pendingBeat).not.toBe("summit_link");
    expect(nextNight.nightRecap?.summitLinkReply).toBeUndefined();
    expect(setPendingFare(nextNight, "expensive")).toBe(nextNight);
    expect(sleep(setPendingFare(nextNight, "cheap")).fare).toBe("cheap");
    expect(startNewSeason(morning).summitLinkDecision).toBeNull();
  });

  it("leaves the player free to charge Expensive after declining", () => {
    const night = openingNight();
    const independent = replyToSummitLink(night, "declined");
    expect(independent.cash).toBe(night.cash);
    expect(independent.summitLinkDecision).toBe("declined");
    expect(sleep(setPendingFare(independent, "expensive")).fare).toBe("expensive");
    expect(replyToSummitLink(independent, "accepted")).toBe(independent);
  });

  it("prevents Riley from accepting and leaves the independent choice available", () => {
    const night = openingNight("riley");
    expect(night.pendingBeat).toBe("summit_link");
    expect(replyToSummitLink(night, "accepted")).toBe(night);
    expect(replyToSummitLink(night, "declined").summitLinkDecision).toBe("declined");
  });

  it("withholds the offer on the final night", () => {
    const night = openingNight();
    const lastDay = night.seasonLength;
    const lastNight = openNight({ ...night, phase: "day", dayIndex: lastDay, weather: night.weatherDays[lastDay - 1].kind });
    expect(lastNight.pendingBeat).not.toBe("summit_link");
    expect(replyToSummitLink(lastNight, "accepted")).toBe(lastNight);
  });

  it("preserves the unsigned offer and the signed deal across reloads", () => {
    const night = openingNight();
    const reload = (state: typeof night, version = SAVE_VERSION) => {
      const parsed = migrate(JSON.parse(JSON.stringify(toPersisted(state))), version);
      expect(parsed.reset).toBe(false);
      return hydrate(parsed.state, createBuiltHill());
    };
    const migrated = reload(night, 5);
    expect(migrated.pendingBeat).toBe("summit_link");
    expect(migrated.summitLinkDecision).toBeNull();
    const accepted = replyToSummitLink(migrated, "accepted");
    const loaded = reload(accepted);
    expect(loaded.cash).toBe(accepted.cash);
    expect(loaded.nightRecap?.summitLinkReply).toBe("accepted");
    expect(replyToSummitLink(loaded, "accepted")).toBe(loaded);
    expect(setPendingFare(loaded, "expensive")).toBe(loaded);
    expect(sleep(loaded).fare).toBe("balanced");
  });

  it("clears a stale final-night teaser from a legacy save", () => {
    const night = openingNight();
    const lastDay = night.seasonLength;
    const migrated = migrate(toPersisted({ ...night, dayIndex: lastDay, weather: night.weatherDays[lastDay - 1].kind }), 5);
    expect(migrated).toMatchObject({
      reset: false,
      state: { pendingBeat: null, beatAcknowledged: true, summitLinkDecision: null },
    });
  });

  it("still gives a player who heard the legacy teaser one real offer", () => {
    const lastNight = openingNight();
    const pending = openNight({
      ...lastNight,
      phase: "day",
      completedBeats: ["first_load", "summit_link"],
    });
    expect(pending.pendingBeat).toBe("summit_link");
    const accepted = replyToSummitLink(pending, "accepted");
    expect(accepted.completedBeats.filter((id) => id === "summit_link")).toHaveLength(1);
  });

  it("pays $3,000 when reputation is 40-49 vs $6,000 at 50+, and lets Tom call two days earlier", () => {
    expect(summitLinkFirstDay(42, "elena")).toBe(22);
    expect(summitLinkFirstDay(42, "tom")).toBe(20);

    const base = pickFounder(createBuiltHill(), "tom");
    const midRepNight = openNight({
      ...base,
      dayIndex: SUMMIT_LINK_FIRST_DAY_LEGACY - 2,
      weather: base.weatherDays[SUMMIT_LINK_FIRST_DAY_LEGACY - 3].kind,
      reputation: 45,
      completedBeats: ["first_load"],
    });
    expect(midRepNight.pendingBeat).toBe("summit_link");
    const accepted = replyToSummitLink(midRepNight, "accepted");
    expect(accepted.cash).toBe(midRepNight.cash + SUMMIT_LINK_REDUCED_PAYMENT);
    expect(accepted.nightRecap?.summitLinkPayment).toBe(SUMMIT_LINK_REDUCED_PAYMENT);
    const morning = sleep(accepted);
    expect(morning.seasonDays.at(-1)?.summitLink?.receipt).toBe(SUMMIT_LINK_REDUCED_PAYMENT);
  });

  it("offers Bennington Ski Club after a zero-wait Saturday and delivers 10 club skiers next Saturday", () => {
    const built = pickFounder(createBuiltHill(), "elena");
    const weatherDays = Array.from({ length: 42 }, (_, i) => built.weatherDays[i % built.weatherDays.length]);
    const satDay9 = openNight({
      ...built,
      seasonLength: 42,
      weatherDays,
      dayIndex: 9, // Week 2 Saturday
      weather: weatherDays[8].kind,
      guests: [makeGuest({ id: "g1", state: "gone", runs: 4, waitMin: 6, waitCount: 3, snowSum: 3.4 })],
      dayStats: { ...built.dayStats, arrivals: 1, guestsArrived: 1, completedRuns: 4, runsPerGuest: 4, dispatched: 4 },
      completedBeats: ["first_load", "saturday"],
    });
    expect(satDay9.clubBooking).toEqual({ decision: "pending", day: 16, skiersArrived: null });
    expect(sleep(satDay9)).toBe(satDay9);

    const booked = decideClubBooking(satDay9, "accepted");
    expect(booked.clubBooking?.decision).toBe("accepted");
    expect(booked.surpriseLog.some((e) => e.kind === "club_bus")).toBe(true);

    // Jump straight to Friday night Day 15 and sleep into Saturday Day 16.
    const friNight = openNight({
      ...booked,
      phase: "day",
      dayIndex: 15,
      weather: weatherDays[14].kind,
      guests: [makeGuest({ id: "g2", state: "gone", runs: 3, waitMin: 4, waitCount: 2, snowSum: 2.5 })],
      dayStats: { ...booked.dayStats, arrivals: 1, guestsArrived: 1, completedRuns: 3, runsPerGuest: 3, dispatched: 3 },
      completedBeats: ["first_load", "saturday"],
    });
    const satMorning16 = sleep(friNight);
    const clubGuests = satMorning16.guests.filter((g) => g.id.startsWith("club-"));
    expect(clubGuests).toHaveLength(CLUB_BUS_SKIERS);
    expect(CLUB_BUS_DISCOUNT).toBe(10);
  });

  it("triggers groomer_down beat after heavy grooming and skips grooming if go_without is chosen", () => {
    const built = pickFounder(createBuiltHill(), "elena");
    const weatherDays = Array.from({ length: 42 }, (_, i) => built.weatherDays[i % built.weatherDays.length]);
    const seasonDays = [
      { day: 1, fare: "balanced" as const, snow: "mid" as const, arrivals: 30, satisfaction: 78 },
      { day: 2, fare: "balanced" as const, snow: "high" as const, arrivals: 30, satisfaction: 78 },
      { day: 3, fare: "balanced" as const, snow: "high" as const, arrivals: 30, satisfaction: 78 },
    ];
    const openDay15 = openNight({
      ...built,
      seasonLength: 42,
      weatherDays,
      dayIndex: 15,
      weather: weatherDays[14].kind,
      seasonDays,
      seasonGroomFeet: 6000,
      guests: [makeGuest({ id: "g3", state: "gone", runs: 3, waitMin: 3, waitCount: 2, snowSum: 2.5 })],
      dayStats: { ...built.dayStats, arrivals: 1, guestsArrived: 1, completedRuns: 3, runsPerGuest: 3, dispatched: 3 },
      completedBeats: ["first_load", "saturday"],
    });
    expect(openDay15.pendingBeat).toBe("groomer_down");
    expect(sleep(openDay15)).toBe(openDay15);

    const borrowed = decideGroomerDown(openDay15, "borrow");
    expect(borrowed.cash).toBe(openDay15.cash - GROOMER_REPAIR_COST);
    expect(borrowed.groomerDownDecision).toBe("borrow");
    expect(borrowed.groomerDownTonight).toBe(false);

    const skipped = decideGroomerDown(openDay15, "go_without");
    expect(skipped.cash).toBe(openDay15.cash);
    expect(skipped.groomerDownTonight).toBe(true);
    const borrowedSnow = previewOvernight(borrowed, "high").meanQuality;
    const skippedSnow = previewOvernight(skipped, "high").meanQuality;
    expect(skippedSnow).toBeLessThanOrEqual(borrowedSnow);

    const morningAfterSkip = sleep(skipped);
    expect(morningAfterSkip.groomerDownTonight).toBe(false);
  });
});
