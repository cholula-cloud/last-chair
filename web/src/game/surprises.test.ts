import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { DUTCH_HILL_CALENDAR, DUTCH_HILL_CALENDAR_LEGACY } from "./calendar";
import { dryWeekRadio } from "./content";
import { migrate } from "./migrations";
import { acknowledgeBeat, pickFounder, skipToClose, sleep, tick } from "./rules";
import { createRng, mix32 } from "./rng";
import { createInitialGuests } from "./sim";
import { SAVE_VERSION, toPersisted, type GameState } from "./state";
import { arrangeSurprise, resolveSurprise, surpriseRadio, type SurpriseKind } from "./surprises";
import { MS_PER_GAME_MINUTE, type DayWeather, type WeatherKind } from "./types";

const calendar = DUTCH_HILL_CALENDAR_LEGACY;
const guests = createInitialGuests(24, createRng(42).next);

function seedFor(kind: SurpriseKind): number {
  for (let seed = 0; seed < 1000; seed++) {
    const { surprise } = arrangeSurprise({ calendar, dayIndex: 2, seasonSeed: mix32(seed), weather: "clear", surpriseLog: [] }, guests);
    if (surprise?.kind === kind) return seed;
  }
  throw new Error(`No deterministic fixture seed for ${kind}`);
}

function reload(state: GameState): GameState {
  const loaded = migrate(JSON.parse(JSON.stringify(toPersisted(state))), SAVE_VERSION);
  expect(loaded.reset).toBe(false);
  return { ...state, ...loaded.state };
}

function secondMorning(kind: SurpriseKind) {
  const initial = createBuiltHill(seedFor(kind));
  const opening = pickFounder({
    ...initial,
    weatherDays: initial.weatherDays.map((weather, index) => index === 1 ? { kind: "clear", wind: "calm" } : weather),
  }, "elena");
  expect(opening.surprise).toBeNull();
  const night = acknowledgeBeat(skipToClose(opening));
  const morning = sleep(night);
  expect(morning.surprise?.kind).toBe(kind);
  return { night, morning };
}

