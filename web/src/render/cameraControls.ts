/** Pure camera-control helpers: the play area, a soft target clamp and a tap/drag classifier. */

import { distanceOutsideLease, leaseBounds, nearestLeaseEdge } from "@/game/lease";
import { TERRAIN, type Terrain } from "@/game/terrain";
import { marchToTerrain as marchTerrainCore } from "./terrainPick";

export type XZ = { x: number; z: number };
export type Rect = { xMin: number; xMax: number; zMin: number; zMax: number };

/**
 * Horizontal scale of the playable map. Part 1 uses 1; world scale 2b sets this to 6.
 * Camera limits and play area derive from this single source.
 */
export const WORLD_SCALE = 6;

/** How far past the lease bounding box the camera target may roam, in world units. */
export const LEASE_CAMERA_MARGIN = 8;

/** The lease bounding box plus a margin. The camera target itself follows the lease polygon (see `clampToLease`). */
export function playArea(terrain: Terrain = TERRAIN, margin = LEASE_CAMERA_MARGIN): Rect {
  const b = leaseBounds(terrain);
  return { xMin: b.xMin - margin, xMax: b.xMax + margin, zMin: b.zMin - margin, zMax: b.zMax + margin };
}

/** The farthest the camera target may be from the lease outline, in world units, in every mode. */
export const LEASE_TARGET_MARGIN = 3;
/** Fraction of the margin the target moves freely; resistance builds over the rest. */
const TARGET_FREE_FRACTION = 0.5;

/** The nearest point the camera target may rest on: inside the lease outline plus the margin. */
export function insideLease(p: XZ, terrain: Terrain = TERRAIN, margin = LEASE_TARGET_MARGIN): XZ {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return leaseCentre(terrain);
  if (distanceOutsideLease(p, terrain) <= margin) return p;
  const edge = nearestLeaseEdge(p, terrain);
  if (!edge) return insideArea(p, playArea(terrain));
  const k = margin / Math.max(edge.distance, 1e-9);
  return { x: edge.at.x + (p.x - edge.at.x) * k, z: edge.at.z + (p.z - edge.at.z) * k };
}

function leaseCentre(terrain: Terrain): XZ {
  const b = leaseBounds(terrain);
  return { x: (b.xMin + b.xMax) / 2, z: (b.zMin + b.zMax) / 2 };
}

/**
 * Clamp to the lease polygon plus the margin: unchanged up to half the margin past the outline,
 * then eased so the distance approaches the margin and never exceeds it. The mountain edge, not
 * its bounding box, stops the camera. Every code path that moves the orbit target ends here.
 */
export function clampToLease(p: XZ, terrain: Terrain = TERRAIN, margin = LEASE_TARGET_MARGIN): XZ {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return leaseCentre(terrain);
  const edge = nearestLeaseEdge(p, terrain);
  if (!edge) return insideArea(p, playArea(terrain));
  const free = margin * TARGET_FREE_FRACTION;
  if (distanceOutsideLease(p, terrain) <= free) return p;
  const room = margin - free;
  const eased = free + room * (1 - Math.exp(-(edge.distance - free) / room));
  const k = eased / edge.distance;
  return { x: edge.at.x + (p.x - edge.at.x) * k, z: edge.at.z + (p.z - edge.at.z) * k };
}

/**
 * The part of a requested ground shift `(dx, dz)` that keeps the target within the lease limit.
 * Used by paths that move the camera outside the orbit controls (edge auto-pan, keys), so the
 * target never leaves the limit even for a frame.
 */
export function limitShift(target: XZ, dx: number, dz: number, terrain: Terrain = TERRAIN): XZ {
  const c = insideLease({ x: target.x + dx, z: target.z + dz }, terrain);
  return { x: c.x - target.x, z: c.z - target.z };
}

/** Play area for the current mountain. */
export const PLAY_AREA: Rect = playArea();

/** Overshoot zone (world units) where panning meets resistance. */
export const SOFT_MARGIN = 0.6 * WORLD_SCALE;
/** Hard limit beyond the area, as a fraction of the area's size. */
export const HARD_MARGIN_FRACTION = 0.15;

/** Ray march budget for double-tap terrain focus. */
export const MARCH_MAX_DIST = 120 * WORLD_SCALE;
/** Cap on orbit target Y while panning (14 at 6× play area, 6 at 1×). */
export const TARGET_Y_MAX = WORLD_SCALE >= 6 ? 14 : 6 * WORLD_SCALE;

export const MIN_DISTANCE = 6;
export const MAX_DISTANCE = 190;
export const FOCUS_DISTANCE = 18;

/** Maximum glide animation frames (~1.5 s at 60 fps). */
export const GLIDE_MAX_FRAMES = 90;

const SOFT_RESIST = 0.5;
const FAR_RESIST = 0.25;

/** Eases an overshoot: half speed in the soft zone, quarter beyond it, flat at the hard limit. */
function easeOvershoot(o: number, soft: number, hard: number) {
  const s = Math.min(soft, hard);
  const capped = Math.min(o, hard);
  return capped <= s ? capped * SOFT_RESIST : s * SOFT_RESIST + (capped - s) * FAR_RESIST;
}

