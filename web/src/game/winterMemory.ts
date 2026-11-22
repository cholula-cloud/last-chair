import { operatingDayIndex, operatingSeasonLength, seasonCalendar } from "./calendar";
import { liquidNetWorth, payoffAmount } from "./economy";
import type { GameState } from "./state";

import { SCHOOL_BUS_PUPILS, type SchoolContract } from "./schoolContract";

export const FIRST_RIDE_TOAST = "First ride since 1985. Grammy Dot's card stays in your pocket till closing day.";
export const LAST_CHAIR_TOAST = "Last chair. That one's yours.";
export const LAST_CHAIR_MIN = 15 * 60 + 45;

export function isFinalOperatingDay(state: Pick<GameState, "mountainId" | "seasonLength" | "dayIndex">): boolean {
  const cal = seasonCalendar(state);
  return operatingDayIndex(cal, state.dayIndex) === operatingSeasonLength(cal);
}

export function punchCardOutcomeLine(outcome: "playing" | "finished" | "bankrupt", solvent: boolean): string {
  if (outcome === "bankrupt") return "Grammy Dot's card still has one ride on it. Keep it.";
  return solvent
    ? "Grammy Dot's card: punched."
    : "Punched. The bills outlasted the snow, but you rode it.";
}

export function schoolMemory(contract: SchoolContract | null): string {
  if (!contract) return "No Readsboro school visit this winter. Hank Pelletier never called.";
  if (contract.decision === "declined") return "Hank offered a school day and you passed. The tow stayed open for the usual weekday crowd.";
  const taught = contract.pupilsTaught;
  if (taught === null) return "Hank had a bus on the calendar, and the winter ended before it could pull in.";
  if (taught === SCHOOL_BUS_PUPILS) return `All ${taught} Readsboro pupils went home with Arlberg turns behind them. Hank is telling people.`;
  if (taught === 0) return "The Readsboro bus came, but no pupil finished a lesson.";
  return `The Readsboro bus came. Of the ${SCHOOL_BUS_PUPILS} pupils on board, ${taught} finished a lesson.`;
}

type WinterScore = {
  satisfaction: number;
  /** Older settled scores used reputation on the final day of the winter. */
  averageReputation?: number;
  measuredDays: number;
  total: number;
};

export function winterScore(state: GameState): WinterScore | null {
  const observed = state.seasonDays.filter(day => day.arrivals > 0);
  if (state.seasonDays.length !== state.dayIndex || !observed.length) return null;
  const satisfaction = observed.reduce((sum, day) => sum + day.satisfaction, 0) / observed.length;
  let reputationSum = 0;
  for (const day of observed) {
    if (day.closingReputation === undefined) return null;
    reputationSum += day.closingReputation;
  }
  const averageReputation = reputationSum / observed.length;
  return { satisfaction, averageReputation, measuredDays: observed.length, total: Math.round((satisfaction + averageReputation) / 2) };
}

/** A single settled winter, retained when the player replays in this slot. */
export function winterRecord(state: GameState) {
  return {
    day: state.dayIndex,
    completedDays: state.dayIndex,
    goalMet: state.outcome === "finished" && liquidNetWorth(state) >= 0,
    score: winterScore(state),
    days: state.seasonDays,
    broadcasts: state.beatLog,
    moments: state.surpriseLog,
    talents: state.talentsOwned,
    reputation: state.reputation,
    founder: state.founderId,
    bankrupt: state.outcome === "bankrupt",
    cash: state.cash,
    loan: state.loan ? payoffAmount(state.loan) : 0,
    construction: state.payables.reduce((sum, item) => sum + item.amount, 0),
    netWorth: liquidNetWorth(state),
    school: state.schoolContract,
    summitLink: state.summitLinkDecision,
    localMoment: state.surpriseLog.at(-1) ?? null,
  };
}
// Winters closed before the daily operating record may only have a settlement.
type CurrentWinter = ReturnType<typeof winterRecord>;
type OriginalFields = "day" | "founder" | "bankrupt" | "cash" | "loan" | "construction" | "netWorth" | "school" | "summitLink" | "localMoment";
export type WinterRecord = Pick<CurrentWinter, OriginalFields> & Partial<Omit<CurrentWinter, OriginalFields>>;
