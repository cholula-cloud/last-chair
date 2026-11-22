import { formatOperatorText } from "../content";
import type { TerrainDef } from "../terrain";

export const ORCHARD_PARCEL_COST = 4500;
export const INSPECTOR_REPAIR_COST = 600;
export const TUBING_SATURDAY_BONUS = 320;

export type MapleValleyNoteKind = "windham_bus" | "tubing_saturday" | "orchard_bid" | "inspectors_tuesday";

const LEASE_WORLD: readonly { x: number; z: number }[] = [
  { x: -42, z: -34 },
  { x: -14, z: -42 },
  { x: 24, z: -40 },
  { x: 46, z: -24 },
  { x: 48, z: 6 },
  { x: 40, z: 32 },
  { x: -34, z: 30 },
  { x: -44, z: 6 },
];

/**
 * Maple Valley, Dummerston VT: a 900 ft Windham County bowl with a generous base bowl,
 * adjacent orchard land, and sustained upper fall-line pitches.
 */
export const MAPLE_VALLEY: TerrainDef = {
  scale: { horizontal: 6, vertical: 3 },
  horizontalFeetPerUnit: 420,
  bounds: { xMin: -24, xMax: 24, zMin: -20, zMax: 20 },
  lease: LEASE_WORLD.map((p) => ({ x: p.x / 6, z: p.z / 6 })),
  base: { x: 0.45, z: 2.55 },
  verticalFeet: 900,
  summit: { x: -1.0, z: -2.2 },
  apron: { z: 2.1, height: 0.1 },
  meadow: { length: 0.72, grade: 0.11 },
  face: [
    [1.1, 0.82],
    [1.5, 1.38],
    [1.9, 1.96],
    [2.3, 2.55],
    [2.7, 3.16],
    [3.1, 3.72],
    [3.7, 4.18],
    [4.1, 4.44],
  ],
  domes: [
    { x: -1.0, z: -2.2, height: 0.58, xDenom: 5.2, zDenom: 3.4 },
    { x: 2.2, z: -0.9, height: 0.22, xDenom: 2.0, zDenom: 1.6 },
  ],
  flanks: {
    centerX: 0.24,
    centerXPerD: -0.22,
    halfWidth: 0.86,
    crown: 0.04,
    drop: 4.0,
    sharpness: 0.14,
    outerShoulder: { start: 0.52, slope: 0.36 },
    rampFrom: 0.25,
    rampTo: 2.3,
    floorMargin: 0.16,
  },
  backFall: { startZ: 2.6, k: 0.15 },
  noise: {
    frequency: 0.58,
    amplitude: 0.32,
    fromD: 0.45,
    toD: 2.0,
    fadeOutFromD: 3.5,
    fadeOutToD: 4.0,
    crestCalm: { amount: 0.88, width: 1.6 },
  },
};

export function mapleValleyRadioNote(
  kind: MapleValleyNoteKind,
  operatorName: string | null = null,
): { title: string; radio: string } {
  const sub = (text: string) => formatOperatorText(text, operatorName);
  switch (kind) {
    case "windham_bus":
      return {
        title: "Windham District Friday bus",
        radio: sub("Rosa Merrill booked the Brattleboro and Dummerston buses for every Friday through closing. Keep the ski school lane tidy for town kids."),
      };
    case "tubing_saturday":
      return {
        title: "Tubing lanes packed at the base",
        radio: sub(`Families from Brattleboro lined up four deep on the tubing lanes all Saturday. Added ${TUBING_SATURDAY_BONUS} dollars to the drawer without touching a chairlift.`),
      };
    case "orchard_bid":
      return {
        title: "Maple Valley orchard parcel",
        radio: sub(`Sloane put in a sealed bid on the apple orchard beside your lot. Matching ${ORCHARD_PARCEL_COST} dollars keeps it in town hands and builds local pride.`),
      };
    case "inspectors_tuesday":
      return {
        title: "Vermont tramway inspector called",
        radio: sub(`State lift inspector flagged a sheave bearing on your oldest lift. ${INSPECTOR_REPAIR_COST} dollars fixes it overnight, or that chair stays closed tomorrow.`),
      };
  }
}
