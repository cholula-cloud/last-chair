/**
 * Forest placement in world space. Candidates come from a fixed jittered grid, so the
 * same hill always grows the same trees. Inside the lease every candidate that clears
 * the clearings stands as a full tree. From the lease edge outward a sparse far tier
 * keeps the same candidates at a lower density. Nothing here depends on the camera.
 */

import type { LiftLine } from "@/game/descent";
import { depthInsideLease, distanceOutsideLease, leaseBounds, onLease } from "@/game/lease";
import { TERRAIN } from "@/game/terrain";
import { LODGE, LIFT_BASE, ROAD_Z, SITE, WARMING_HUT_POS } from "./layout";
import { smoothstep } from "./math";
import { distSqToLiftLine, distSqToPolyline, pathPolyline, trailPolyline } from "./trail";

export type XZ = { x: number; z: number };

export const CHUNK_SIZE = 32;
export const GRID_SPACING = 0.82;

/** Width of the band at the lease edge where tree density eases from full to far density. */
export const FADE_BAND = 14;
/** Share of candidates the far tier keeps, outside the lease and at its edge. */
export const FAR_KEEP = 0.14;
/** Side of one lease cell, in world units. Each cell is drawn as its own instanced mesh so it can be culled. */
export const LEASE_CELL = 44;
/** Far trees thin out to nothing this far beyond the lease; past it the canopy tint on the ground carries the forest. */
export const FAR_REACH = 85;
/** Far trees stand only on the part of the terrain mesh that is drawn. */
export const FAR_AREA = { xMin: -136, xMax: 140, zMin: -104, zMax: 100 };

export const LIFT_CLEAR = 0.9;
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

const samePoint = (a: XZ, b: XZ) => a.x === b.x && a.z === b.z;

/** Sim ticks replace lift and trail records even when their geometry stays fixed. */
export function sameForestClearings(a: ForestClearings, b: ForestClearings): boolean {
  if (a.lines.length !== b.lines.length) return false;
  if (!a.lines.every((line, i) => {
    const other = b.lines[i];
    return samePoint(line.bottom, other.bottom) && samePoint(line.top, other.top);
  })) return false;

  const otherPaths = b.paths;
  if ((a.paths?.length ?? 0) !== (otherPaths?.length ?? 0)) return false;
  if (!a.paths || !otherPaths) return true;
  return a.paths.every((path, i) => {
    const other = otherPaths[i];
    return path === other || (path.length === other.length && path.every((point, j) => samePoint(point, other[j])));
  });
}

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
  const trails = clearings.paths
    ? clearings.paths.filter((path) => path.length > 1).map((path) => pathPolyline(path, 28))
    : clearings.lines.map((line) => trailPolyline(line, 28));
  const liftSq = LIFT_CLEAR ** 2;
  const trailSq = TRAIL_CLEAR ** 2;
  return (x: number, z: number) => {
    if (inLot(x, z) || onSpur(x, z) || inApron(x, z) || inMeadow(x, z)) return false;
    if (Math.abs(z - ROAD_Z) < ROAD_HALF_WIDTH && x >= SITE.road.xFrom - 1 && x <= SITE.road.xTo + 1) return false;
    if ((x - LIFT_BASE.x) ** 2 + (z - LIFT_BASE.z) ** 2 < 2.5 ** 2) return false;
    for (const trail of trails) if (distSqToPolyline(x, z, trail) < trailSq) return false;
    for (const line of clearings.lines) if (distSqToLiftLine(x, z, line) < liftSq) return false;
    return TERRAIN.height(x, z) <= 10.65;
  };
}

/** True when a tree may stand at (x, z). */
export function forested(x: number, z: number, clearings: ForestClearings): boolean {
  return forestMask(clearings)(x, z);
}

function spotFrom(c: Candidate, scale: number): TreeSpot {
  return {
    x: c.x,
    z: c.z,
    s: (0.78 + hash01(c.x, c.z) * 0.42) * scale,
    rot: hash01(c.x, c.z, 2) * Math.PI * 2,
    tint: 0.86 + hash01(c.x, c.z, 3) * 0.2,
    birch: c.birch,
    variant: c.variant as 0 | 1 | 2,
  };
}

