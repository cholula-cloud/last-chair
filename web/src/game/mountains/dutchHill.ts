import type { TerrainDef } from "../terrain";

/** Landmarks on the new shoulders, in design units. */
export const DUTCH_HILL_SHOULDERS = [
  { x: -12.5 / 6, z: 2 / 6 },
  { x: 10 / 6, z: -0.5 / 6 },
] as const;

/**
 * The Dutch Hill lease, in world units at the 6x horizontal scale. Heartwellville leases
 * the old ski area: the base, the road frontage, and the hill with its slopes and shoulders.
 * Every lift anchor, the lodge and the base sit well inside it.
 */
const LEASE_WORLD: readonly { x: number; z: number }[] = [
  { x: -38, z: -32 },
  { x: -12, z: -40 },
  { x: 20, z: -38 },
  { x: 42, z: -26 },
  { x: 46, z: 2 },
  { x: 40, z: 30 },
  { x: -30, z: 30 },
  { x: -42, z: 4 },
];

/**
 * Dutch Hill: a Vermont hill rising toward -Z from a flat village apron at +Z,
 * with a broad rounded summit and a crest the lift runs up; the ground falls away to both sides.
 * Distances uphill (`d`) are measured from the apron edge, z = 2.1.
 */
export const DUTCH_HILL: TerrainDef = {
  // Keep existing lift and trail coordinates at the established 6×/3× scale.
  scale: { horizontal: 6, vertical: 3 },
  // 70 ft per world unit at 6x horizontal.
  horizontalFeetPerUnit: 420,
  bounds: { xMin: -24, xMax: 24, zMin: -20, zMax: 20 },
  lease: LEASE_WORLD.map((p) => ({ x: p.x / 6, z: p.z / 6 })),
  base: { x: 0.45, z: 2.55 },
  verticalFeet: 570,
  summit: { x: -1.1, z: -2.0 },

  // Village apron: lodge, car park, café, shop and warming hut sit on this.
  apron: { z: 2.1, height: 0.1 },
  // Novice apron: the first stretch above the base is gentle.
  meadow: { length: 0.6, grade: 0.12 },
  // Fall line: steep lower face, one steeper rollover band mid-face, then it
  // flattens toward the top.
  face: [
    [1.1, 0.74],
    [1.5, 1.1],
    [1.9, 1.42],
    [2.3, 1.8],
    [2.7, 2.43],
    [3.1, 2.9],
    [3.7, 3.26],
    [4.1, 3.4],
  ],
  domes: [
    // Broad rounded summit.
    { x: -1.1, z: -2.0, height: 0.45, xDenom: 5, zDenom: 3.2 },
    // Lower east shoulder.
    { x: 2.0, z: -0.9, height: 0.1, xDenom: 1.6, zDenom: 1.4 },
  ],
  flanks: {
    centerX: 0.297,
    centerXPerD: -0.28,
    halfWidth: 0.7,
    crown: 0.03,
    drop: 3.6,
    sharpness: 0.15,
    outerShoulder: { start: 0.45, slope: 0.3 },
    rampFrom: 0.2,
    rampTo: 2.2,
    floorMargin: 0.15,
  },
  backFall: { startZ: 2.6, k: 0.16 },
  noise: { frequency: 0.6, amplitude: 0.3, fromD: 0.4, toD: 1.8, fadeOutFromD: 3.4, fadeOutToD: 4.0, crestCalm: { amount: 0.9, width: 1.5 } },
};
