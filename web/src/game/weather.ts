import { STREAM, streamFor } from "./rng";
import type { GameState } from "./state";
import { LIFT_SPECS, type DayWeather, type LiftType, type Outlook, type WeatherKind, type Wind } from "./types";

export type { DayWeather, Outlook } from "./types";

export const WEATHER_KINDS = ["clear", "snow", "storm", "thaw"] as const;
const TRANSITIONS: Record<WeatherKind, readonly [number, number, number, number]> = {
  clear: [0.45, 0.25, 0.08, 0.22],
  snow: [0.40, 0.30, 0.10, 0.20],
  storm: [0.55, 0.25, 0.00, 0.20],
  thaw: [0.35, 0.15, 0.05, 0.45],
};

type CalendarDef = {
  earlyThrough: number;
  lateFrom: number;
};
export const DUTCH_HILL_CALENDAR: CalendarDef = { earlyThrough: 9, lateFrom: 20 };

export function chainRow(prev: WeatherKind, day: number, calendar = DUTCH_HILL_CALENDAR): Outlook {
  const [clear, snow, storm, thaw] = TRANSITIONS[prev];
  const thawInSeason = thaw * (day <= calendar.earlyThrough ? 0.7 : day >= calendar.lateFrom ? 1.3 : 1);
  const total = clear + snow + storm + thawInSeason;
  return { clear: clear / total, snow: snow / total, storm: storm / total, thaw: thawInSeason / total };
}

function drawKind(row: Outlook, unit: number): WeatherKind {
  let running = 0;
  for (const kind of WEATHER_KINDS) {
    running += row[kind];
    if (unit < running) return kind;
  }
  return "thaw";
}

function buildSchedule(seasonSeed: number, length: number, calendar: CalendarDef, past: readonly DayWeather[]) {
  const rng = streamFor(seasonSeed, STREAM.WEATHER);
  let prev: WeatherKind = "clear";
  return Array.from({ length }, (_, index): DayWeather => {
    const kind = drawKind(chainRow(prev, index + 1, calendar), rng.next());
    const chance = kind === "storm" ? 0.25 : kind === "clear" ? 0.12 : 0.05;
    const wind = rng.next() < chance ? "gusty" : "calm";
    const day = past[index] ?? { kind, wind };
    prev = day.kind;
    return day;
  });
}

export function generateSeasonWeather(seasonSeed: number, length: number, calendar = DUTCH_HILL_CALENDAR): DayWeather[] {
  return buildSchedule(seasonSeed, length, calendar, []);
}

/** Older M3 saves know today's weather. Start the future chain from that observation. */
export function resumeSeasonWeather(seasonSeed: number, length: number, day: number, today: WeatherKind): DayWeather[] {
  const past = Array.from({ length: day }, (_, index): DayWeather => ({
    kind: index === day - 1 ? today : "clear",
    wind: "calm",
  }));
  return buildSchedule(seasonSeed, length, DUTCH_HILL_CALENDAR, past);
}

export function weatherForDay(state: Pick<GameState, "weatherDays" | "dayIndex">): DayWeather {
  return state.weatherDays[state.dayIndex - 1] ?? { kind: "clear", wind: "calm" };
}

type ForecastState = Pick<GameState, "weatherDays" | "dayIndex" | "seasonLength" | "founderId">;
export function outlookFor(state: ForecastState, ahead: 1 | 2): Outlook | null {
  const target = state.dayIndex + ahead;
  if (target > state.seasonLength || (ahead === 2 && state.founderId !== "amira")) return null;
  const actual = state.weatherDays[target - 1];
  if (!actual) return null;
  const base = chainRow(weatherForDay(state).kind, state.dayIndex + 1);
  const skill = ahead === 2 ? 0.4 : state.founderId === "amira" ? 0.7 : 0.5;
  const forecast: Outlook = { clear: 0, snow: 0, storm: 0, thaw: 0 };
  for (const kind of WEATHER_KINDS) {
    const prior = ahead === 1 ? base[kind] : WEATHER_KINDS.reduce((sum, previous) =>
      sum + base[previous] * chainRow(previous, target)[kind], 0);
    forecast[kind] = (1 - skill) * prior + (kind === actual.kind ? skill : 0);
  }
  return forecast;
}

export const WIND_HOLD = { fromMin: 630, toMin: 780 } as const;

const SHORT_HOLD = { fromMin: 660, toMin: 735 } as const;
export function windHoldWindow(owned: readonly string[]) {
  return owned.includes("wind_hold") ? SHORT_HOLD : WIND_HOLD;
}

export function isWindHeld(type: LiftType, wind: Wind, clockMin: number, owned: readonly string[] = []): boolean {
  const hold = windHoldWindow(owned);
  return wind === "gusty" && LIFT_SPECS[type].windHold &&
    clockMin >= hold.fromMin && clockMin < hold.toMin;
}

export function morningWeatherHeadline(kind: WeatherKind): string {
  switch (kind) {
    case "snow": return "Overnight squall leaves fresh snow on the hill.";
    case "storm": return "An overnight storm buries the hill. Slow roads may keep skiers home.";
    case "thaw": return "Thaw watch. Lower trails soften by noon.";
    case "clear": return "Clear and cold. Groomed snow should hold.";
  }
}
