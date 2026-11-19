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
    explainer: lodge ? `The lodge reached Tier ${state.lodgeTier}.` : settled ? "The winter ended at Tier 1." : "Upgrade the lodge to Tier 2 from the Build sheet.",
  }];
  const contract = state.schoolContract;
  if (contract || state.schoolEligible) {
    let status: GoalChip["status"] = "To do";
    let explainer = "Reach the school bus beat on the radio.";
    if (contract?.decision === "declined") {
      status = "Declined";
      explainer = "You declined the Readsboro school visit.";
    } else if (contract?.decision === "accepted") {
      if (contract.pupilsTaught !== null) {
        status = contract.pupilsTaught > 0 ? "Done" : "Missed";
        explainer = `${contract.pupilsTaught} of ${SCHOOL_BUS_PUPILS} visiting pupils finished a lesson.`;
      } else {
        status = settled ? "Missed" : "Booked";
        explainer = settled ? "The winter ended before the booked visit." : `The school bus comes on day ${contract.day}.`;
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
      ? (met ? "You finished with enough cash to cover your loan and unpaid construction." : state.outcome === "bankrupt" ? "The bank called before the winter could finish solvent." : "Your loan and unpaid construction exceeded your closing cash.")
      : (solvent ? "Your cash covers your loan and unpaid construction today." : "Your loan and unpaid construction exceed your cash today."),
  });
  return chips;
}

/** The current day counts until the winter settles. */
export function daysLeftLine(dayIndex: number, seasonLength: number, settled = false): string {
  const left = settled ? 0 : Math.max(0, seasonLength - dayIndex + 1);
  return left === 1 ? "1 day left." : `${left} days left.`;
}
