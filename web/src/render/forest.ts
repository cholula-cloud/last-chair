/** Chunked forest placement: candidates per map chunk, tiered by camera distance. */

import type { LiftLine } from "@/game/descent";
import { TERRAIN } from "@/game/terrain";
import { LODGE, LIFT_BASE, ROAD_Z, SITE, WARMING_HUT_POS } from "./layout";
import { distSqToLiftLine, distSqToPolyline, pathPolyline, trailPolyline } from "./trail";

export type XZ = { x: number; z: number };

export const CHUNK_SIZE = 32;
export const NEAR_RADIUS = 12;
export const MID_RADIUS = 45;
export const CACHE_DROP_RADIUS = 77;
export const REBUILD_MOVE = 6;

export const NEAR_DENSITY = 1.5;
export const MID_KEEP_MAX = 0.36;
export const GRID_SPACING = 0.82;

export const LIFT_CLEAR = 3.0;
export const TRAIL_CLEAR = 3.84;
export const ROAD_HALF_WIDTH = 1.5;
export const APRON_PAD = 2;

const MEADOW = { cx: 1.8, cz: 9.6, rx: 7, rz: 4 };

export type TreeSpot = {
  x: number;
  z: number;
  s: number;
  rot: number;
  tint: number;
  birch: boolean;
  variant: 0 | 1 | 2;
};

type Candidate = { x: number; z: number; keep: number; variant: number; birch: boolean };

export type ForestClearings = {
  lines: readonly LiftLine[];
  /** Stored trail paths, parallel to `lines` when set. */
  paths?: readonly (readonly XZ[])[];
};

function hash32(a: number, b: number, c = 0, d = 0): number {
  let h = (a * 374761393 + b * 668265263 + c * 1274126177 + d * 1058862743) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

export function hash01(a: number, b = 0, c = 0, d = 0): number {
  return hash32(a, b, c, d) / 0xffffffff;
}

function chunkCandidates(cx: number, cz: number): Candidate[] {
  const seed = hash32(cx, cz);
  const ox = cx * CHUNK_SIZE;
  const oz = cz * CHUNK_SIZE;
  const out: Candidate[] = [];
  let i = 0;
  for (let gz = oz + GRID_SPACING * 0.31; gz < oz + CHUNK_SIZE; gz += GRID_SPACING) {
    for (let gx = ox + GRID_SPACING * 0.19; gx < ox + CHUNK_SIZE; gx += GRID_SPACING) {
      const jx = hash01(seed, i, 1) - 0.5;
      const jz = hash01(seed, i, 2) - 0.5;
      const x = gx + jx * GRID_SPACING * 0.88;
      const z = gz + jz * GRID_SPACING * 0.88;
      const keep = hash01(seed, i, 3);
      const birch = hash01(seed, i, 4) < 0.25;
      const variant = hash32(seed, i, 5) % 3;
      out.push({ x, z, keep, variant, birch });
      i++;
    }
  }
  return out;
}

const chunkCache = new Map<string, Candidate[]>();

export function chunkKey(cx: number, cz: number) {
  return `${cx},${cz}`;
}

export function getChunk(cx: number, cz: number): Candidate[] {
  const key = chunkKey(cx, cz);
  let list = chunkCache.get(key);
  if (!list) {
    list = chunkCandidates(cx, cz);
    chunkCache.set(key, list);
  }
  return list;
}

export function pruneChunks(target: XZ) {
  for (const key of [...chunkCache.keys()]) {
    const [cx, cz] = key.split(",").map(Number);
    const mx = (cx + 0.5) * CHUNK_SIZE;
    const mz = (cz + 0.5) * CHUNK_SIZE;
    if (Math.hypot(mx - target.x, mz - target.z) > CACHE_DROP_RADIUS) chunkCache.delete(key);
  }
}

function inLot(x: number, z: number) {
  const { center, size } = SITE.arrival;
  return (
    Math.abs(x - center.x) <= size.w / 2 + 0.6 && Math.abs(z - center.z) <= size.d / 2 + 0.8
  );
}

function onSpur(x: number, z: number) {
  const spur = SITE.road.spur;
  for (let i = 0; i < spur.length - 1; i++) {
    if (distSqToSegment(x, z, spur[i].x, spur[i].z, spur[i + 1].x, spur[i + 1].z) < 2 ** 2)
      return true;
  }
  return false;
}

function distSqToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-6) return (px - ax) ** 2 + (pz - az) ** 2;
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + dx * t;
  const cz = az + dz * t;
  return (px - cx) ** 2 + (pz - cz) ** 2;
}

