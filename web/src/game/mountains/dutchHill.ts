import type { TerrainDef } from "../terrain";

/**
 * Dutch Hill: a Vermont hill rising toward -Z from a flat village apron at +Z,
 * with a broad rounded summit, an east shoulder and side ridges framing a bowl.
 * Distances uphill (`d`) are measured from the apron edge, z = 2.1.
 */
export const DUTCH_HILL: TerrainDef = {
  // Design units equal world units until the world-scale work lands; 6/3 is the planned scale.
  scale: { horizontal: 1, vertical: 1 },
  // 70 ft per world unit at 6x horizontal.
  horizontalFeetPerUnit: 420,
  bounds: { xMin: -24, xMax: 24, zMin: -20, zMax: 20 },
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
    [1.1, 0.8],
    [1.5, 1.2],
    [1.9, 1.62],
    [2.3, 2.05],
    [2.7, 2.65],
    [3.1, 3.1],
    [3.7, 3.45],
    [4.1, 3.55],
  ],
  domes: [
    // Broad rounded summit.
    { x: -0.4, z: -2.0, height: 0.45, xDenom: 5, zDenom: 3.2 },
    // Lower east shoulder.
    { x: 3.1, z: -0.9, height: 0.55, xDenom: 2, zDenom: 1.4 },
  ],
  ridges: {
    centerX: 0.5,
    halfWidth: 3.4,
    height: 3.2,
    sharpness: 0.07,
    floor: 0.2,
    rampFrom: -0.5,
    rampTo: 3,
  },
  bowl: { x: 0.3, depth: 0.22, xDenom: 2.2, fromD: 0.5, toD: 3 },
  backFall: { startZ: 2.6, k: 0.16 },
  noise: { frequency: 0.6, amplitude: 0.3, fromD: 0.4, toD: 1.8, fadeOutFromD: 3.4, fadeOutToD: 4.0 },
};
