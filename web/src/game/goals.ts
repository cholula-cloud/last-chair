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
    explainer: lodge ? `Lodge Tier ${state.lodgeTier} is up and running.` : settled ? "The winter ended with the lodge still at Tier 1." : "Upgrade the lodge to Tier 2 from the Build sheet. Bigger lodge, bigger crowds.",
  }];
  const contract = state.schoolContract;
  if (contract || state.schoolEligible) {
    let status: GoalChip["status"] = "To do";
    let explainer = "Listen for the school bus call on the radio.";
    if (contract?.decision === "declined") {
      status = "Declined";
      explainer = "You turned down the Readsboro school visit.";
    } else if (contract?.decision === "accepted") {
      if (contract.pupilsTaught !== null) {
        status = contract.pupilsTaught > 0 ? "Done" : "Missed";
        explainer = `${contract.pupilsTaught} of ${SCHOOL_BUS_PUPILS} Readsboro pupils finished a lesson.`;
      } else {
        status = settled ? "Missed" : "Booked";
        explainer = settled ? "The winter ended before the bus showed up." : `The Readsboro bus pulls in on day ${contract.day}.`;
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
      ? (met ? "You finished in the black. Cash covers the loan and any unpaid construction." : state.outcome === "bankrupt" ? "The bank came calling before the winter was over." : "The loan and unpaid construction came to more than your closing cash.")
      : (solvent ? "Cash covers your loan and unpaid construction today. Keep it that way." : "Your loan and unpaid construction add up to more than your cash right now. Get some guests in."),
  });
  return chips;
}

/** The current day counts until the winter settles. */
export function daysLeftLine(dayIndex: number, seasonLength: number, settled = false): string {
  const left = settled ? 0 : Math.max(0, seasonLength - dayIndex + 1);
  return left === 1 ? "1 day left." : `${left} days left.`;
}
