import type { DayWeather, WeatherKind } from "./types";

const WARM_WEEK = { windowDays: 7, thawDays: 3 } as const;

/** Today must be a thaw, and the seven-day window includes today. */
export function isWarmWeek(weather: WeatherKind, weatherDays: readonly DayWeather[], dayIndex: number): boolean {
  if (weather !== "thaw") return false;
  const recent = weatherDays.slice(Math.max(0, dayIndex - WARM_WEEK.windowDays), dayIndex);
  return recent.filter(day => day.kind === "thaw").length >= WARM_WEEK.thawDays;
}
