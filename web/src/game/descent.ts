/** P0 stub: lift top must reach a base zone with enough vertical drop. */

export type LiftAnchor = { x: number; z: number };

const BASE_ZONE = { xMin: -1.5, xMax: 2.5, zMin: 2, zMax: 3.5 };
const TOP_ZONE = { xMin: -2, xMax: 1, zMin: -0.5, zMax: 1.2 };

export function checkDescentValid(anchor: LiftAnchor): boolean {
  const inTop =
    anchor.x >= TOP_ZONE.xMin &&
    anchor.x <= TOP_ZONE.xMax &&
    anchor.z >= TOP_ZONE.zMin &&
    anchor.z <= TOP_ZONE.zMax;
  if (!inTop) return false;
  const drop = BASE_ZONE.zMin - anchor.z;
  const horizontal = Math.abs(anchor.x - 0.5);
  return drop >= 1.2 && horizontal <= 2.5;
}

export const LIFT_PREVIEW_SLOTS: LiftAnchor[] = [
  { x: -1.2, z: 0.2 },
  { x: 0.8, z: 0.6 },
  { x: -0.2, z: 1.0 },
];
