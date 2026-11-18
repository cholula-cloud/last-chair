/** Pure helpers for trail painting: brush size, edge auto-pan, ribbon detail and colours. */

import { TERRAIN, type XZ } from "@/game/terrain";
import type { TrailDifficulty } from "@/game/types";

/** Fraction of the screen, per side, where the brush starts to pan the map. */
export const EDGE_MARGIN = 0.1;
/** Pan speed at full depth into the margin, as a fraction of the camera distance per second. */
export const EDGE_PAN_SPEED = 0.5;
/** Fewest and most cross-sections a painted ribbon is built with. */
export const MIN_RIBBON_SEGMENTS = 40;
export const MAX_RIBBON_SEGMENTS = 768;

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
export function edgePanInput(x: number, y: number, width: number, height: number, margin = EDGE_MARGIN): XZ {
  const dx = edgeDepth(x, width, margin);
  const dy = edgeDepth(y, height, margin);
  return { x: dx, z: dy === 0 ? 0 : -dy };
}

/**
 * Ground velocity, in world units per second, for an edge pan. `right` and `forward` are the
 * camera's unit directions on the ground. Speed grows with depth into the margin and with distance
 * from the ground, so the map slides at the same screen speed at any zoom.
 */
export function edgePanVelocity(input: XZ, right: XZ, forward: XZ, distance: number, speed = EDGE_PAN_SPEED): XZ {
  const scale = distance * speed;
  return {
    x: (right.x * input.x + forward.x * input.z) * scale,
    z: (right.z * input.x + forward.z * input.z) * scale,
  };
}

/** One cross-section per stroke point, never fewer than the minimum, never more than the cap. */
export function ribbonSegmentCount(pathPoints: number): number {
  return Math.min(MAX_RIBBON_SEGMENTS, Math.max(MIN_RIBBON_SEGMENTS, Math.floor(pathPoints)));
}

export const DIFFICULTY_COLOR: Record<TrailDifficulty, string> = {
  green: "#197641",
  blue: "#195dc4",
  black: "#28263e",
};

/** Warm grey for a stroke that cannot be cut yet. */
export const UNVALIDATED_COLOR = "#8a8175";
/** How much darker the ribbon edge band is than its fill. */
export const EDGE_DARKEN = 0.62;

/** The ribbon fill: the difficulty colour once the stroke can be cut, warm grey until then. */
export function ribbonColor(difficulty: TrailDifficulty, validated: boolean): string {
  return validated ? DIFFICULTY_COLOR[difficulty] : UNVALIDATED_COLOR;
}

/** A darker shade of a #rrggbb colour, for the ribbon edge band. */
export function darken(hex: string, factor = EDGE_DARKEN): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const part = (shift: number) => Math.round(((n >> shift) & 255) * factor).toString(16).padStart(2, "0");
  return `#${part(16)}${part(8)}${part(0)}`;
}
