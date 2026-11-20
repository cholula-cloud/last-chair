import { liquidNetWorth } from "./economy";
import { schoolContractOfferDay } from "./rules";
import { SCHOOL_BUS_PUPILS } from "./schoolContract";
import type { GameState } from "./state";

export type GoalChip = {
  id: "lodge" | "bus" | "solvent";
  label: string;
  status: "Done" | "On track" | "At risk" | "To do" | "Missed" | "Declined" | "Booked";
  explainer: string;
};

export function goalInputs(state: GameState) {
  return {
    lodgeTier: state.lodgeTier,
    schoolContract: state.schoolContract,
    schoolEligible: state.outcome === "playing" && schoolContractOfferDay(state) !== null,
    netWorth: liquidNetWorth(state),
    outcome: state.outcome,
  };
}

export function goalChips(state: ReturnType<typeof goalInputs>): GoalChip[] {
  const settled = state.outcome !== "playing";
  const lodge = state.lodgeTier >= 2;
  const chips: GoalChip[] = [{
    id: "lodge",
    label: "Lodge Tier 2",
    status: lodge ? "Done" : settled ? "Missed" : "To do",
    explainer: lodge ? `Lodge Tier ${state.lodgeTier} is open.` : settled ? "Winter ended at Lodge Tier 1." : "Upgrade to Tier 2 in Build to unlock chairlifts, ski school, and more parking.",
  }];
  const contract = state.schoolContract;
  if (contract || state.schoolEligible) {
    let status: GoalChip["status"] = "To do";
    let explainer = "Watch Route 100 Radio for Al Waters to call about the Readsboro school bus.";
    if (contract?.decision === "declined") {
      status = "Declined";
      explainer = "You passed on the Readsboro school visit.";
    } else if (contract?.decision === "accepted") {
      if (contract.pupilsTaught !== null) {
        status = contract.pupilsTaught > 0 ? "Done" : "Missed";
        explainer = `${contract.pupilsTaught} of ${SCHOOL_BUS_PUPILS} Readsboro kids finished a lesson.`;
      } else {
        status = settled ? "Missed" : "Booked";
        explainer = settled ? "Winter ended before the school bus arrived." : `The Readsboro bus arrives on day ${contract.day}.`;
      }
    }
    chips.push({ id: "bus", label: "Optional school visit", status, explainer });
  }
  const solvent = state.netWorth >= 0;
  const met = state.outcome === "finished" && solvent;
  chips.push({
    id: "solvent", label: "Finish solvent",
    status: settled ? (met ? "Done" : "Missed") : (solvent ? "On track" : "At risk"),
    explainer: settled
      ? (met ? "Finished in the black with all loans and construction covered." : state.outcome === "bankrupt" ? "The bank called your loan before winter ended." : "Closing cash fell short of your loan and unpaid construction.")
      : (solvent ? "Cash covers your loan and unpaid construction bills." : "Loan and construction bills exceed cash right now. Build ticket revenue."),
  });
  return chips;
}

/** The current day counts until the winter settles. */
export function daysLeftLine(dayIndex: number, seasonLength: number, settled = false): string {
  const left = settled ? 0 : Math.max(0, seasonLength - dayIndex + 1);
  return left === 1 ? "1 day left." : `${left} days left.`;
}
