/** Pure helpers for trail painting: brush size, edge auto-pan, ribbon detail and colours. */

import { TERRAIN, type XZ } from "@/game/terrain";
import type { TrailDifficulty } from "@/game/types";

/** Fraction of the screen, per side, where the brush starts to pan the map. */
export const EDGE_MARGIN = 0.1;
/** Pan speed at full depth into the margin, as a fraction of the camera distance per second. */
export const EDGE_PAN_SPEED = 0.5;
/** A resting finger keeps panning this long after its last move, then eases to a stop. */
export const PAN_HOLD_MS = 150;
/** Time still at which the edge pan has stopped completely. */
export const PAN_STILL_MS = 300;
/** Pointer travel, in pixels, that counts as the finger moving. */
export const PAN_MOVE_PX = 2;
/** Fewest and most cross-sections a painted ribbon is built with. */
export const MIN_RIBBON_SEGMENTS = 40;
export const MAX_RIBBON_SEGMENTS = 768;
/** Cap on cross-sections while a finger is still painting; full detail is built on release. */
export const LIVE_RIBBON_SEGMENTS = 120;
/** The most points one stroke holds. */
export const MAX_STROKE_POINTS = 512;
export const STROKE_FULL_REASON = "That’s as long as a trail gets. Lift your finger to finish.";
type Pair = { x: number; z: number };

/** Radius, in world units, of a brush `widthFt` feet wide: the width the trail is actually cut. */
export function brushRadius(widthFt: number, feetPerUnit = TERRAIN.horizontalFeetPerUnit): number {
  return widthFt / (2 * feetPerUnit);
}

/** World size of one screen pixel at `distance` from a perspective camera. */
export function pixelWorldSize(distance: number, fovDeg: number, viewportHeightPx: number): number {
  return (2 * distance * Math.tan((fovDeg * Math.PI) / 360)) / Math.max(1, viewportHeightPx);
}

const edgeDepth = (pos: number, size: number, margin: number): number => {
  const band = size * margin;
  if (!(band > 0)) return 0;
  if (pos < band) return -Math.min(1, (band - pos) / band);
  if (pos > size - band) return Math.min(1, (pos - (size - band)) / band);
  return 0;
};

/**
 * How far the pointer is into the screen-edge margin, per axis, from -1 to 1. x is positive toward
 * the right edge and y is positive toward the top edge. Zero outside the margin, one at the edge.
 */
export function edgePanInput(
  x: number, y: number, width: number, height: number, margin = EDGE_MARGIN, out: Pair = { x: 0, z: 0 },
): XZ {
  const dx = edgeDepth(x, width, margin);
  const dy = edgeDepth(y, height, margin);
  out.x = dx;
  out.z = dy === 0 ? 0 : -dy;
  return out;
}

/**
 * Height of the screen area the brush can use: from the canvas top down to the top of the build
 * panel when one overlaps the canvas, so the bottom margin sits above the panel.
 */
export function usableHeight(canvasTop: number, canvasHeight: number, panelTop: number | null): number {
  if (panelTop === null) return canvasHeight;
  return Math.max(1, Math.min(canvasHeight, panelTop - canvasTop));
}

/**
 * Ground velocity, in world units per second, for an edge pan. `right` and `forward` are the
 * camera's unit directions on the ground. Speed grows with depth into the margin and with distance
 * from the ground, so the map slides at the same screen speed at any zoom.
 */
export function edgePanVelocity(
  input: XZ, right: XZ, forward: XZ, distance: number, speed = EDGE_PAN_SPEED, out: Pair = { x: 0, z: 0 },
): XZ {
  const scale = distance * speed;
  out.x = (right.x * input.x + forward.x * input.z) * scale;
  out.z = (right.z * input.x + forward.z * input.z) * scale;
  return out;
}

/**
 * How much of the edge pan to apply, from 0 to 1, given the time since the pointer last moved:
 * full while it is moving, easing to zero by `PAN_STILL_MS`, so a finger resting at the edge stops the map.
 */
export function panDrive(stillMs: number, hold = PAN_HOLD_MS, stop = PAN_STILL_MS): number {
  if (!(stillMs > hold)) return 1;
  if (stillMs >= stop) return 0;
  return 1 - (stillMs - hold) / (stop - hold);
}

/** One cross-section per stroke point, never fewer than the minimum, never more than the cap. */
export function ribbonSegmentCount(pathPoints: number, live = false): number {
  const full = Math.min(MAX_RIBBON_SEGMENTS, Math.max(MIN_RIBBON_SEGMENTS, Math.floor(pathPoints)));
  return live ? Math.min(LIVE_RIBBON_SEGMENTS, full) : full;
}

export const DIFFICULTY_COLOR: Record<TrailDifficulty, string> = {
  green: "#197641",
  blue: "#195dc4",
  black: "#28263e",
};

/** How much darker the ribbon edge band is than its fill. */
export const EDGE_DARKEN = 0.62;

/** Paint preview uses the run’s difficulty colour; invalid segments are marked on the ribbon, not by tinting the whole stroke. */
export function ribbonColor(difficulty: TrailDifficulty): string {
  return DIFFICULTY_COLOR[difficulty];
}

/** A confirmed trail seen behind a draft: lightened toward white so the draft keeps the stronger colour. */
export function contextColor(hex: string, amount = 0.45): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const part = (shift: number) => {
    const c = (n >> shift) & 255;
    return Math.round(c + (255 - c) * amount).toString(16).padStart(2, "0");
  };
  return `#${part(16)}${part(8)}${part(0)}`;
}

/** A darker shade of a #rrggbb colour, for the ribbon edge band. */
export function darken(hex: string, factor = EDGE_DARKEN): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const part = (shift: number) => Math.round(((n >> shift) & 255) * factor).toString(16).padStart(2, "0");
  return `#${part(16)}${part(8)}${part(0)}`;
}