describe("Route 100 surprises", () => {
  it("keeps the opening day clear and rolls rare pie without changing the roster or main RNG", () => {
    const { night, morning } = secondMorning("pie");
    const noRepeat = sleep({ ...night, surpriseLog: [{ dayIndex: 1, kind: "pie", affectedGuests: 0 }] });
    expect(noRepeat.surprise).toBeNull();
    expect(morning.guests).toEqual(noRepeat.guests);
    expect(morning.rngState).toBe(noRepeat.rngState);
    expect(morning.weatherDays).toEqual(noRepeat.weatherDays);
    const closed = reload(skipToClose(reload(morning)));
    expect(closed.surprise).toBeNull();
    expect(closed.surpriseLog).toEqual([{ dayIndex: 2, kind: "pie", affectedGuests: 0 }]);
    expect(surpriseRadio(closed.surpriseLog[0]).title).toBe("Pie on the counter");
  });

  it("has former regulars join as real midweek ticket-paying guests", () => {
    const { night, morning } = secondMorning("former_regulars");
    const noRepeat = sleep({ ...night, surpriseLog: [{ dayIndex: 1, kind: "former_regulars", affectedGuests: 3 }] });
    const group = morning.guests.filter((guest) => morning.surprise?.guestIds.includes(guest.id));
    expect(group.length).toBeGreaterThanOrEqual(3);
    expect(group.every((guest) => guest.persona === "regular" && guest.state === "pending")).toBe(true);
    expect(morning.guests.filter((guest) => !group.includes(guest))).toEqual(noRepeat.guests);
    expect(morning.rngState).toBe(noRepeat.rngState);
    expect(morning.dayStats.arrivals).toBe(noRepeat.dayStats.arrivals + group.length);
    const closed = skipToClose(morning);
    expect(closed.dayStats.guestsArrived).toBe(morning.guests.length);
    expect(closed.nightRecap?.arrivals).toBe(morning.guests.length);
    expect(closed.surpriseLog).toEqual([{ dayIndex: 2, kind: "former_regulars", affectedGuests: group.length }]);
  });

  it("holds existing skiers until the same game minute and resolves their arrival after reload", () => {
    const { night, morning } = secondMorning("road_delay");
    const noRepeat = sleep({ ...night, surpriseLog: [{ dayIndex: 1, kind: "road_delay", affectedGuests: 3 }] });
    const group = morning.guests.filter((guest) => morning.surprise?.guestIds.includes(guest.id));
    const arrival = group[0].arriveAtMin;
    expect(group.length).toBeGreaterThan(1);
    expect(group.every((guest) => guest.arriveAtMin === arrival && guest.stateSinceMin === arrival)).toBe(true);
    expect(morning.guests.map((guest) => guest.id).sort()).toEqual(noRepeat.guests.map((guest) => guest.id).sort());
    expect(morning.dayStats.arrivals).toBe(noRepeat.dayStats.arrivals);
    expect(morning.rngState).toBe(noRepeat.rngState);
    const before = tick({ ...reload(morning), paused: false }, (arrival - morning.clockMin - 0.5) * MS_PER_GAME_MINUTE);
    const after = tick(reload(before), MS_PER_GAME_MINUTE / 2);
    expect(before.guests.filter((guest) => morning.surprise?.guestIds.includes(guest.id)).every((guest) => guest.state === "pending")).toBe(true);
    expect(after.dayStats.guestsArrived - before.dayStats.guestsArrived).toBeGreaterThanOrEqual(group.length);
    expect(after.guests.filter((guest) => morning.surprise?.guestIds.includes(guest.id)).every((guest) => guest.state === "arrive")).toBe(true);
    const closed = reload(skipToClose(after));
    expect(closed.surpriseLog).toEqual([{ dayIndex: 2, kind: "road_delay", affectedGuests: group.length }]);
    expect(surpriseRadio(closed.surpriseLog[0]).radio).toContain(`${group.length} skiers rolled in`);
  });

  it("keeps former regulars to ordinary midweek and the road delay to cold weather", () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const [dayIndex, weather] of [[6, "snow"], [23, "clear"], [2, "thaw"]] as const satisfies [number, WeatherKind][]) {
        const { surprise } = arrangeSurprise({ calendar, dayIndex, seasonSeed: mix32(seed), weather, surpriseLog: [] }, guests);
        expect(surprise?.kind).not.toBe(dayIndex === 2 ? "road_delay" : "former_regulars");
      }
    }
  });

  it("defaults to a clean surprise record on saves created before surprises", () => {
    const { surprise, surpriseLog, ...old } = toPersisted(createBuiltHill());
    expect({ surprise, surpriseLog }).toEqual({ surprise: null, surpriseLog: [] });
    expect(migrate(old, SAVE_VERSION)).toMatchObject({ reset: false, state: { surprise: null, surpriseLog: [] } });
  });

  it("enforces weekly and threat pacing caps and skips school bus day", () => {
    const log = [
      { dayIndex: 2, kind: "pie" as const, affectedGuests: 0 },
      { dayIndex: 3, kind: "road_delay" as const, affectedGuests: 2 },
    ];
    expect(arrangeSurprise({ calendar, dayIndex: 4, seasonSeed: mix32(seedFor("pie")), weather: "clear", surpriseLog: log }, guests).surprise).toBeNull();
    expect(arrangeSurprise({ calendar, dayIndex: 5, seasonSeed: mix32(seedFor("road_delay")), weather: "clear", surpriseLog: [log[1]] }, guests).surprise).toBeNull();
    expect(arrangeSurprise({ calendar, dayIndex: 2, seasonSeed: mix32(seedFor("pie")), weather: "clear", surpriseLog: [], schoolBookedDay: 2 }, guests).surprise).toBeNull();
  });

  it("triggers DH4 thaw_ice, DH5 snow_day on quiet Friday, DH9 january_thaw, DH10 dot_call, DH11 skin_tracks, and DH12 dry_week branch", () => {
    // DH4: clear day after thaw with >=2 icy lower segments
    const thawIce = arrangeSurprise({
      calendar: DUTCH_HILL_CALENDAR,
      dayIndex: 9, // Sat
      seasonSeed: mix32(7),
      weather: "clear",
      yesterdayWeather: "thaw",
      icyLowerSegments: 2,
      surpriseLog: [],
    }, guests);
    expect(thawIce.surprise?.kind).toBe("thaw_ice");
    expect(resolveSurprise(thawIce.surprise, guests)).toEqual({ dayIndex: 9, kind: "thaw_ice", affectedGuests: 0 });

    // DH5: Snow day on non-holiday Friday storm with holiday guest mix
    let snowDaySeed = -1;
    for (let s = 0; s < 500; s++) {
      const res = arrangeSurprise({
        calendar: DUTCH_HILL_CALENDAR,
        dayIndex: 8, // Fri week 2
        seasonSeed: mix32(s),
        weather: "storm",
        surpriseLog: [],
      }, guests);
      if (res.surprise?.kind === "snow_day") {
        snowDaySeed = s;
        expect(res.guests.length).toBeGreaterThan(guests.length);
        break;
      }
    }
    expect(snowDaySeed).toBeGreaterThanOrEqual(0);

    // DH9: January thaw ahead
    const weatherDays: DayWeather[] = Array.from({ length: 42 }, (_, i) => ({
      kind: i === 8 || i === 9 ? "thaw" : "clear",
      wind: "calm",
    }));
    const janThaw = arrangeSurprise({
      calendar: DUTCH_HILL_CALENDAR,
      dayIndex: 8,
      seasonSeed: mix32(7),
      weather: "clear",
      weatherDays,
      surpriseLog: [],
    }, guests);
    expect(janThaw.surprise?.kind).toBe("january_thaw");

    // DH10: Grammy Dot calls in on Sunday when rep >= 60
    const dot = arrangeSurprise({
      calendar: DUTCH_HILL_CALENDAR,
      dayIndex: 10, // Sun
      seasonSeed: mix32(7),
      weather: "clear",
      reputation: 62,
      surpriseLog: [],
    }, guests);
    expect(dot.surprise?.kind).toBe("dot_call");

    // DH11: Skin tracks after storm with minimal service
    const skin = arrangeSurprise({
      calendar: DUTCH_HILL_CALENDAR,
      dayIndex: 9,
      seasonSeed: mix32(7),
      weather: "clear",
      yesterdayWeather: "storm",
      yesterdaySnow: "minimal",
      surpriseLog: [],
    }, guests);
    expect(skin.surprise?.kind).toBe("skin_tracks");

    // DH2 cheap fare flavor & DH12 guns branch
    expect(surpriseRadio({ dayIndex: 8, kind: "former_regulars", affectedGuests: 3 }, null, { fare: "cheap" }).radio).toContain("six dollars");
    expect(dryWeekRadio(0)).toContain("no snow guns yet");
    expect(dryWeekRadio(1)).toContain("Snow guns need cold air");
  });
});
