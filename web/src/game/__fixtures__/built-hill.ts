import { placedAssetsFromLegacy } from "../base";
import { clearingCells } from "../clearing";
import { REFERENCE_TOPS } from "../descent";
import { STANDARD_BRUSH_WIDTH } from "../paintedTrail";
import { checkPaint, trailOptions } from "../rules";
import { averageTrail } from "../snow";
import { createInitialState, type GameState, type LiftSlot } from "../state";
import { defaultTrails, fallLineTrailForLift, type Difficulty, type TrailRun } from "../trails";

export function starterLifts(): LiftSlot[] {
  return [{ type: "surface", anchor: REFERENCE_TOPS[0], confirmed: true, queue: [], dispatchCredit: 0 }];
}

const corridor = (trail: TrailRun) => clearingCells(trail.path, trail.path.map(() => STANDARD_BRUSH_WIDTH));

/** Established hill used to isolate operations tests from the opening build. */
export function createBuiltHill(seed?: number): GameState {
  const trails = defaultTrails();
  return {
    ...createInitialState(seed), lifts: starterLifts(), trails, clearedCells: trails.flatMap(corridor),
    buildings: ["warming_hut"], assets: placedAssetsFromLegacy(["warming_hut"]),
  };
}

/** An existing descent for a preconfigured operations scenario. */
export function addReferenceDescent(state: GameState, liftIndex: number): GameState {
  const lift = state.lifts[liftIndex];
  if (!lift) return state;
  const snow = averageTrail(state.trails.filter((trail) => trail.open).map((trail) => trail.snow));
  const trail = fallLineTrailForLift(liftIndex, lift, snow);
  return {
    ...state,
    trails: [...state.trails, trail],
    clearedCells: [...new Set([...state.clearedCells, ...corridor(trail)])].sort(),
  };
}

/** Use the brush validator to choose test strokes from the reference routing options. */
export function referencePaint(state: GameState, liftIndex: number, difficulty?: Difficulty) {
  for (const option of trailOptions(state, liftIndex)) {
    const strokes = [{ points: option.path, widthFt: STANDARD_BRUSH_WIDTH }];
    const preview = checkPaint(state, strokes);
    if (!preview.reason && preview.liftIndex === liftIndex && preview.trailIndex === null &&
        (!difficulty || preview.difficulty === difficulty)) return strokes;
  }
  throw new Error(`No valid paint corridor found for test lift ${liftIndex}`);
}
