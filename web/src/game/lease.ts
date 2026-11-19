/** The lease: land the player may build on. Pure geometry over `Terrain.lease`; no rendering. */

import { TERRAIN, type Terrain, type XZ } from "./terrain";

/** Player-facing copy when a placement leaves the lease. */
export const OFF_LEASE_MESSAGE = "Outside the Dutch Hill lease.";

/** Even-odd point-in-polygon test; points on an edge count as inside. */
export function pointInPolygon(p: XZ, polygon: readonly XZ[]): boolean {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z) || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (distanceToSegment(p, a, b) < 1e-9) return true;
    if ((a.z > p.z) !== (b.z > p.z) && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

export function distanceToSegment(p: XZ, a: XZ, b: XZ): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

/** Axis-aligned bounds of a polygon. */
export function polygonBounds(polygon: readonly XZ[]) {
  let xMin = Infinity;
  let xMax = -Infinity;
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const p of polygon) {
    xMin = Math.min(xMin, p.x);
    xMax = Math.max(xMax, p.x);
    zMin = Math.min(zMin, p.z);
    zMax = Math.max(zMax, p.z);
  }
  return { xMin, xMax, zMin, zMax };
}

/** True when `p` is on the leased land. A terrain without a lease is buildable everywhere. */
export function onLease(p: XZ, terrain: Terrain = TERRAIN): boolean {
  if (!terrain.lease) return Number.isFinite(p.x) && Number.isFinite(p.z);
  return pointInPolygon(p, terrain.lease);
}

/** Distance from `p` to the nearest lease edge, whichever side it is on. */
function edgeDistance(p: XZ, poly: readonly XZ[]): number {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    best = Math.min(best, distanceToSegment(p, poly[i], poly[j]));
  }
  return best;
}

/** Distance from `p` to the lease edge: 0 on the lease, positive outside. 0 for a terrain with no lease. */
export function distanceOutsideLease(p: XZ, terrain: Terrain = TERRAIN): number {
  const poly = terrain.lease;
  if (!poly || poly.length < 3 || pointInPolygon(p, poly)) return 0;
  return edgeDistance(p, poly);
}

/** Distance from a point on the lease to the lease edge; 0 outside it or with no lease. */
export function depthInsideLease(p: XZ, terrain: Terrain = TERRAIN): number {
  const poly = terrain.lease;
  if (!poly || poly.length < 3 || !pointInPolygon(p, poly)) return 0;
  return edgeDistance(p, poly);
}

/** True when the straight segment a to b stays on the lease (sampled; exact for a convex lease). */
export function segmentOnLease(a: XZ, b: XZ, terrain: Terrain = TERRAIN, steps = 16): boolean {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!onLease({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, terrain)) return false;
  }
  return true;
}

/** The lease bounding box, or the terrain bounds when there is no lease. */
export function leaseBounds(terrain: Terrain = TERRAIN) {
  return terrain.lease ? polygonBounds(terrain.lease) : terrain.bounds;
}
