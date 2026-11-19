import { liquidNetWorth, payoffAmount } from "./economy";
import type { GameState } from "./state";

import { SCHOOL_BUS_PUPILS, type SchoolContract } from "./schoolContract";

export function schoolMemory(contract: SchoolContract | null): string {
  if (!contract) return "Readsboro and Dutch Hill never settled on a school visit this winter.";
  if (contract.decision === "declined") return "Al offered a school day. You kept the tow open for the usual weekday crowd.";
  const taught = contract.pupilsTaught;
  if (taught === null) return "Al had a bus on the calendar. The winter ended before its visit.";
  if (taught === SCHOOL_BUS_PUPILS) return `Al took all ${taught} pupils home with a ski lesson behind them.`;
  if (taught === 0) return "Al booked a school day. The visit closed without a lesson for any pupil.";
  return `The Readsboro bus came. Of the ${SCHOOL_BUS_PUPILS} pupils Al brought, ${taught} finished a lesson.`;
}

/** A single settled winter, retained when the player replays in this slot. */
export function winterRecord(state: GameState) {
  return {
    day: state.dayIndex,
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
export type WinterRecord = ReturnType<typeof winterRecord>;
