import { BANKRUPTCY_MORNINGS, liquidNetWorth } from "./economy";
import { SCHOOL_BUS_PUPILS } from "./schoolContract";
import type { GameState } from "./state";

export type GoalChip = {
  id: "lodge" | "bus" | "solvent";
  /** Short chip label. */
  label: string;
  done: boolean;
  /** One sentence shown when the chip is tapped. */
  explainer: string;
};

type GoalState = Pick<
  GameState,
  "lodgeTier" | "schoolContract" | "outcome" | "cash" | "loan" | "payables"
>;

/**
 * The winter's goal on Dutch Hill: finish solvent (the same formula as the winter review), plus
 * lodge Tier 2 and the optional Readsboro school visit that Tier 2 makes possible.
 */
export function goalChips(state: GoalState): GoalChip[] {
  const lodge = state.lodgeTier >= 2;
  const contract = state.schoolContract;
  const bus = contract?.decision === "accepted" && contract.pupilsTaught !== null && contract.pupilsTaught > 0;
  const solvent = state.outcome !== "bankrupt" && liquidNetWorth(state) >= 0;
  let busExplainer = "Reach the school bus beat on the radio.";
  if (contract?.decision === "accepted" && contract.pupilsTaught !== null) {
    busExplainer = `${contract.pupilsTaught} of ${SCHOOL_BUS_PUPILS} visiting pupils finished a lesson.`;
  }
  else if (contract?.decision === "declined") busExplainer = "You declined the Readsboro school visit.";
  else if (contract?.decision === "accepted") busExplainer = `The school bus comes on day ${contract.day}.`;
  return [
    {
      id: "lodge",
      label: "Lodge Tier 2",
      done: lodge,
      explainer: lodge ? "The lodge is Tier 2." : "Upgrade the lodge to Tier 2 from the Build sheet.",
    },
    {
      id: "bus",
      label: "Optional school visit",
      done: bus,
      explainer: busExplainer,
    },
    {
      id: "solvent",
      label: "Solvent",
      done: solvent,
      explainer: solvent
        ? "You have enough cash to cover your loan and unpaid construction. Keep the bills covered through the last day."
        : `Cash minus loans and unpaid construction is below zero. ${BANKRUPTCY_MORNINGS} mornings below zero end the winter.`,
    },
  ];
}

/** "12 days left." The current day counts as a day left. */
export function daysLeftLine(dayIndex: number, seasonLength: number): string {
  const left = Math.max(0, seasonLength - dayIndex + 1);
  return left === 1 ? "1 day left." : `${left} days left.`;
}
