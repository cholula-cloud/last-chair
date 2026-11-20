import { leaseBounds, onLease } from "@/game/lease";
import { liftLength, rulesFor } from "@/game/descent";
import { checkPlacement } from "@/game/rules";
import { TERRAIN, type Terrain, type XZ } from "@/game/terrain";
import type { LiftType } from "@/game/types";

export type Dot = { x: number; z: number; valid: boolean | null };

/** Lift-top cells are judged from a bottom rounded to this step, so a bottom drag recomputes at most once per step. */
export const LIFT_BOTTOM_STEP = 0.5;

/** Centres of the build cells that lie on the lease, with whether a placement there is allowed. */
export function gridDots(
  check: ((at: { x: number; z: number }) => boolean) | null,
  terrain: Terrain = TERRAIN,
  step = terrain.scale.horizontal / 2,
): Dot[] {
  const size = step;
  const { xMin, xMax, zMin, zMax } = leaseBounds(terrain);
  const dots: Dot[] = [];
  for (let x = Math.floor(xMin / size) * size; x + size <= xMax + size; x += size) {
    for (let z = Math.floor(zMin / size) * size; z + size <= zMax + size; z += size) {
      const at = { x: x + size / 2, z: z + size / 2 };
      if (!onLease(at, terrain)) continue;
      dots.push({ x: at.x, z: at.z, valid: check ? check(at) : null });
    }
  }
  return dots;
}

/** The lift guide samples at half the field's cell step so the legal area reads as an area, not specks. */
export const LIFT_GUIDE_STEP = TERRAIN.scale.horizontal / 4;

/** Debounce of the rounded bottom, so a bottom drag does not recompute mid-gesture. */
export const LIFT_BOTTOM_DEBOUNCE_MS = 160;

export const snapBottom = (bottom: XZ): XZ => ({
  x: Math.round(bottom.x / LIFT_BOTTOM_STEP) * LIFT_BOTTOM_STEP,
  z: Math.round(bottom.z / LIFT_BOTTOM_STEP) * LIFT_BOTTOM_STEP,
});

type LiftRules = Parameters<typeof checkPlacement>[0];

/**
 * Lease cells where the top terminal can legally go for this bottom: the same `checkPlacement`
 * the preview uses, with cash set high so the guide shows terrain, spacing and building rules.
 */
export function liftTopCells(
  rules: Omit<LiftRules, "cash"> & { cash?: number },
  type: LiftType,
  bottom: XZ,
  terrain: Terrain = TERRAIN,
  options: { prefilter?: boolean } = {},
): XZ[] {
  const state = { ...rules, cash: Number.MAX_SAFE_INTEGER };
  const from = snapBottom(bottom);
  const reach = reachOf(type, terrain) + 0.02;
  const near = options.prefilter === false
    ? () => true
    : (at: XZ) => liftLength({ bottom: from, top: at }) <= reach;
  return gridDots((top) => near(top) && checkPlacement(state, type, { bottom: from, top }).ok, terrain, LIFT_GUIDE_STEP)
    .filter((dot) => dot.valid)
    .map(({ x, z }) => ({ x, z }));
}

/** The longest lift of this type, in world units: the rule `checkLiftLine` enforces. */
export const reachOf = (type: LiftType, terrain: Terrain = TERRAIN) => rulesFor(terrain, type).maxLiftLength;

/** Points of the circle of radius `reach` round the bottom that lie on the lease. */
export function reachArc(bottom: XZ, reach: number, terrain: Terrain = TERRAIN, steps = 128): (XZ | null)[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = (i / steps) * Math.PI * 2;
    const at = { x: bottom.x + Math.cos(angle) * reach, z: bottom.z + Math.sin(angle) * reach };
    return onLease(at, terrain) ? at : null;
  });
}

/** Cells farther than `clear` from the cable segment (which includes both pads); with no top, from the bottom only. */
export function clearOfCable(cells: readonly XZ[], bottom: XZ, top: XZ | null | undefined, clear: number): XZ[] {
  const end = top ?? bottom;
  const dx = end.x - bottom.x;
  const dz = end.z - bottom.z;
  const len2 = dx * dx + dz * dz;
  return cells.filter((cell) => {
    const t = len2 > 0 ? Math.min(1, Math.max(0, ((cell.x - bottom.x) * dx + (cell.z - bottom.z) * dz) / len2)) : 0;
    return Math.hypot(cell.x - (bottom.x + dx * t), cell.z - (bottom.z + dz * t)) > clear;
  });
}

/** Fixed instance capacities from the lease cell counts at each sampling step. */
export function buildGridCapacities(terrain: Terrain = TERRAIN) {
  return {
    field: gridDots(null, terrain).length,
    lift: gridDots(null, terrain, LIFT_GUIDE_STEP).length,
  };
}