function clampAxis(v: number, lo: number, hi: number, soft: number, hardFrac: number) {
  const hard = (hi - lo) * hardFrac;
  if (v > hi) return hi + easeOvershoot(v - hi, soft, hard);
  if (v < lo) return lo - easeOvershoot(lo - v, soft, hard);
  return v;
}

/** Soft clamp: unchanged inside the area, eased in the margin zone, hard beyond area + 15%. */
export function clampTarget(target: XZ, area: Rect, softMargin = SOFT_MARGIN): XZ {
  if (!Number.isFinite(target.x) || !Number.isFinite(target.z)) {
    return { x: (area.xMin + area.xMax) / 2, z: (area.zMin + area.zMax) / 2 };
  }
  return {
    x: clampAxis(target.x, area.xMin, area.xMax, softMargin, HARD_MARGIN_FRACTION),
    z: clampAxis(target.z, area.zMin, area.zMax, softMargin, HARD_MARGIN_FRACTION),
  };
}

/** The nearest point inside the area, used to ease the target back after release. */
export function insideArea(p: XZ, area: Rect): XZ {
  return {
    x: Math.min(area.xMax, Math.max(area.xMin, p.x)),
    z: Math.min(area.zMax, Math.max(area.zMin, p.z)),
  };
}

/** World-space hard pan limit on one axis (area edge plus soft margin). */
export function hardLimitOnAxis(area: Rect, softMargin = SOFT_MARGIN): { x: number; z: number } {
  const w = area.xMax - area.xMin;
  const d = area.zMax - area.zMin;
  const hX = w * HARD_MARGIN_FRACTION + softMargin;
  const hZ = d * HARD_MARGIN_FRACTION + softMargin;
  return { x: hX, z: hZ };
}

export const TAP_MAX_MOVE_PX = 8;
export const TAP_MAX_MS = 250;
export const DOUBLE_TAP_MAX_GAP_MS = 300;
export const DOUBLE_TAP_MAX_DIST_PX = 24;

export type PointerEv = { id: number; type: "down" | "move" | "up"; x: number; y: number; t: number };
export type TapRecord = { x: number; y: number; t: number };
export type GestureKind = "TAP" | "DOUBLE_TAP" | "DRAG";

/** True once a pointer has travelled far enough from where it went down to be a drag, not a tap. */
export function exceedsTapSlop(dx: number, dy: number) {
  return Math.hypot(dx, dy) >= TAP_MAX_MOVE_PX;
}

/**
 * Classifies one finished gesture (down through up). A single pointer that stays
 * under the move and time limits is a TAP; a TAP near and soon after `prevTap`
 * (the previous tap's up) is a DOUBLE_TAP. Everything else is a DRAG.
 */
export function classifyPointer(
  events: readonly PointerEv[],
  prevTap?: TapRecord | null,
  maxTapMs: number = TAP_MAX_MS,
): GestureKind {
  const first = events[0];
  const last = events[events.length - 1];
  if (!first || first.type !== "down" || last.type !== "up") return "DRAG";
  if (events.some((e) => e.id !== first.id)) return "DRAG";
  if (last.t - first.t >= maxTapMs) return "DRAG";
  if (events.some((e) => exceedsTapSlop(e.x - first.x, e.y - first.y))) return "DRAG";
  if (
    prevTap &&
    first.t - prevTap.t <= DOUBLE_TAP_MAX_GAP_MS &&
    Math.hypot(first.x - prevTap.x, first.y - prevTap.y) <= DOUBLE_TAP_MAX_DIST_PX
  ) {
    return "DOUBLE_TAP";
  }
  return "TAP";
}


/** First point along a ray that is at or below the terrain, found by marching then bisecting. */
export function marchToTerrain(
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  height: (x: number, z: number) => number,
  maxDist = MARCH_MAX_DIST,
  step = 0.25,
): XZ | null {
  return marchTerrainCore(origin, dir, height, maxDist, step);
}

export type Vec3 = { x: number; y: number; z: number };

/** Elevation of the camera above the horizon, in radians, as seen from the orbit target. */
export const PAINT_ELEVATION = 1.2;

/** Elevation of `position` above the horizon around `target`, in radians. */
export function elevationOf(target: Vec3, position: Vec3): number {
  const len = Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z);
  return len > 0 ? Math.asin(Math.max(-1, Math.min(1, (position.y - target.y) / len))) : 0;
}

/** `position` turned about `target` to a new elevation, keeping its distance and heading. */
export function withElevation(target: Vec3, position: Vec3, elevation: number): Vec3 {
  const dx = position.x - target.x;
  const dz = position.z - target.z;
  const len = Math.hypot(dx, position.y - target.y, dz);
  const flat = Math.hypot(dx, dz);
  const ux = flat > 1e-9 ? dx / flat : 0;
  const uz = flat > 1e-9 ? dz / flat : 1;
  return {
    x: target.x + ux * Math.cos(elevation) * len,
    y: target.y + Math.sin(elevation) * len,
    z: target.z + uz * Math.cos(elevation) * len,
  };
}

/** The tilted elevation for paint mode, or null when the camera is already that high. */
export function paintTiltElevation(current: number, goal = PAINT_ELEVATION): number | null {
  return current >= goal - 0.02 ? null : goal;
}
