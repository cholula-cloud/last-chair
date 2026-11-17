import type { LiftAnchor } from "@/game/descent";
import { LIFT_BASE, LODGE } from "./layout";
import { lerp, smooth } from "./math";
import { terrainHeight } from "./terrainShape";

type XZ = { x: number; z: number };

/** Height of the groomed surface above the terrain, so the ribbon never z-fights. */
const TRAIL_LIFT = 0.02;

/** A gentle S-curve from the lift top (t = 0) to the lodge (t = 1). */
export function trailPoint(
  t: number,
  anchor: LiftAnchor,
): { x: number; y: number; z: number } {
  const dx = LODGE.x - anchor.x;
  const dz = LODGE.z - anchor.z;
  const len = Math.hypot(dx, dz) || 1;
  // Perpendicular pointing away from the lift line (east / uphill side).
  const px = dz / len;
  const pz = -dx / len;
  const ease = smooth(t);
  const bend = Math.sin(t * Math.PI) * 0.95 + Math.sin(t * Math.PI * 2) * 0.22;
  const x = lerp(anchor.x, LODGE.x, ease) + px * bend;
  const z = lerp(anchor.z, LODGE.z, ease) + pz * bend;
  return { x, y: terrainHeight(x, z) + TRAIL_LIFT, z };
}

/** Trail sampled as a polyline (for tree clearing). */
export function trailPolyline(anchor: LiftAnchor, n = 24): XZ[] {
  const pts: XZ[] = [];
  for (let i = 0; i <= n; i++) {
    const p = trailPoint(i / n, anchor);
    pts.push({ x: p.x, z: p.z });
  }
  return pts;
}

function distSqToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-6) return (px - ax) ** 2 + (pz - az) ** 2;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
  return (px - (ax + t * dx)) ** 2 + (pz - (az + t * dz)) ** 2;
}

export function distSqToPolyline(px: number, pz: number, pts: XZ[]): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distSqToSegment(px, pz, pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z);
    if (d < best) best = d;
  }
  return best;
}

/** Squared distance from a point to the lift line (base → top). */
export function distSqToLiftLine(px: number, pz: number, anchor: LiftAnchor): number {
  return distSqToSegment(px, pz, LIFT_BASE.x, LIFT_BASE.z, anchor.x, anchor.z);
}
