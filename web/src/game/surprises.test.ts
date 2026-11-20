import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { DUTCH_HILL_CALENDAR_LEGACY } from "./calendar";
import { migrate } from "./migrations";
import { acknowledgeBeat, pickFounder, skipToClose, sleep, tick } from "./rules";
import { createRng, mix32 } from "./rng";
import { createInitialGuests } from "./sim";
import { SAVE_VERSION, toPersisted, type GameState } from "./state";
import { arrangeSurprise, surpriseRadio, type SurpriseKind } from "./surprises";
import { MS_PER_GAME_MINUTE, type WeatherKind } from "./types";

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
});
