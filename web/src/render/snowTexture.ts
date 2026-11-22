import { TRAIL_SEGMENTS, type Trail } from "@/game/snow";
import type { SnowPreset } from "@/game/types";
import type { TrailInfluence } from "./trail";

/** Max trail rows in the snow state texture (roadmap row 30). */
export const SNOW_TEX_TRAILS = 8;
export const SNOW_TEX_SEGMENTS = TRAIL_SEGMENTS;

/** When the sim omits groomed[], derive from last night's preset. */
export function groomedForTrail(
  groomed: boolean[] | undefined,
  preset: SnowPreset,
  n: number = SNOW_TEX_SEGMENTS,
): boolean[] {
  if (groomed?.length) return groomed.slice(0, n).map(Boolean);
  if (preset === "minimal") return Array(n).fill(false);
  return Array(n).fill(true);
}

/** Alpha: 1 = groomed, ~0.42 = gun-only, 0 = natural. */
export const SNOW_TEX_GUN_ALPHA = 0.42;

function segmentConditionAlpha(groomed: boolean, gunCovered: boolean): number {
  if (groomed) return 1;
  if (gunCovered) return SNOW_TEX_GUN_ALPHA;
  return 0;
}

/** RGBA float texels: depth, quality, coverage, condition alpha. */
export function snowTextureData(
  trails: readonly Trail[],
  groomed: readonly (boolean[] | undefined)[],
  preset: SnowPreset,
  gunCovered: readonly (boolean[] | undefined)[] = [],
  width = SNOW_TEX_SEGMENTS,
): Float32Array {
  const rows = Math.min(trails.length, SNOW_TEX_TRAILS);
  const data = new Float32Array(width * SNOW_TEX_TRAILS * 4);
  for (let row = 0; row < rows; row++) {
    const trail = trails[row];
    const groom = groomedForTrail(groomed[row], preset, trail.length);
    const guns = gunCovered[row]?.slice(0, trail.length);
    for (let col = 0; col < width; col++) {
      const seg = trail[Math.min(col, trail.length - 1)];
      const i = (row * width + col) * 4;
      const ci = Math.min(col, groom.length - 1);
      data[i] = seg.depth;
      data[i + 1] = seg.quality;
      data[i + 2] = seg.coverage;
      data[i + 3] = segmentConditionAlpha(Boolean(groom[ci]), Boolean(guns?.[ci]));
    }
  }
  return data;
}

/** GPU texture bytes (linear decode in shader) for float-filter compatibility on software WebGL. */
export function snowTextureBytes(
  trails: readonly Trail[],
  groomed: readonly (boolean[] | undefined)[],
  preset: SnowPreset,
  gunCovered: readonly (boolean[] | undefined)[] = [],
  width = SNOW_TEX_SEGMENTS,
): Uint8Array {
  const data = snowTextureData(trails, groomed, preset, gunCovered, width);
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = Math.round(Math.max(0, Math.min(1, data[i])) * 255);
  return out;
}

export type SnowVertexAttrs = {
  aTrail: Float32Array;
  aT: Float32Array;
  aU: Float32Array;
  aW: Float32Array;
};

/** Picks the strongest corridor per vertex; off-trail vertices get trail index -1. */
export function bakeSnowAttributes(
  influences: readonly TrailInfluence[],
  vertexCount: number,
): SnowVertexAttrs {
  const aTrail = new Float32Array(vertexCount);
  const aT = new Float32Array(vertexCount);
  const aU = new Float32Array(vertexCount);
  const aW = new Float32Array(vertexCount);
  aTrail.fill(-1);
  for (let v = 0; v < vertexCount; v++) {
    let bestW = 0;
    let bestK = -1;
    for (let k = 0; k < influences.length; k++) {
      const w = influences[k].w[v];
      if (w > bestW) {
        bestW = w;
        bestK = k;
      }
    }
    if (bestK >= 0 && bestW > 0) {
      aTrail[v] = bestK;
      aT[v] = influences[bestK].t[v];
      aU[v] = influences[bestK].u?.[v] ?? 0;
      aW[v] = bestW;
    }
  }
  return { aTrail, aT, aU, aW };
}

/** Per-trail wear for `uWear` (min 1, runs / 150). */
export function snowWearByTrail(runs: readonly number[]): Float32Array {
  const out = new Float32Array(SNOW_TEX_TRAILS);
  for (let i = 0; i < SNOW_TEX_TRAILS; i++) {
    const r = runs[i] ?? 0;
    out[i] = Math.min(1, r / 150);
  }
  return out;
}

export function groomStyle(preset: SnowPreset): { strength: number; pitch: number } {
  if (preset === "high") return { strength: 1, pitch: 0.16 };
  if (preset === "mid") return { strength: 0.6, pitch: 0.22 };
  return { strength: 0, pitch: 0.22 };
}