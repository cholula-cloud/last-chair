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

export type TrailInfluence = {
  /** 1 on the trail centre line, fading to 0 beside it, per vertex. */
  w: Float32Array;
  /** Position along the trail per vertex: 0 at the lift top, 1 at the lodge. */
  t: Float32Array;
};

/** For each vertex of a position buffer: how strongly and where along `anchor`'s trail it sits. */
export function trailInfluence(
  anchor: LiftAnchor,
  positions: ArrayLike<number>,
  core = 0.5,
  fade = 1.05,
  n = 40,
): TrailInfluence {
  const pts = trailPolyline(anchor, n);
  const count = positions.length / 3;
  const w = new Float32Array(count);
  const t = new Float32Array(count);
  for (let v = 0; v < count; v++) {
    const px = positions[v * 3];
    const pz = positions[v * 3 + 2];
    let best = Infinity;
    let bestT = 0;
    for (let i = 0; i < n; i++) {
      const ax = pts[i].x;
      const az = pts[i].z;
      const dx = pts[i + 1].x - ax;
      const dz = pts[i + 1].z - az;
      const lenSq = dx * dx + dz * dz || 1e-6;
      const u = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
      const d = (px - (ax + u * dx)) ** 2 + (pz - (az + u * dz)) ** 2;
      if (d < best) {
        best = d;
        bestT = (i + u) / n;
      }
    }
    const d = Math.sqrt(best);
    const k = Math.max(0, Math.min(1, (d - core) / (fade - core)));
    w[v] = 1 - k * k * (3 - 2 * k);
    t[v] = bestT;
  }
  return { w, t };
}

/** A snow value interpolated between segment centres at position t (0 top, 1 bottom). */
export function sampleSegments(
  segments: readonly { depth: number; quality: number; coverage: number }[],
  t: number,
  key: "depth" | "quality" | "coverage",
): number {
  const n = segments.length;
  const f = Math.max(0, Math.min(n - 1, t * n - 0.5));
  const i = Math.floor(f);
  const j = Math.min(n - 1, i + 1);
  return lerp(segments[i][key], segments[j][key], f - i);
}
