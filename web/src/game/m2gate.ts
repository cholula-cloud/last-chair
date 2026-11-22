import { lodgeAttachPads } from "./base";
import { STANDARD_BRUSH_WIDTH } from "./paintedTrail";
import {
  beginLodgeUpgrade,
  checkAssetPlacement,
  checkPaint,
  closeLift,
  commitPaint,
  pickFounder,
  placeAssetAtPad,
  placeLift,
  resolveNightBeat,
  setPendingFare,
  setPendingSnow,
  skipToClose,
  sleep,
  trailOptions,
} from "./rules";
import type { GameState } from "./state";
import { addReferenceDescent, createBuiltHill } from "./__fixtures__/built-hill";
import { TERRAIN } from "./terrain";
import type { LiftType } from "./types";

const WEEKEND_DAY = 14;
const CHAIR_TOP = { x: 8.5, z: 0 };
const TRAINING_TOW_TOP = { x: 0.25, z: 2.25 };
const REPLACEMENT_TOP = { x: 7, z: 3.6 };
// Long, modest-grade turns on the east shoulder give first-timers an alternate
// to the short training tow and keep them out of its line for a full descent.
const EAST_TRAVERSE = [
  CHAIR_TOP, { x: 15, z: 4 }, { x: 9, z: 9 }, { x: 20, z: 13 }, TERRAIN.base,
];

export function playGateDay(state: GameState): GameState {
  // resolveNightBeat declines decision beats (groomer_down, school_bus, summit_link)
  // so headless gate loops cannot stall the way acknowledgeBeat alone does.
  return resolveNightBeat(skipToClose(state));
}

function balancedNight(state: GameState): GameState {
  return sleep(setPendingSnow(setPendingFare(state, "balanced"), "mid"));
}

function buildLift(state: GameState, type: LiftType, top: { x: number; z: number }): GameState {
  const next = placeLift(state, { type, bottom: TERRAIN.base, top });
  if (next === state) throw new Error(`Gate ${type} at (${top.x}, ${top.z}) is not placeable`);
  return addReferenceDescent(next, next.lifts.length - 1);
}

function prepareTrainingTow(state: GameState): GameState {
  // Retire the original tow after the double chair has opened, then put its
  // replacement and short green run in the base area.
  const updated = closeLift(buildLift(state, "surface", TRAINING_TOW_TOP), 0);
  if (updated.lifts[0].confirmed) throw new Error("The original gate tow did not close");
  const fallLineIndex = updated.trails.findIndex((trail) => trail.liftIndex === 2);
  const fallLine = updated.trails[fallLineIndex];
  const options = [...trailOptions(updated, 2)].sort((a, b) => a.lengthFt - b.lengthFt);
  for (const option of options) {
    const strokes = [{ points: option.path, widthFt: STANDARD_BRUSH_WIDTH }];
    const preview = checkPaint(updated, strokes);
    if (preview.reason || preview.liftIndex !== 2 ||
        preview.trailIndex !== null || preview.difficulty !== "green") continue;
    const withGreen = commitPaint(updated, strokes);
    const trainingOnly = commitPaint(withGreen, [{ points: fallLine.path, widthFt: 150, erase: true }]);
    if (!trainingOnly.trails[fallLineIndex].open) return trainingOnly;
  }
  throw new Error("No valid green brush trail on the gate training tow");
}

export function gateSetup(seed: number): GameState {
  const initial = pickFounder(createBuiltHill(seed), "elena");
  let state = beginLodgeUpgrade(initial);
  if (state === initial) throw new Error("Gate lodge upgrade did not start");
  while (state.dayIndex < WEEKEND_DAY) {
    if (state.dayIndex === 3) {
      if (state.lodgeTier !== 2) throw new Error("Gate lodge did not finish after two nights");
      state = prepareTrainingTow(buildLift(state, "chair", CHAIR_TOP));
    }
    state = balancedNight(playGateDay(state));
  }
  return { ...state, cash: Math.max(state.cash, 18_000) };
}

export function gateBuilds(morning: GameState) {
  const strokes = [{ points: EAST_TRAVERSE, widthFt: STANDARD_BRUSH_WIDTH }];
  const preview = checkPaint(morning, strokes);
  if (preview.reason || preview.liftIndex !== 1 || preview.trailIndex !== null || preview.difficulty !== "green") {
    throw new Error(`Gate green traverse could not be painted: ${preview.reason ?? preview.difficulty}`);
  }
  const added = commitPaint(morning, strokes);
  // Measure relocation against the established chair with both runs. The
  // player moves it nearer the base and gives up its longer terrain.
  const closed = closeLift(added, 1);
  if (closed.lifts[1].confirmed) throw new Error("Gate chair did not close before guests arrived");
  const funded = closed.cash < 4000 ? { ...closed, cash: 4000 } : closed;
  return { added, moved: buildLift(funded, "chair", REPLACEMENT_TOP) };
}

export function gateScenarios(seed: number) {
  const morning = gateSetup(seed);
  const { added, moved } = gateBuilds(morning);
  return {
    morning,
    control: playGateDay(morning),
    added: playGateDay(added),
    moved: playGateDay(moved),
  };
}

export function gateRevenue(morning: GameState): GameState {
  const padCount = lodgeAttachPads(2).length;
  for (let padIndex = 0; padIndex < padCount; padIndex++) {
    const rentals = placeAssetAtPad(morning, "rentals", padIndex);
    if (rentals !== morning) return playGateDay(rentals);
  }
  throw new Error(`Gate rentals do not fit the Tier 2 lodge: ${JSON.stringify(
  lodgeAttachPads(2).map((at, padIndex) => checkAssetPlacement(morning, "rentals", at, { padIndex })),
  )}`);
}

export function gateMetrics(results: ReturnType<typeof gateScenarios>[]) {
  function mean(state: "control" | "added" | "moved") {
    const recaps = results.map((result) => {
      const recap = result[state].nightRecap;
      if (!recap) throw new Error("Gate day did not produce a recap");
      return recap;
    });
    return {
      wait: recaps.reduce((sum, recap) => sum + recap.facts.avgWaitMin, 0) / recaps.length,
      satisfaction: recaps.reduce((sum, recap) => sum + recap.satisfaction, 0) / recaps.length,
    };
  }
  return { control: mean("control"), added: mean("added"), moved: mean("moved") };
}
