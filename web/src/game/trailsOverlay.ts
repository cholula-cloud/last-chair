import { liftLineOf } from "./rules";
import type { GameState } from "./state";
import type { XZ } from "./terrain";
import type { Difficulty, TrailRun } from "./trails";
import { onLease } from "./lease";
import { segmentAt } from "./mapLayers";

export const TRAIL_LAYER_COLOR: Record<Difficulty, string> = {
  green: "#2e9a5f",
  blue: "#2f78d6",
  black: "#3a3956",
};

export function openTrailRuns(state: GameState): TrailRun[] {
  return state.trails.filter((t) => t.open && state.lifts[t.liftIndex]?.confirmed);
}

export function trailsOnLift(state: GameState, liftIndex: number): TrailRun[] {
  return openTrailRuns(state).filter((t) => t.liftIndex === liftIndex);
}

export function trailMidpoint(trail: TrailRun): XZ {
  const path = trail.path;
  if (path.length < 2) return path[0] ?? { x: 0, z: 0 };
  const mid = path[Math.floor(path.length / 2)];
  return { x: mid.x, z: mid.z };
}

export function liftUnloadAt(state: GameState, liftIndex: number): XZ {
  const lift = state.lifts[liftIndex];
  if (!lift?.confirmed) return { x: 0, z: 0 };
  return liftLineOf(lift).top;
}

export function trailReadout(
  state: GameState,
  point: XZ,
): { headline: string; chips: string[] } {
  if (!onLease(point)) {
    return { headline: "Outside the lease.", chips: [] };
  }
  const hit = segmentAt(state.trails, point);
  if (!hit) {
    return { headline: "Tap a trail corridor for its name.", chips: [] };
  }
  const trail = state.trails[hit.index];
  return {
    headline: `${trail.name} is a ${trail.difficulty} run.`,
    chips: [`${Math.round(trail.lengthFt)} ft`, `Lift ${trail.liftIndex + 1}`],
  };
}