function inApron(x: number, z: number) {
  const pad = APRON_PAD;
  const xMin = Math.min(LODGE.x, LIFT_BASE.x, WARMING_HUT_POS.x) - pad - 8;
  const xMax = Math.max(LODGE.x, LIFT_BASE.x, WARMING_HUT_POS.x) + pad + 10;
  const zMin = LIFT_BASE.z - pad;
  const zMax = ROAD_Z + pad + 8;
  return x >= xMin && x <= xMax && z >= zMin && z <= zMax;
}

function inMeadow(x: number, z: number) {
  const dx = (x - MEADOW.cx) / MEADOW.rx;
  const dz = (z - MEADOW.cz) / MEADOW.rz;
  return dx * dx + dz * dz <= 1;
}

/** Prepare trail coordinates once before checking the forest or tinting the terrain. */
export function forestMask(clearings: ForestClearings) {
  const trails = clearings.lines.map((line, i) =>
    clearings.paths?.[i]?.length ? pathPolyline(clearings.paths[i], 28) : trailPolyline(line, 28),
  );
  const liftSq = LIFT_CLEAR ** 2;
  const trailSq = TRAIL_CLEAR ** 2;
  return (x: number, z: number) => {
    if (inLot(x, z) || onSpur(x, z) || inApron(x, z) || inMeadow(x, z)) return false;
    if (Math.abs(z - ROAD_Z) < ROAD_HALF_WIDTH) return false;
    if ((x - LIFT_BASE.x) ** 2 + (z - LIFT_BASE.z) ** 2 < 2.5 ** 2) return false;
    for (let i = 0; i < clearings.lines.length; i++) {
      if (distSqToPolyline(x, z, trails[i]) < trailSq) return false;
      if (distSqToLiftLine(x, z, clearings.lines[i]) < liftSq) return false;
    }
    return TERRAIN.height(x, z) <= 10.65;
  };
}

/** True when a tree may stand at (x, z). */
export function forested(x: number, z: number, clearings: ForestClearings): boolean {
  return forestMask(clearings)(x, z);
}

function spotFrom(c: Candidate, dist: number): TreeSpot {
  const grow = 1 + Math.max(0, dist - 5) * 0.035;
  const s = (0.78 + hash01(c.x, c.z) * 0.42) * grow;
  return {
    x: c.x,
    z: c.z,
    s,
    rot: hash01(c.x, c.z, 2) * Math.PI * 2,
    tint: 0.86 + hash01(c.x, c.z, 3) * 0.2,
    birch: c.birch,
    variant: c.variant as 0 | 1 | 2,
  };
}

export function shouldRebuildForest(target: XZ, last: XZ | null): boolean {
  if (!last) return true;
  return Math.hypot(target.x - last.x, target.z - last.z) > REBUILD_MOVE;
}

export type ForestTiers = {
  near: TreeSpot[][];
  birch: TreeSpot[];
  mid: TreeSpot[];
};

export function forestForTarget(target: XZ, clearings: ForestClearings): ForestTiers {
  pruneChunks(target);
  const near: TreeSpot[][] = [[], [], []];
  const birch: TreeSpot[] = [];
  const mid: TreeSpot[] = [];
  const minCx = Math.floor((target.x - MID_RADIUS) / CHUNK_SIZE);
  const maxCx = Math.floor((target.x + MID_RADIUS) / CHUNK_SIZE);
  const minCz = Math.floor((target.z - MID_RADIUS) / CHUNK_SIZE);
  const maxCz = Math.floor((target.z + MID_RADIUS) / CHUNK_SIZE);
  const canGrow = forestMask(clearings);
  for (let cz = minCz; cz <= maxCz; cz++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (const c of getChunk(cx, cz)) {
        const dist = Math.hypot(c.x - target.x, c.z - target.z);
        if (dist > MID_RADIUS || (dist > NEAR_RADIUS && c.keep >= MID_KEEP_MAX)) continue;
        if (!canGrow(c.x, c.z)) continue;
        if (dist <= NEAR_RADIUS && c.keep < 1) {
          const p = spotFrom(c, dist);
          if (p.birch) birch.push(p);
          else near[(p.variant % 3) as 0 | 1 | 2].push(p);
        } else if (c.keep < MID_KEEP_MAX) {
          mid.push(spotFrom(c, dist));
        }
      }
    }
  }
  return { near, birch, mid };
}

/** For tests: expose cache without distance filter. */
export function _chunkSpots(cx: number, cz: number) {
  return getChunk(cx, cz);
}

export function _clearChunkCache() {
  chunkCache.clear();
}