/** Candidates of every chunk that touches a rectangle. */
function candidatesIn(area: { xMin: number; xMax: number; zMin: number; zMax: number }): Candidate[] {
  const out: Candidate[] = [];
  const minCx = Math.floor(area.xMin / CHUNK_SIZE);
  const maxCx = Math.floor(area.xMax / CHUNK_SIZE);
  const minCz = Math.floor(area.zMin / CHUNK_SIZE);
  const maxCz = Math.floor(area.zMax / CHUNK_SIZE);
  for (let cz = minCz; cz <= maxCz; cz++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (const c of chunkCandidates(cx, cz)) {
        if (c.x >= area.xMin && c.x <= area.xMax && c.z >= area.zMin && c.z <= area.zMax) out.push(c);
      }
    }
  }
  return out;
}

/**
 * The share of candidates that keep a tree at (x, z). It is 1 deep inside the lease,
 * eases down to {@link FAR_KEEP} across {@link FADE_BAND} units at the lease edge, and
 * stays at {@link FAR_KEEP} beyond it, so the two tiers meet at the same density.
 */
export function keepShare(p: XZ): number {
  if (!onLease(p)) return FAR_KEEP;
  return FAR_KEEP + (1 - FAR_KEEP) * smoothstep(0, FADE_BAND, depthInsideLease(p));
}

let leaseCandidates: Candidate[] | null = null;

/** One cell of the lease forest, drawn as its own instanced meshes. */
export type LeaseCell = {
  key: string;
  pines: TreeSpot[];
  birch: TreeSpot[];
};

/**
 * Every tree standing on the lease, grouped into fixed cells. Recompute only when
 * lifts, trails or cleared cells change.
 */
export function leaseForest(clearings: ForestClearings): LeaseCell[] {
  const bounds = leaseBounds();
  leaseCandidates ??= candidatesIn(bounds).filter((c) => onLease(c));
  const canGrow = forestMask(clearings);
  const cells = new Map<string, LeaseCell>();
  for (const c of leaseCandidates) {
    if (c.keep >= keepShare(c) || !canGrow(c.x, c.z)) continue;
    const cx = Math.floor((c.x - bounds.xMin) / LEASE_CELL);
    const cz = Math.floor((c.z - bounds.zMin) / LEASE_CELL);
    const key = `${cx},${cz}`;
    let cell = cells.get(key);
    if (!cell) cells.set(key, (cell = { key, pines: [], birch: [] }));
    (c.birch ? cell.birch : cell.pines).push(spotFrom(c, 1));
  }
  return [...cells.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
}

let farTrees: TreeSpot[] | null = null;

/** Sparse trees from the lease edge to the edge of the drawn terrain. The candidates are built once; clearings filter them. */
export function farForest(clearings?: ForestClearings): TreeSpot[] {
  const base = farBase();
  if (!clearings) return base;
  // Trails and lifts at the lease edge clear far trees too.
  const canGrow = forestMask(clearings);
  return base.filter((t) => canGrow(t.x, t.z));
}

function farBase(): TreeSpot[] {
  if (farTrees) return farTrees;
  const canGrow = forestMask({ lines: [] });
  const out: TreeSpot[] = [];
  for (const c of candidatesIn(FAR_AREA)) {
    if (c.keep >= FAR_KEEP || onLease(c)) continue;
    const away = distanceOutsideLease(c);
    if (c.keep >= FAR_KEEP * (1 - smoothstep(FAR_REACH * 0.55, FAR_REACH, away)) || !canGrow(c.x, c.z)) continue;
    // Same size distribution as the lease trees, so there is no seam at the edge.
    out.push(spotFrom(c, 1));
  }
  farTrees = out;
  return out;
}

/** For tests: the candidates of one chunk. */
export function _chunkSpots(cx: number, cz: number) {
  return chunkCandidates(cx, cz);
}

export function _clearForestCache() {
  leaseCandidates = null;
  farTrees = null;
}
