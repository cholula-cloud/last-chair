import type { LiftLine } from "@/game/descent";
import { LODGE } from "./layout";
import { lerp, smooth } from "./math";
import { TERRAIN } from "@/game/terrain";

type XZ = { x: number; z: number };

/** Height of the groomed surface above the terrain, so the ribbon never z-fights. */
const TRAIL_LIFT = 0.02;

const LODGE_OFFSET = { x: LODGE.x - TERRAIN.base.x, z: LODGE.z - TERRAIN.base.z };

function trailEnd(line: LiftLine): XZ {
  return { x: line.bottom.x + LODGE_OFFSET.x, z: line.bottom.z + LODGE_OFFSET.z };
}

function arcLengths(path: readonly XZ[]): { total: number; cum: number[] } {
  const cum: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
  }
  return { total: cum[cum.length - 1], cum };
}

/** Point at normalized arc length t ∈ [0,1] along a stored trail path. */
export function pathPoint(path: readonly XZ[], t: number): { x: number; y: number; z: number } {
  if (path.length === 0) return { x: 0, y: 0, z: 0 };
  if (path.length === 1) {
    const p = path[0];
    return { x: p.x, y: TERRAIN.height(p.x, p.z) + TRAIL_LIFT, z: p.z };
  }
  const { total, cum } = arcLengths(path);
  const target = Math.max(0, Math.min(1, t)) * total;
  let i = 0;
  while (i < cum.length - 2 && cum[i + 1] < target) i++;
  const a = path[i];
  const b = path[Math.min(i + 1, path.length - 1)];
  const seg = cum[i + 1] - cum[i] || 1;
  const u = (target - cum[i]) / seg;
  const x = a.x + (b.x - a.x) * u;
  const z = a.z + (b.z - a.z) * u;
  return { x, y: TERRAIN.height(x, z) + TRAIL_LIFT, z };
}

/**
 * Display centreline for a routed path. Routed paths come off a grid walk and
 * keep kinks much tighter than a trail is wide; a ribbon built straight on
 * them folds over itself. A few box-filter passes over a dense resample bend
 * every turn to a radius on the order of `radius`. Samples past either end are
 * point reflections through that end, so the top and bottom stay put and the
 * filter keeps working right up to them.
 */
export function smoothPath(path: readonly XZ[], radius: number, step = 0.25, passes = 3): XZ[] {
  if (path.length < 3) return path.map((p) => ({ x: p.x, z: p.z }));
  const { total } = arcLengths(path);
  const n = Math.max(2, Math.ceil(total / step));
  let pts = pathPolyline(path, n);
  const last = pts.length - 1;
  const half = Math.max(1, Math.min(Math.round(radius / step), last));
  const at = (src: XZ[], j: number): XZ => {
    if (j < 0) return { x: 2 * src[0].x - src[-j].x, z: 2 * src[0].z - src[-j].z };
    if (j > last) {
      const k = 2 * last - j;
      return { x: 2 * src[last].x - src[k].x, z: 2 * src[last].z - src[k].z };
    }
    return src[j];
  };
  for (let pass = 0; pass < passes; pass++) {
    const next: XZ[] = new Array(pts.length);
    for (let i = 0; i <= last; i++) {
      let sx = 0;
      let sz = 0;
      for (let j = i - half; j <= i + half; j++) {
        const p = at(pts, j);
        sx += p.x;
        sz += p.z;
      }
      next[i] = { x: sx / (2 * half + 1), z: sz / (2 * half + 1) };
    }
    pts = next;
  }
  return pts;
}

/** Path sampled as a polyline (for tree clearing). */
export function pathPolyline(path: readonly XZ[], n = 24): XZ[] {
  const pts: XZ[] = [];
  for (let i = 0; i <= n; i++) {
    const p = pathPoint(path, i / n);
    pts.push({ x: p.x, z: p.z });
  }
  return pts;
}

/** Squared distance from a point to a stored path polyline. */
export function distSqToPath(px: number, pz: number, path: readonly XZ[], n = 40): number {
  return distSqToPolyline(px, pz, pathPolyline(path, n));
}

/** For each vertex: trail weight and position along `path`. */
export function pathInfluence(
  path: readonly XZ[],
  positions: ArrayLike<number>,
  core = 3.0,
  fade = 6.3,
  n = 40,
): TrailInfluence {
  const pts = pathPolyline(path, n);
  return trailInfluencePolyline(pts, positions, core, fade, n);
}

function trailInfluencePolyline(
  pts: XZ[],
  positions: ArrayLike<number>,
  core: number,
  fade: number,
  n: number,
): TrailInfluence {
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

/** Legacy S-curve from the lift top (t = 0) to the run-out at the base area (t = 1). */
export function trailPoint(
  t: number,
  line: LiftLine,
): { x: number; y: number; z: number } {
  const end = trailEnd(line);
  const dx = end.x - line.top.x;
  const dz = end.z - line.top.z;
  const len = Math.hypot(dx, dz) || 1;
  const px = dz / len;
  const pz = -dx / len;
  const ease = smooth(t);
  const bend = Math.sin(t * Math.PI) * 0.95 + Math.sin(t * Math.PI * 2) * 0.22;
  const x = lerp(line.top.x, end.x, ease) + px * bend;
  const z = lerp(line.top.z, end.z, ease) + pz * bend;
  return { x, y: TERRAIN.height(x, z) + TRAIL_LIFT, z };
}

/** Trail sampled as a polyline (for tree clearing). */
export function trailPolyline(line: LiftLine, n = 24): XZ[] {
  const pts: XZ[] = [];
  for (let i = 0; i <= n; i++) {
    const p = trailPoint(i / n, line);
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

/** Squared distance from a point to the lift line (bottom → top). */
export function distSqToLiftLine(px: number, pz: number, line: LiftLine): number {
  return distSqToSegment(px, pz, line.bottom.x, line.bottom.z, line.top.x, line.top.z);
}

export type TrailInfluence = {
  w: Float32Array;
  t: Float32Array;
};

/** For each vertex: trail weight and position along `line`'s run-out. */
export function trailInfluence(
  line: LiftLine,
  positions: ArrayLike<number>,
  core = 3.0,
  fade = 6.3,
  n = 40,
): TrailInfluence {
  return trailInfluencePolyline(trailPolyline(line, n), positions, core, fade, n);
}

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