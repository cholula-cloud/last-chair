/** Lift viability: a lift line (bottom to top) must climb enough, stay short, and stand on loadable ground. */

import { formatMoney } from "./format";
import { OFF_LEASE_MESSAGE, onLease, segmentOnLease } from "./lease";
import { TERRAIN, type Terrain, type XZ } from "./terrain";
import type { LiftType } from "./types";

export type LiftAnchor = { x: number; z: number };

/** A lift as a segment on the map: where skiers board and where they unload. */
export type LiftLine = { bottom: XZ; top: XZ };

/** A named top terminal used as a reference point (default lift, interim build buttons, tests). */
export type ReferenceTop = LiftAnchor & { label: string };

// The constants below are DESIGN values (Dutch Hill at 1/1). `rulesFor(terrain)`
// turns them into world limits: lengths and spacings times H, vertical times V,
// grade times V / H.

/** Least height (design units) the top terminal must stand above the bottom. */
export const MIN_LIFT_VERTICAL = 0.85;
/** Longest lift, horizontal distance bottom to top (design units). */
export const MAX_LIFT_LENGTH = 3.4;
export const MAX_SURFACE_LIFT_LENGTH = 3;
/**
 * Steepest ground a terminal may stand on (rise over run). The toy hill
 * exaggerates vertical, so its face runs near 1.0; the rollover band is about 1.8.
 */
export const MAX_LOAD_GRADE = 1.25;
/** The bottom terminal may move this far from `TERRAIN.base` (the base lodge apron). */
export const BASE_AREA_RADIUS = 0.6;
/** Most lifts on the hill, the default surface lift included. */
export const MAX_LIFTS = 3;
/** Lifetime slot cap, including permanently closed lifts. */
export const MAX_LIFT_SLOTS = 12;
/** Least distance between two top terminals. */
export const MIN_TOP_SPACING = 0.8;
/** Least distance between a top terminal and any other lift's line. */
export const MIN_LINE_CLEARANCE = 0.4;

export type PlacementRules = {
  minLiftVertical: number;
  maxLiftLength: number;
  maxLoadGrade: number;
  baseAreaRadius: number;
  minTopSpacing: number;
  minLineClearance: number;
};

/** Placement limits in the terrain's world units. Equals the constants at scale 1/1. */
export function rulesFor(terrain: Terrain = TERRAIN, type: LiftType = "chair"): PlacementRules {
  const { horizontal: H, vertical: V } = terrain.scale;
  return {
    minLiftVertical: MIN_LIFT_VERTICAL * V,
    maxLiftLength: (type === "surface" ? MAX_SURFACE_LIFT_LENGTH : MAX_LIFT_LENGTH) * H,
    maxLoadGrade: (MAX_LOAD_GRADE * V) / H,
    baseAreaRadius: BASE_AREA_RADIUS * H,
    minTopSpacing: MIN_TOP_SPACING * H,
    minLineClearance: MIN_LINE_CLEARANCE * H,
  };
}

export type PlacementReason =
  | "lodge_tier"
  | "max_lifts"
  | "off_map"
  | "off_lease"
  | "bottom_far"
  | "base_occupied"
  | "too_steep"
  | "too_low"
  | "too_long"
  | "too_close"
  | "crosses"
  | "cash";

export type LineCheck =
  | { ok: true; length: number; vertical: number }
  | { ok: false; reason: PlacementReason };

export function liftLength(line: LiftLine): number {
  return Math.hypot(line.top.x - line.bottom.x, line.top.z - line.bottom.z);
}

export function liftVertical(line: LiftLine, terrain: Terrain = TERRAIN): number {
  return terrain.height(line.top.x, line.top.z) - terrain.height(line.bottom.x, line.bottom.z);
}

function onMap(p: XZ, terrain: Terrain): boolean {
  const { bounds } = terrain;
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.z) &&
    p.x >= bounds.xMin &&
    p.x <= bounds.xMax &&
    p.z >= bounds.zMin &&
    p.z <= bounds.zMax
  );
}

