import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { morningCash } from "./economy";
import { migrate } from "./migrations";
import {
  acknowledgeBeat,
  openNight,
  pickFounder,
  replyToSummitLink,
  setPendingFare,
  sleep,
  startNewSeason,
} from "./rules";
import { hydrate, SAVE_VERSION, toPersisted } from "./state";
import { SUMMIT_LINK_FIRST_DAY_LEGACY, SUMMIT_LINK_PAYMENT } from "./summitLink";
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
});
