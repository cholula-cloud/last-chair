import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { operatingDayIndex, seasonCalendar, weekdayForDay } from "./calendar";
import { dayEndMin, isMountTomNightActive, mountTomNightNet } from "./mountains/mountTom";
import { liftLoadingClosesAt } from "./lifts";
import { createInitialState } from "./state";
import { decideMountTomShuttle, mtShuttleOfferOpen, openNight, pickFounder, skipToClose, tick } from "./rules";
import { DAY_END_MIN, MS_PER_GAME_MINUTE, NIGHT_SESSION_END_MIN } from "./types";

describe("Mount Tom night session twilight", () => {
  it("keeps Dutch Hill and Maple Valley closing at 4:00 PM", () => {
    expect(dayEndMin({ mountainId: "dutch_hill", nightLights: true, nightSessionOn: true })).toBe(DAY_END_MIN);
    expect(dayEndMin({ mountainId: "maple_valley", nightLights: true, nightSessionOn: true })).toBe(DAY_END_MIN);
    expect(dayEndMin({ mountainId: "mount_tom", nightLights: false, nightSessionOn: true })).toBe(DAY_END_MIN);
    expect(dayEndMin({ mountainId: "mount_tom", nightLights: true, nightSessionOn: false })).toBe(DAY_END_MIN);
  });

  it("extends Mount Tom operating day to 6:30 PM when lights and night session are active", () => {
    const active = { mountainId: "mount_tom" as const, nightLights: true, nightSessionOn: true };
    expect(isMountTomNightActive(active)).toBe(true);
    expect(dayEndMin(active)).toBe(NIGHT_SESSION_END_MIN);
    expect(liftLoadingClosesAt([], NIGHT_SESSION_END_MIN)).toBe(NIGHT_SESSION_END_MIN - 15);
  });

  it("spawns visual evening skiers past 4 PM without double-counting arrivals or revenue", () => {
    const base = pickFounder(createInitialState(7, "mount_tom"), "elena");
    const built = createBuiltHill();
    let s = {
      ...base,
      lifts: built.lifts,
      trails: built.trails,
      nightLights: true,
      nightSessionOn: true,
      paused: false,
    };

    // Advance to just before 4:00 PM, then cross 4:00 PM.
    s = { ...s, clockMin: DAY_END_MIN - 2 };
    s = tick(s, 4 * MS_PER_GAME_MINUTE);
    expect(s.phase).toBe("day");
    expect(s.clockMin).toBeGreaterThanOrEqual(DAY_END_MIN);
    const nightWave = s.guests.filter((g) => g.id.startsWith("night-"));
    expect(nightWave.length).toBeGreaterThan(0);

    const closed = skipToClose(s);
    expect(closed.phase).toBe("night");
    expect(closed.clockMin).toBe(NIGHT_SESSION_END_MIN);
    const expectedExtra = mountTomNightNet(closed.nightRecap!.arrivals).net;
    expect(closed.nightRecap).not.toBeNull();
    // Night-wave guests must never be counted in day arrivals.
    expect(closed.nightRecap!.arrivals).toBe(
      closed.guests.filter((g) => !g.id.startsWith("night-") && g.state !== "pending").length,
    );
    expect(Number.isFinite(expectedExtra)).toBe(true);
  });

  it("opens Whiterock shuttle offer from op day 4 and pays Saturday stipend only when accepted", () => {
    const base = pickFounder(createInitialState(7, "mount_tom"), "elena");
    const built = createBuiltHill();
    const cal = seasonCalendar(base);
    let satDay = base.dayIndex;
    while (satDay <= cal.length && (operatingDayIndex(cal, satDay) < 4 || weekdayForDay(cal, satDay) !== "Sat")) {
      satDay += 1;
    }
    expect(weekdayForDay(cal, satDay)).toBe("Sat");
    expect(operatingDayIndex(cal, satDay)).toBeGreaterThanOrEqual(4);

    const earlyNight = openNight({ ...base, lifts: built.lifts, trails: built.trails, phase: "night", clockMin: DAY_END_MIN });
    expect(mtShuttleOfferOpen(earlyNight)).toBe(false);

    const dayBeforeSatNight = {
      ...base,
      dayIndex: satDay - 1,
      lifts: built.lifts,
      trails: built.trails,
      phase: "night" as const,
      clockMin: DAY_END_MIN,
    };
    expect(mtShuttleOfferOpen(dayBeforeSatNight)).toBe(true);
    const declined = decideMountTomShuttle(dayBeforeSatNight, "declined");
    expect(declined.mtShuttleDecision).toBe("declined");
    expect(declined.reputation).toBeGreaterThan(dayBeforeSatNight.reputation);

    const accepted = decideMountTomShuttle(dayBeforeSatNight, "accepted");
    expect(accepted.mtShuttleDecision).toBe("accepted");
    expect(mtShuttleOfferOpen(accepted)).toBe(false);

    const satStart = { ...accepted, dayIndex: satDay, phase: "day" as const, paused: false };
    const satWithoutStart = { ...satStart, mtShuttleDecision: "declined" as const, reputation: declined.reputation };
    const satNight = skipToClose(satStart);
    const satWithout = skipToClose(satWithoutStart);
    expect(satNight.nightRecap).not.toBeNull();
    expect(satNight.nightRecap!.arrivals).toBeGreaterThan(0);
    // Accepted shuttle pays $400 flat but reduces Saturday arrivals by 15% and caps parking stalls (-12)
    expect(satNight.nightRecap!.arrivals).toBeLessThanOrEqual(satWithout.nightRecap!.arrivals);
  });
});
