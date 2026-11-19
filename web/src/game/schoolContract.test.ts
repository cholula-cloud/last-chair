import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { ASSET_CATALOG } from "./base";
import { DUTCH_HILL_CALENDAR } from "./calendar";
import { migrate } from "./migrations";
import { acknowledgeBeat, decideSchoolContract, expectedArrivals, openNight, pickFounder, sleep, skipToClose, tick } from "./rules";
import { nextSchoolBusDay, SCHOOL_BUS_FARE, SCHOOL_BUS_PUPILS } from "./schoolContract";
import { computeDayRevenue, makeGuest } from "./sim";
import { SAVE_VERSION, toPersisted, type GameState } from "./state";
import { DAY_START_MIN, MS_PER_GAME_MINUTE } from "./types";

function withSchool(dayIndex = 2): GameState {
  const state = pickFounder(createBuiltHill(), "elena");
  return {
    ...state,
    dayIndex,
    weather: state.weatherDays[dayIndex - 1].kind,
    lodgeTier: 2,
    assets: [...state.assets, { id: "ski_school", at: { x: 1, z: 1 }, styleId: ASSET_CATALOG.ski_school.styleId }],
    completedBeats: ["first_load", "saturday", "summit_link"],
  };
}

describe("school bus contract", () => {
  it("schedules the next weekday inside the winter and skips a calendar holiday", () => {
    expect(nextSchoolBusDay(DUTCH_HILL_CALENDAR, 5, 28)).toBe(8);
    expect(nextSchoolBusDay(DUTCH_HILL_CALENDAR, 18, 28)).toBe(19);
    expect(nextSchoolBusDay(DUTCH_HILL_CALENDAR, 19, 28)).toBeNull();
    expect(nextSchoolBusDay({ ...DUTCH_HILL_CALENDAR, holidayWeeks: [] }, 19, 28)).toBe(23);
    expect(nextSchoolBusDay(DUTCH_HILL_CALENDAR, 26, 28)).toBeNull();
  });

  it("offers only after completing a real lesson at a Tier 2 ski school", () => {
    const day = withSchool();
    expect(openNight({
      ...day,
      dayStats: { ...day.dayStats, venueRevenue: { ski_school: 18 } },
      talentsOwned: ["school_day"],
      guests: [makeGuest({ lesson: true })],
    }).pendingBeat).toBeNull();
    expect(skipToClose({ ...day, lodgeTier: 1 }).pendingBeat).toBeNull();
    const offered = skipToClose(day);
    expect(offered.guests.some((guest) => guest.schoolLessonCompleted)).toBe(true);
    expect(offered.pendingBeat).toBe("school_bus");
    expect(acknowledgeBeat(offered)).toBe(offered);
    expect(sleep(offered)).toBe(offered);
    expect(skipToClose(withSchool(26)).pendingBeat).not.toBe("school_bus");
  });

  it("remembers that the school operated when a different beat gets priority", () => {
    const night = skipToClose({ ...withSchool(), completedBeats: [] });
    expect(night.pendingBeat).toBe("first_load");
    const morning = sleep(acknowledgeBeat(night));
    const nextNight = openNight(morning);
    expect(morning.guests.some((guest) => guest.schoolLessonCompleted)).toBe(false);
    expect(nextNight.pendingBeat).toBe("school_bus");
  });

  it("adds only the accepted cohort, keeps the public fare, prices tickets, and records lessons", () => {
    const offer = skipToClose(withSchool());
    const accepted = decideSchoolContract(offer, "accepted");
    const declined = decideSchoolContract(offer, "declined");
    expect(accepted.schoolContract).toEqual({ decision: "accepted", day: 3, pupilsTaught: null });
    expect(declined.schoolContract).toEqual({ decision: "declined" });
    expect(decideSchoolContract(accepted, "declined")).toBe(accepted);
    expect(expectedArrivals(accepted, "cheap") - expectedArrivals(declined, "cheap")).toBeCloseTo(SCHOOL_BUS_PUPILS);
    const busDay = sleep({ ...accepted, pendingFare: "cheap" });
    const regularDay = sleep({ ...declined, pendingFare: "cheap" });
    expect(busDay.fare).toBe("cheap");
    expect(busDay.rngState).toBe(regularDay.rngState);
    expect(busDay.guests.filter((guest) => !guest.schoolPupil)).toEqual(regularDay.guests);

    const result = skipToClose(busDay);
    const recap = result.nightRecap!;
    const bus = recap.facts.schoolBus!;
    expect(bus.arrived).toBe(SCHOOL_BUS_PUPILS);
    expect(bus.taught).toBeGreaterThan(0);
    expect(bus.ticketRevenue).toBe(SCHOOL_BUS_PUPILS * SCHOOL_BUS_FARE);
    expect(recap.revenue).toBe(
      computeDayRevenue("cheap", recap.satisfaction, recap.arrivals - bus.arrived)
      + bus.ticketRevenue + Object.values(recap.facts.venueRevenue ?? {}).reduce((sum, value) => sum + value, 0),
    );
    expect(result.schoolContract).toEqual({ decision: "accepted", day: 3, pupilsTaught: bus.taught });
    const next = sleep(acknowledgeBeat(result));
    expect(next.guests.some((guest) => guest.schoolPupil)).toBe(false);
    expect(skipToClose(next).pendingBeat).not.toBe("school_bus");
  });

  it("does not charge pending pupils or report a lesson that was interrupted", () => {
    const accepted = decideSchoolContract(skipToClose(withSchool()), "accepted");
    const morning = sleep(accepted);
    expect(openNight(morning).nightRecap?.facts.schoolBus).toEqual({
      invited: SCHOOL_BUS_PUPILS, arrived: 0, taught: 0, ticketRevenue: 0,
    });
    expect(openNight(morning).nightRecap?.revenue).toBe(0);
    const midLesson = tick({ ...morning, paused: false }, (9 * 60 + 6 - DAY_START_MIN) * MS_PER_GAME_MINUTE);
    expect(midLesson.guests.some((guest) => guest.schoolPupil && guest.lesson)).toBe(true);
    expect(openNight(midLesson).schoolContract).toEqual({ decision: "accepted", day: 3, pupilsTaught: 0 });
  });

  it("records actual seats won when public lesson demand competes with the bus", () => {
    const morning = sleep(decideSchoolContract(skipToClose(withSchool()), "accepted"));
    const pupils = morning.guests.filter((guest) => guest.schoolPupil);
    const publicGuests = Array.from({ length: 8 }, (_, index) => makeGuest({
      id: `first-timer-${index}`,
      persona: "first_timer",
      state: "pending",
      arriveAtMin: 8 * 60 + 55,
    }));
    const run = (publicCount: number, assets = morning.assets) => {
      const guests = [...publicGuests.slice(0, publicCount), ...pupils];
      return skipToClose({ ...morning, assets, guests, dayStats: { ...morning.dayStats, arrivals: guests.length } });
    };
    expect(run(0).nightRecap?.facts.schoolBus).toMatchObject({ arrived: 6, taught: 6, ticketRevenue: 150 });
    expect(run(4).nightRecap?.facts.schoolBus).toMatchObject({ arrived: 6, taught: 4, ticketRevenue: 150 });
    expect(run(8).nightRecap?.facts.schoolBus).toMatchObject({ arrived: 6, taught: 0, ticketRevenue: 150 });
    const extraSchool = { ...morning.assets.at(-1)!, at: { x: 3, z: 1 } };
    expect(run(8, [...morning.assets, extraSchool]).nightRecap?.facts.schoolBus)
      .toMatchObject({ arrived: 6, taught: 6, ticketRevenue: 150 });
  });

  it("keeps the booked day and actual result through saves and safely retires old announcements", () => {
    const night = skipToClose(withSchool());
    const accepted = decideSchoolContract(night, "accepted");
    const result = skipToClose(sleep(accepted));
    for (const state of [accepted, result]) {
      expect(migrate(JSON.parse(JSON.stringify(toPersisted(state))), SAVE_VERSION))
        .toEqual({ state: JSON.parse(JSON.stringify(toPersisted(state))), reset: false });
    }
    const old = { ...toPersisted(night), completedBeats: ["first_load", "school_bus"] };
    expect(migrate(old, 5)).toMatchObject({
      reset: false,
      state: { schoolContract: null, schoolProgramProven: false, pendingBeat: null, beatAcknowledged: true,
        completedBeats: ["first_load", "school_bus"] },
    });
  });
});