/** Terrain checks for a new placement (`enforceLease: false` revalidates a saved lift), in reason order: off_map, off_lease, bottom_far, too_steep, too_low, too_long. */
export function checkLiftLine(
  line: LiftLine,
  terrain: Terrain = TERRAIN,
  type: LiftType = "chair",
  options: { enforceLease?: boolean } = {},
): LineCheck {
  const { bottom, top } = line;
  const r = rulesFor(terrain, type);
  if (!onMap(bottom, terrain) || !onMap(top, terrain)) return { ok: false, reason: "off_map" };
  if (options.enforceLease !== false &&
    (!onLease(bottom, terrain) || !onLease(top, terrain) || !segmentOnLease(bottom, top, terrain))) {
    return { ok: false, reason: "off_lease" };
  }
  if (Math.hypot(bottom.x - terrain.base.x, bottom.z - terrain.base.z) > r.baseAreaRadius) {
    return { ok: false, reason: "bottom_far" };
  }
  if (terrain.grade(bottom.x, bottom.z) > r.maxLoadGrade || terrain.grade(top.x, top.z) > r.maxLoadGrade) {
    return { ok: false, reason: "too_steep" };
  }
  const vertical = liftVertical(line, terrain);
  if (vertical < r.minLiftVertical) return { ok: false, reason: "too_low" };
  const length = liftLength(line);
  if (length > r.maxLiftLength) return { ok: false, reason: "too_long" };
  return { ok: true, length, vertical };
}

function distToSegment(p: XZ, a: XZ, b: XZ): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

/** Where two segments cross, or null unless they properly intersect (shared endpoints and touching do not count). */
function properCrossing(a: LiftLine, b: LiftLine): XZ | null {
  const rx = a.top.x - a.bottom.x;
  const rz = a.top.z - a.bottom.z;
  const sx = b.top.x - b.bottom.x;
  const sz = b.top.z - b.bottom.z;
  const denom = rx * sz - rz * sx;
  if (denom === 0) return null;
  const qx = b.bottom.x - a.bottom.x;
  const qz = b.bottom.z - a.bottom.z;
  const t = (qx * sz - qz * sx) / denom;
  const u = (qx * rz - qz * rx) / denom;
  if (t <= 0 || t >= 1 || u <= 0 || u >= 1) return null;
  return { x: a.bottom.x + t * rx, z: a.bottom.z + t * rz };
}

export type SpacingConflict = { reason: "too_close" | "crosses"; type: LiftType };

/**
 * Spacing against the lifts already built, in reason order: too_close
 * (top spacing, then line clearance either way), then crosses. Bottoms may
 * coincide, and lines may cross inside the base area where every line starts.
 */
export function checkSpacing(
  line: LiftLine,
  others: readonly { line: LiftLine; type: LiftType }[],
  terrain: Terrain = TERRAIN,
): SpacingConflict | null {
  const r = rulesFor(terrain);
  for (const o of others) {
    const apart = Math.hypot(line.top.x - o.line.top.x, line.top.z - o.line.top.z);
    if (
      apart < r.minTopSpacing ||
      distToSegment(line.top, o.line.bottom, o.line.top) < r.minLineClearance ||
      distToSegment(o.line.top, line.bottom, line.top) < r.minLineClearance
    ) {
      return { reason: "too_close", type: o.type };
    }
  }
  for (const o of others) {
    const at = properCrossing(line, o.line);
    if (at && Math.hypot(at.x - terrain.base.x, at.z - terrain.base.z) > r.baseAreaRadius) {
      return { reason: "crosses", type: o.type };
    }
  }
  return null;
}

/** Player-facing copy for a reason code. `type` fills too_close; `need` fills cash. */
export function placementReason(
  code: PlacementReason,
  ctx: { type?: LiftType; need?: number; liftType?: LiftType } = {},
): string {
  switch (code) {
    case "lodge_tier": return "Double chairs need Lodge Tier 2. Upgrade the lodge first.";
    case "max_lifts":
      return `Dutch Hill only has room for ${MAX_LIFTS} lifts.`;
    case "off_map":
      return "That spot is off the map. Drag back onto the hill.";
    case "off_lease":
      return OFF_LEASE_MESSAGE;
    case "bottom_far":
      return "Start the lift near the base lodge.";
    case "base_occupied":
      return "Too close to the base buildings. Slide the terminal over.";
    case "too_steep":
      return "Too steep for a terminal. Look for flatter ground.";
    case "too_low":
      return "Not enough drop for a run. Pick a higher top.";
    case "too_long":
      return ctx.liftType === "surface"
        ? "Too long for a surface lift. Try a double chair or a closer top."
        : "Too long for one lift. Pick a closer top.";
    case "too_close":
      return `Too close to the ${ctx.type ?? "other"} lift. Spread them out.`;
    case "crosses":
      return "That crosses another lift line. Move one end.";
    case "cash":
      return `Wallet’s ${formatMoney(Math.ceil(ctx.need ?? 0))} short for the deposit.`;
  }
}

/** World-space lift tops at Dutch Hill 6×/3×; literals match `TERRAIN.toWorld(design)`. */
export const REFERENCE_TOPS: ReferenceTop[] = [
  { x: -7.2, z: 1.2, label: "Ridge" },
  { x: 4.8, z: 3.6, label: "Mid" },
  { x: -1.2, z: 6.0, label: "Creek" },
];
