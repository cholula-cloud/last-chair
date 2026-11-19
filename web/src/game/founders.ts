import { NO_FOUNDER_MODS, founderById } from "./content";
import type { DayWeather, FounderDef, FounderId } from "./types";

/**
 * Founder modifiers (see SIMULATION_SPEC, Founder modifiers). Every function takes the
 * founder id (null before the pick) and returns the neutral value for no founder.
 */

export function founderMods(id: FounderId | null): Omit<FounderDef, "id" | "name" | "title" | "bonus" | "constraint"> {
  return founderById(id) ?? NO_FOUNDER_MODS;
}

/** Tom: a warm week is a thaw day with three or more thaw days in the last seven, today included. */
export const WARM_WEEK = { windowDays: 7, thawDays: 3 } as const;

export function isWarmWeek(weatherDays: readonly DayWeather[], dayIndex: number): boolean {
  if (weatherDays[dayIndex - 1]?.kind !== "thaw") return false;
  let thaw = 0;
  for (let day = Math.max(1, dayIndex - WARM_WEEK.windowDays + 1); day <= dayIndex; day++) {
    if (weatherDays[day - 1]?.kind === "thaw") thaw++;
  }
  return thaw >= WARM_WEEK.thawDays;
}

/** Arrival mood this founder loses today to a warm week. */
export function warmWeekPenalty(
  state: { founderId: FounderId | null; weatherDays: readonly DayWeather[]; dayIndex: number },
): number {
  return isWarmWeek(state.weatherDays, state.dayIndex) ? founderMods(state.founderId).warmWeekMoodPenalty : 0;
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
  const scaled = cost * founderMods(founderId).clearingCostMult;
  return Math.round(scaled / roundTo) * roundTo;
}

export function apresRevenueFor(founderId: FounderId | null, revenue: number): number {
  return revenue * founderMods(founderId).apresRevenueMult;
}

/**
 * Demolition lock. No demolish action exists yet; the demolition feature (row Q9)
 * must call this before it removes a building.
 */
export function canDemolish(
  state: { founderId: FounderId | null },
  building: FounderDef["lockedBuildings"][number],
): boolean {
  return !founderMods(state.founderId).lockedBuildings.includes(building);
}

/** Riley cannot sell equity to SummitLink. The SummitLink offer (row 23) reads this. */
export function canTakeSummitLinkEquity(state: { founderId: FounderId | null }): boolean {
  return !founderMods(state.founderId).noSummitLinkEquity;
}
