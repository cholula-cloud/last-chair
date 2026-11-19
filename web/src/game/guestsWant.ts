import type { NightRecap } from "./sim";
import type { GameState } from "./state";

/** What the day looked like beyond the recap's own numbers. */
export type DemandContext = {
  liftCount: number;
  greenTrailCount: number;
  /** Runs skied today on green trails. */
  greenRuns: number;
  /** Game minutes the lodge seats were full today. */
  seatsFullMin: number;
};

/** A demand shows only when its pain reaches this many points (or the equivalent for seats). */
export const DEMAND_MIN_POINTS = 2;
/** Minutes of a full lodge that count as two points. */
const SEATS_FULL_PER_POINT = 20;
/** Runs per green trail beyond which beginner terrain counts as crowded. */
const GREEN_CROWDED_RUNS = 25;

export type Demand = { key: "lines" | "seats" | "green" | "snow"; points: number; line: string };

function lineText(recap: Pick<NightRecap, "facts">, liftCount: number): string {
  const busiest = recap.facts.busiestLift;
  const minutes = Math.max(1, Math.floor(busiest ? busiest.min : recap.facts.avgWaitMin));
  if (liftCount <= 1) return `Guests want a second lift. Lines ran over ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
  return `Guests want shorter lift lines. ${busiest?.label ?? "One lift"} ran over ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
}

/**
 * One sentence naming the top unmet demand of the day, or null when nothing is pressing.
 * Pain is read from the same satisfaction terms the "Why?" list shows (`why.ts`).
 */
export function topGuestDemand(
  recap: Pick<NightRecap, "breakdown" | "facts">,
  ctx: DemandContext,
): Demand | null {
  const demands: Demand[] = [];
  demands.push({ key: "lines", points: -recap.breakdown.queue, line: lineText(recap, ctx.liftCount) });
  demands.push({
    key: "seats",
    points: ctx.seatsFullMin / SEATS_FULL_PER_POINT,
    line: "Guests want more seats at the lodge.",
  });
  const greenCrowded =
    ctx.greenTrailCount > 0 && ctx.greenRuns / ctx.greenTrailCount >= GREEN_CROWDED_RUNS;
  if (greenCrowded) {
    demands.push({ key: "green", points: Math.max(-recap.breakdown.runs, DEMAND_MIN_POINTS), line: "Guests want another green trail." });
  }
  demands.push({
    key: "snow",
    points: -recap.breakdown.snow,
    line: `Guests want better snow. Cover was ${recap.facts.snowLabel.toLowerCase()}.`,
  });
  const top = demands
    .filter((d) => d.points >= DEMAND_MIN_POINTS)
    .sort((a, b) => b.points - a.points)[0];
  return top ?? null;
}

export function guestsWantLine(recap: Pick<NightRecap, "breakdown" | "facts">, ctx: DemandContext): string | null {
  return topGuestDemand(recap, ctx)?.line ?? null;
}

/** Reads the day's context from the game state at closing time. */
export function demandContext(state: Pick<GameState, "lifts" | "trails" | "dayStats">): DemandContext {
  let greenTrailCount = 0;
  let greenRuns = 0;
  state.trails.forEach((trail, i) => {
    if (trail.difficulty === "green") {
      greenTrailCount += 1;
      greenRuns += state.dayStats.runsByTrail[i] ?? 0;
    }
  });
  return {
    liftCount: state.lifts.filter((lift) => lift.confirmed).length,
    greenTrailCount,
    greenRuns,
    seatsFullMin: state.dayStats.seatsFullMin,
  };
}
