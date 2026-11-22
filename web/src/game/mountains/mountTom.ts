import { formatOperatorText } from "../content";
import type { TerrainDef } from "../terrain";

export const NIGHT_LIGHTS_COST = 3500;
export const NIGHT_SESSION_UPKEEP = 220;
export const NIGHT_SESSION_EXTRA_SKIERS = 8;
export const NIGHT_SESSION_REVENUE_PER_GUEST = 12;

export type MountTomNoteKind = "mill_lights" | "whiterock_shuttle" | "valley_inversion";

const LEASE_WORLD: readonly { x: number; z: number }[] = [
  { x: -40, z: -34 },
  { x: -10, z: -42 },
  { x: 24, z: -40 },
  { x: 44, z: -24 },
  { x: 46, z: 4 },
  { x: 38, z: 32 },
  { x: -32, z: 30 },
  { x: -42, z: 6 },
];

/**
 * Mount Tom, Holyoke MA: a 680 ft traprock basalt ridge rising steeply off the
 * Connecticut River valley with broad upper shoulders and early snowmaking piping.
 */
export const MOUNT_TOM: TerrainDef = {
  scale: { horizontal: 6, vertical: 3 },
  horizontalFeetPerUnit: 420,
  bounds: { xMin: -24, xMax: 24, zMin: -20, zMax: 20 },
  lease: LEASE_WORLD.map((p) => ({ x: p.x / 6, z: p.z / 6 })),
  base: { x: 0.45, z: 2.55 },
  verticalFeet: 680,
  summit: { x: -0.9, z: -2.1 },
  apron: { z: 2.1, height: 0.1 },
  meadow: { length: 0.55, grade: 0.14 },
  face: [
    [1.1, 0.85],
    [1.5, 1.32],
    [1.9, 1.78],
    [2.3, 2.26],
    [2.7, 2.86],
    [3.1, 3.36],
    [3.7, 3.74],
    [4.1, 3.92],
  ],
  domes: [
    { x: -0.9, z: -2.1, height: 0.52, xDenom: 4.8, zDenom: 3.0 },
    { x: 2.1, z: -0.8, height: 0.18, xDenom: 1.8, zDenom: 1.5 },
  ],
  flanks: {
    centerX: 0.25,
    centerXPerD: -0.24,
    halfWidth: 0.78,
    crown: 0.04,
    drop: 3.8,
    sharpness: 0.16,
    outerShoulder: { start: 0.48, slope: 0.34 },
    rampFrom: 0.2,
    rampTo: 2.1,
    floorMargin: 0.16,
  },
  backFall: { startZ: 2.6, k: 0.16 },
  noise: {
    frequency: 0.65,
    amplitude: 0.34,
    fromD: 0.4,
    toD: 1.9,
    fadeOutFromD: 3.4,
    fadeOutToD: 4.0,
    crestCalm: { amount: 0.85, width: 1.4 },
  },
};

export function mountTomNightNet(arrivals: number): {
  eveningSkiers: number;
  gross: number;
  upkeep: number;
  net: number;
} {
  const eveningSkiers = arrivals > 0 ? Math.round(arrivals * 0.45) + NIGHT_SESSION_EXTRA_SKIERS : 0;
  const gross = eveningSkiers * NIGHT_SESSION_REVENUE_PER_GUEST;
  const upkeep = NIGHT_SESSION_UPKEEP;
  return { eveningSkiers, gross, upkeep, net: gross - upkeep };
}

export function mountTomRadioNote(
  kind: MountTomNoteKind,
  operatorName: string | null = null,
): { title: string; radio: string } {
  const sub = (text: string) => formatOperatorText(text, operatorName);
  switch (kind) {
    case "mill_lights":
      return {
        title: "Holyoke range lights",
        radio: sub("Lou Carvalho wired the old sodium lamps up the ridge. Mill crews and UMass kids love an extra run under the towers when traffic fills the lot."),
      };
    case "whiterock_shuttle":
      return {
        title: "Whiterock park-and-ride",
        radio: sub("Blue Whiterock coach parked along Route 5 trying to scoop Pioneer Valley day-trippers. Good snow keeps them turning up your driveway instead."),
      };
    case "valley_inversion":
      return {
        title: "River valley inversion",
        radio: sub("Cold air settled right along the Connecticut River bend tonight. Perfect temperature window for your snow guns on the lower apron."),
      };
  }
}
