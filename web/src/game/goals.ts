import { liquidNetWorth } from "./economy";
import { operatingDaysLeft, seasonCalendar, type MountainId } from "./calendar";
import { schoolContractOfferDay } from "./rules";
import { SCHOOL_BUS_PUPILS } from "./schoolContract";
import { operatingGoals } from "./winterArc";
import type { GameState } from "./state";

export type GoalChip = {
  id: "lodge" | "bus" | "solvent" | "lights" | "ridge" | "orchard" | "saturday";
  label: string;
  status: "Done" | "On track" | "At risk" | "To do" | "Missed" | "Declined" | "Booked";
  explainer: string;
};

export function goalInputs(state: GameState) {
  return {
    mountainId: state.mountainId,
    lodgeTier: state.lodgeTier,
    schoolContract: state.schoolContract,
    schoolEligible: state.outcome === "playing" && schoolContractOfferDay(state) !== null,
    netWorth: liquidNetWorth(state),
    outcome: state.outcome,
    nightLights: state.nightLights,
    reputation: state.reputation,
    mtShuttleDecision: state.mtShuttleDecision,
    orchardParcel: state.orchardParcel,
    schoolProgramProven: state.schoolProgramProven,
    vacationDay: operatingGoals(seasonCalendar(state), state.dayHistory).vacationDay,
    assets: state.assets,
  };
}

export function goalChips(state: ReturnType<typeof goalInputs>): GoalChip[] {
  const settled = state.outcome !== "playing";
  const lodge = state.lodgeTier >= 2;
  const chips: GoalChip[] = [{
    id: "lodge",
    label: "Lodge Tier 2",
    status: lodge ? "Done" : settled ? "Missed" : "To do",
    explainer: lodge ? `Lodge Tier ${state.lodgeTier} is open.` : settled ? "Winter ended at Lodge Tier 1." : "Upgrade to Tier 2 in Build to unlock chairlifts, ski school, and a higher daily skier cap.",
  }];
  const contract = state.schoolContract;
  if (contract || state.schoolEligible) {
    let status: GoalChip["status"] = "To do";
    let explainer = "Watch Route 100 Radio for Hank Pelletier to call about the Readsboro school bus.";
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
      ? (met ? "Finished in the black with all winter bills and loans covered." : state.outcome === "bankrupt" ? "The bank called your loan before winter ended." : "Closing cash fell short of your winter loan.")
      : (solvent ? "Cash covers your winter loan and open bills." : "Loan balance exceeds cash right now. Build ticket revenue."),
  });
  return chips;
}

/** Three hill-tailored winter ribbons for the Punch Card and Winter Review. */
export function winterRibbons(state: GameState): GoalChip[] {
  const inputs = goalInputs(state);
  const settled = inputs.outcome !== "playing";
  const solvent = inputs.netWorth >= 0;
  const metSolvent = inputs.outcome === "finished" && solvent;
  const solventRibbon: GoalChip = {
    id: "solvent",
    label: "Lights stayed on",
    status: settled ? (metSolvent ? "Done" : "Missed") : (solvent ? "On track" : "At risk"),
    explainer: metSolvent ? "Finished the winter solvent." : "Keep net worth nonnegative through closing.",
  };

  const mountainId: MountainId = state.mountainId;
  if (mountainId === "mount_tom") {
    const lightsDone = Boolean(state.nightLights);
    const ridgeDone = state.reputation >= 60 || state.mtShuttleDecision === "declined";
    return [
      solventRibbon,
      {
        id: "lights",
        label: "Range lights",
        status: lightsDone ? "Done" : settled ? "Missed" : "To do",
        explainer: lightsDone ? "Holyoke ridge lights lit up the valley." : "Wire range lights in Office or Snow & Service.",
      },
      {
        id: "ridge",
        label: "Hold the ridge",
        status: ridgeDone ? "Done" : settled ? "Missed" : "To do",
        explainer: ridgeDone ? "Held Mount Tom's reputation and parking independence." : "Reach rep 60 or decline the Whiterock shuttle.",
      },
    ];
  }

  if (mountainId === "maple_valley") {
    const schoolDone = Boolean(state.schoolProgramProven || (state.schoolContract?.decision === "accepted" && (state.schoolContract.pupilsTaught ?? 0) > 0));
    const orchardDone = state.orchardParcel === "owned";
    return [
      solventRibbon,
      {
        id: "bus",
        label: "Windham school",
        status: schoolDone ? "Done" : settled ? "Missed" : "To do",
        explainer: schoolDone ? "Windham district buses brought local kids to the slope." : "Open a ski school at Tier 2 for the district bus.",
      },
      {
        id: "orchard",
        label: "Save orchard",
        status: orchardDone ? "Done" : state.orchardParcel === "whiterock" || settled ? "Missed" : "To do",
        explainer: orchardDone ? "Kept the Maple Valley apple orchard in town hands." : "Outbid Whiterock for the orchard parcel.",
      },
    ];
  }

  // Dutch Hill: Solvency + Lodge/School + Smooth Saturday
  const baseChips = goalChips(inputs);
  const middle = baseChips.find((c) => c.id === "bus") ?? baseChips.find((c) => c.id === "lodge")!;
  const satDone = inputs.vacationDay !== null;
  const smoothSat: GoalChip = {
    id: "saturday",
    label: "Smooth Saturday",
    status: satDone ? "Done" : settled ? "Missed" : "To do",
    explainer: satDone ? "Ran a profitable holiday Saturday under a 5 min wait." : "Turn a profit on a holiday Saturday with waits under 5 min.",
  };
  return [solventRibbon, middle, smoothSat];
}

/** Legacy: consecutive civil days. Prefer operatingDaysLeftLine for the operating calendar. */
export function daysLeftLine(dayIndex: number, seasonLength: number, settled = false): string {
  const left = settled ? 0 : Math.max(0, seasonLength - dayIndex + 1);
  return left === 1 ? "1 day left." : `${left} days left.`;
}

export function operatingDaysLeftLine(
  state: Pick<import("./state").GameState, "mountainId" | "seasonLength" | "dayIndex" | "outcome">,
  settled = false,
): string {
  const cal = seasonCalendar(state);
  const left = settled || state.outcome !== "playing" ? 0 : operatingDaysLeft(cal, state.dayIndex);
  return left === 1 ? "1 open day left." : `${left} open days left.`;
}
