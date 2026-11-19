import { liquidNetWorth, payoffAmount } from "./economy";
import type { GameState } from "./state";

import { SCHOOL_BUS_PUPILS, type SchoolContract } from "./schoolContract";

export function schoolMemory(contract: SchoolContract | null): string {
  if (!contract) return "No Readsboro school visit is on record this winter.";
  if (contract.decision === "declined") return "Al offered a school day. You kept the tow open for the usual weekday crowd.";
  const taught = contract.pupilsTaught;
  if (taught === null) return "Al had a bus on the calendar. The winter ended before its visit.";
  if (taught === SCHOOL_BUS_PUPILS) return `Al took all ${taught} pupils home with a ski lesson behind them.`;
  if (taught === 0) return "Al booked a school day. The visit closed without a lesson for any pupil.";
  return `The Readsboro bus came. Of the ${SCHOOL_BUS_PUPILS} pupils booked, ${taught} finished a lesson.`;
}

export function winterScore(state: GameState) {
  const observed = state.seasonDays.filter(day => day.arrivals > 0);
  if (state.seasonDays.length !== state.dayIndex || !observed.length) return null;
  const satisfaction = observed.reduce((sum, day) => sum + day.satisfaction, 0) / observed.length;
  return { satisfaction, measuredDays: observed.length, total: Math.round((satisfaction + state.reputation) / 2) };
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
