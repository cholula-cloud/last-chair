import { liftLength, liftVertical, placementReason, rulesFor, type LiftLine } from "@/game/descent";
import { liftCapacityPerHour, rideMinutes } from "@/game/lifts";
import { checkPlacement, projectLiftBottom, snapTop } from "@/game/rules";
import { TERRAIN, type XZ } from "@/game/terrain";
import { liftCost, type LiftType } from "@/game/types";

type LiftPlacementState = Parameters<typeof checkPlacement>[0];

/** What a press does to the lift draft. */
export type LiftGrab =
  /** Press in the base disc: the press sets the bottom, then the drag sets the top. */
  | "base-then-top"
  /** Press at an existing bottom terminal: the drag moves the bottom. */
  | "bottom"
  /** Press at the top terminal, or anywhere else: the drag moves the top from the current bottom. */
  | "top";

/** A press this close to an existing bottom terminal grabs it (times the snap radius). */
export const BOTTOM_GRAB_FACTOR = 1.2;

const dist = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z);

/**
 * Decide what a press grabs. Near the top terminal moves the top. Near an existing bottom
 * moves the bottom. Inside the base disc sets the bottom and the drag then sets the top.
 * Anywhere else drags the top from the current bottom (the base when none is set).
 */
export function resolveLiftGrab(
  press: XZ,
  draft: { top?: XZ; bottom?: XZ },
  snapRadius: number,
  terrain = TERRAIN,
): LiftGrab {
  if (draft.top && dist(press, draft.top) <= snapRadius) return "top";
  if (draft.top && draft.bottom && dist(press, draft.bottom) <= snapRadius * BOTTOM_GRAB_FACTOR) return "bottom";
  if (dist(press, terrain.base) <= rulesFor(terrain).baseAreaRadius) return "base-then-top";
  return "top";
}

/** The bottom terminal a press or drag point produces: clamped to the base disc. */
export function liftBottomAt(point: XZ, terrain = TERRAIN): XZ {
  return projectLiftBottom(point, terrain);
}

/** The top terminal a drag point produces: a valid anchor within reach, else the rules' snap. */
export function liftTopAt(
  state: LiftPlacementState,
  type: LiftType,
  bottom: XZ,
  point: XZ,
  snapRadius: number,
  anchors: readonly XZ[],
): { top: XZ; snapped: boolean } {
  const anchor = anchors
    .map((top) => ({ top, distance: dist(top, point) }))
    .filter(({ distance }) => distance <= snapRadius * 0.7)
    .sort((a, b) => a.distance - b.distance)
    .find(({ top }) => checkPlacement(state, type, { bottom, top }).ok);
  return anchor ? { top: anchor.top, snapped: true } : snapTop(state, type, { bottom, top: point }, snapRadius);
}

export type LiftReadout = {
  ok: boolean;
  cost: number;
  lengthFt: number;
  verticalFt: number;
  skiersPerHour: number;
  rideMin: number;
  problem: string | null;
};

/** The figures shown in the bar and in the label beside the top terminal. */
export function liftReadout(
  state: LiftPlacementState & { talentsOwned: string[] },
  type: LiftType,
  line: LiftLine,
): LiftReadout {
  const check = checkPlacement(state, type, line);
  return {
    ok: check.ok,
    cost: check.ok ? check.cost : liftCost(type, line),
    lengthFt: Math.round(liftLength(line) * TERRAIN.horizontalFeetPerUnit),
    verticalFt: Math.round(liftVertical(line) * TERRAIN.feetPerUnit),
    skiersPerHour: liftCapacityPerHour(type, state.talentsOwned),
    rideMin: rideMinutes(type, line),
    problem: check.ok ? null : placementReason(check.reason, { ...check, liftType: type }),
  };
}
