import { NO_FOUNDER_MODS, founderById } from "./content";
import type { DayWeather, FounderDef, FounderId, WeatherKind } from "./types";

/**
 * Founder modifiers (see SIMULATION_SPEC, Founder modifiers). Every function takes the
 * founder id (null before the pick) and returns the neutral value for no founder.
 */

export function founderMods(id: string | null): Omit<FounderDef, "id" | "name" | "title" | "relationship" | "bonus" | "constraint"> {
  return founderById(id) ?? NO_FOUNDER_MODS;
}

const WARM_WEEK = { windowDays: 7, thawDays: 3 } as const;

/** Today must be a thaw, and the seven-day window includes today. */
export function isWarmWeek(weather: WeatherKind, weatherDays: readonly DayWeather[], dayIndex: number): boolean {
  if (weather !== "thaw") return false;
  const recent = weatherDays.slice(Math.max(0, dayIndex - WARM_WEEK.windowDays), dayIndex);
  return recent.filter(day => day.kind === "thaw").length >= WARM_WEEK.thawDays;
}

/** Arrival mood this founder loses today to a warm week. */
export function warmWeekPenalty(
  state: { founderId: FounderId | null; weather: WeatherKind; weatherDays: readonly DayWeather[]; dayIndex: number },
): number {
  const penalty = founderMods(state.founderId).warmWeekMoodPenalty;
  return penalty && isWarmWeek(state.weather, state.weatherDays, state.dayIndex) ? penalty : 0;
}

/** Winter loan rate: the bank's rate plus the founder's change. */
export function loanRateFor(founderId: FounderId | null, baseRate: number): number {
  return Math.round((baseRate + founderMods(founderId).loanRateDelta) * 10_000) / 10_000;
}

/** Cost of a day's lift operations after the founder's overnight repair crew. */
export function liftOpsAfterRepair(founderId: FounderId | null, cost: number): number {
  return Math.round(cost * (1 - founderMods(founderId).liftOpsDiscount));
}

/** Reputation added each night, before rounding. */
export function reputationDriftFor(founderId: FounderId | null): number {
  return founderMods(founderId).reputationDrift;
}

/** A clearing price (lift corridor or trail) after the founder's multiplier, rounded to the nearest $50 when asked. */
export function clearingCostFor(founderId: FounderId | null, cost: number, roundTo = 1): number {
  const percent = Math.round(founderMods(founderId).clearingCostMult * 100);
  return Math.round(cost * percent / (100 * roundTo)) * roundTo;
}

export function apresRevenueFor(founderId: FounderId | null, revenue: number): number {
  return revenue * founderMods(founderId).apresRevenueMult;
}

/**
 * Whether the founder allows this building to be removed.
 */
export function canDemolish(
  state: { founderId: FounderId | null },
  building: string,
): boolean {
  return !founderMods(state.founderId).lockedBuildings.some(id => id === building);
}

/** Riley cannot sell equity to SummitLink. The SummitLink offer (row 23) reads this. */
export function canTakeSummitLinkEquity(state: { founderId: string | null }): boolean {
  return !founderMods(state.founderId).noSummitLinkEquity;
}
