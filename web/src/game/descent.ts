/** Lift viability: the top terminal must sit well above the base on loadable ground. */

import { TERRAIN, type Terrain } from "./terrain";

export type LiftAnchor = { x: number; z: number };

export type LiftSlot = LiftAnchor & { label: string };

/** Least height (world units) the top terminal must stand above the base. */
export const MIN_LIFT_VERTICAL = 0.85;
/** Longest lift, horizontal distance base to top (world units). */
export const MAX_LIFT_LENGTH = 3.4;
/**
 * Steepest ground a terminal may stand on (rise over run). The toy hill
 * exaggerates vertical, so its face runs near 1.0; the rollover band is about 1.8.
 */
export const MAX_LOAD_GRADE = 1.25;

export function checkDescentValid(anchor: LiftAnchor, terrain: Terrain = TERRAIN): boolean {
  const { bounds, base } = terrain;
  if (
    anchor.x < bounds.xMin ||
    anchor.x > bounds.xMax ||
    anchor.z < bounds.zMin ||
    anchor.z > bounds.zMax
  ) {
    return false;
  }
  const vertical = terrain.height(anchor.x, anchor.z) - terrain.height(base.x, base.z);
  if (vertical < MIN_LIFT_VERTICAL) return false;
  if (Math.hypot(anchor.x - base.x, anchor.z - base.z) > MAX_LIFT_LENGTH) return false;
  return terrain.grade(anchor.x, anchor.z) <= MAX_LOAD_GRADE && terrain.grade(base.x, base.z) <= MAX_LOAD_GRADE;
}

export const LIFT_PREVIEW_SLOTS: LiftSlot[] = [
  { x: -1.2, z: 0.2, label: "Ridge" },
  { x: 0.8, z: 0.6, label: "Mid" },
  { x: -0.2, z: 1.0, label: "Creek" },
];
