import { describe, expect, it } from "vitest";
import { createRng, mix32 } from "./rng";
import { pickFounder } from "./rules";
import { createInitialGuests, planArrivals } from "./sim";
import { createInitialState } from "./state";
import type { WeatherKind } from "./types";
import { chainRow, generateSeasonWeather, outlookFor } from "./weather";

const KINDS: WeatherKind[] = ["clear", "snow", "storm", "thaw"];
const WINTER_DAYS = 28;
const probabilitySum = (row: Record<WeatherKind, number>) =>
  Object.values(row).reduce((sum, value) => sum + value, 0);

describe("season weather", () => {
  it("generates the same full calendar for the same seed", () => {
    const weather = generateSeasonWeather(7, WINTER_DAYS);
    expect(weather).toHaveLength(WINTER_DAYS);
    expect(generateSeasonWeather(7, WINTER_DAYS)).toEqual(weather);
    expect(generateSeasonWeather(8, WINTER_DAYS)).not.toEqual(weather);
  });

  it("keeps probabilities normalized and makes late thaws more likely", () => {
    for (const previous of KINDS) {
      for (let day = 1; day <= WINTER_DAYS; day++) {
        expect(probabilitySum(chainRow(previous, day))).toBeCloseTo(1, 12);
      }
      expect(chainRow(previous, 1).thaw).toBeLessThan(chainRow(previous, 10).thaw);
      expect(chainRow(previous, 28).thaw).toBeGreaterThan(chainRow(previous, 10).thaw);
    }
  });

  it("produces occasional storms and clusters thaws over 2,000 winters", () => {
    const winters = 2_000;
    let storms = 0;
    let thaws = 0;
    let thawRuns = 0;
    let sustainedThaws = 0;
    for (let seed = 0; seed < winters; seed++) {
      let run = 0;
      let longest = 0;
      let previous: WeatherKind = "clear";
      for (const { kind } of generateSeasonWeather(seed, WINTER_DAYS)) {
        if (kind === "storm") {
          storms++;
          expect(previous).not.toBe("storm");
        }
        if (kind === "thaw") {
          thaws++;
          if (run === 0) thawRuns++;
          run++;
          longest = Math.max(longest, run);
        } else {
          run = 0;
        }
        previous = kind;
      }
      if (longest >= 3) sustainedThaws++;
    }
    const days = winters * WINTER_DAYS;
    expect(storms / days).toBeGreaterThanOrEqual(0.05);
    expect(storms / days).toBeLessThanOrEqual(0.09);
    expect(thaws / days).toBeGreaterThanOrEqual(0.24);
    expect(thaws / days).toBeLessThanOrEqual(0.30);
    expect(thaws / thawRuns).toBeGreaterThanOrEqual(1.6);
    expect(thaws / thawRuns).toBeLessThanOrEqual(2.0);
    expect(sustainedThaws / winters).toBeGreaterThan(0.5);
  });

  it("starts a winter without using the RNG reserved for arrivals and guests", () => {
    const initial = createInitialState(7);
    const started = pickFounder(initial, "elena");
    const rng = createRng(initial.rngState);
    const rand = () => rng.next();
    const arrivals = planArrivals({
      dayIndex: 1,
      fare: initial.fare,
      snowQuality: initial.snowQuality,
      weather: started.weather,
      buildings: initial.buildings,
      talentsOwned: [],
      founderId: "elena",
      rand,
    });
    expect(started.seasonSeed).toBe(mix32(initial.rngState));
    expect(started.weatherDays).toEqual(generateSeasonWeather(started.seasonSeed, started.weatherDays.length));
    expect(started.weather).toBe(started.weatherDays[0].kind);
    expect(started.guests).toEqual(createInitialGuests(arrivals, rand, false));
    expect(started.rngState).toBe(rng.state());
  });
});

describe("weather outlook", () => {
  it("blends current-day odds with tomorrow's signal", () => {
    const state = pickFounder(createInitialState(7), "elena");
    const outlook = outlookFor(state, 1)!;
    const tomorrow = state.weatherDays[1].kind;
    const chain = chainRow(state.weather, 2);
    expect(probabilitySum(outlook)).toBeCloseTo(1, 12);
    expect(outlook[tomorrow]).toBeGreaterThanOrEqual(0.5);
    for (const kind of KINDS) {
      expect(outlook[kind]).toBeCloseTo(0.5 * chain[kind] + (tomorrow === kind ? 0.5 : 0), 12);
    }
    expect(outlookFor(state, 2)).toBeNull();
    expect(outlookFor({ ...state, dayIndex: state.weatherDays.length }, 1)).toBeNull();
  });

  it("gives Amira a stronger signal and an extra forecast day", () => {
    const state = pickFounder(createInitialState(7), "amira");
    expect(outlookFor(state, 1)![state.weatherDays[1].kind]).toBeGreaterThanOrEqual(0.7);
    const dayTwo = outlookFor(state, 2)!;
    expect(probabilitySum(dayTwo)).toBeCloseTo(1, 12);
    const firstLeg = chainRow(state.weather, 2);
    for (const kind of KINDS) {
      const twoStep = KINDS.reduce((sum, prev) => sum + firstLeg[prev] * chainRow(prev, 3)[kind], 0);
      expect(dayTwo[kind]).toBeCloseTo(0.6 * twoStep + (kind === state.weatherDays[2].kind ? 0.4 : 0), 12);
    }
    expect(outlookFor({ ...state, dayIndex: state.weatherDays.length - 1 }, 2)).toBeNull();
  });
});
