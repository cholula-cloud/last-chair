/** Pure camera-control helpers: the play area, a soft target clamp and a tap/drag classifier. */

export type XZ = { x: number; z: number };
export type Rect = { xMin: number; xMax: number; zMin: number; zMax: number };

/**
 * Horizontal scale of the playable map. Part 1 uses 1; world scale 2b sets this to 6.
 * Camera limits and play area derive from this single source.
 */
export const WORLD_SCALE = 6;

/** Design play rectangle before horizontal scale (village + hill at 1x). */
const BASE_PLAY_AREA: Rect = { xMin: -5.5, xMax: 6.5, zMin: -5.5, zMax: 4.5 };

/** Scaled ground rectangle the camera target may roam, in world units. */
export function playArea(scale = WORLD_SCALE): Rect {
  return {
    xMin: BASE_PLAY_AREA.xMin * scale,
    xMax: BASE_PLAY_AREA.xMax * scale,
    zMin: BASE_PLAY_AREA.zMin * scale,
    zMax: BASE_PLAY_AREA.zMax * scale,
  };
}

/** Play area at the current {@link WORLD_SCALE}. */
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
export const MAX_DISTANCE = 170;
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
export function classifyPointer(events: readonly PointerEv[], prevTap?: TapRecord | null): GestureKind {
  const first = events[0];
  const last = events[events.length - 1];
  if (!first || first.type !== "down" || last.type !== "up") return "DRAG";
  if (events.some((e) => e.id !== first.id)) return "DRAG";
  if (last.t - first.t >= TAP_MAX_MS) return "DRAG";
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
  const at = (d: number) => ({ x: origin.x + dir.x * d, y: origin.y + dir.y * d, z: origin.z + dir.z * d });
  const below = (d: number) => {
    const p = at(d);
    return p.y <= height(p.x, p.z);
  };
  for (let d = 0; d < maxDist; d += step) {
    if (!below(d + step)) continue;
    let lo = d;
    let hi = d + step;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (below(mid)) hi = mid;
      else lo = mid;
    }
    const p = at(hi);
    return { x: p.x, z: p.z };
  }
  return null;
}