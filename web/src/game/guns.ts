import { footprintOnLease } from "./lease";
import { TERRAIN, type Terrain, type XZ } from "./terrain";
import type { TrailRun } from "./trails";
import type { SnowPreset } from "./types";

export type SnowGun = { at: XZ; builtDay: number; paid: number };
export type GunPlacementReason = "off_map" | "off_lease" | "out_of_pipe_reach" | "max_guns" | "gun_here";

export const GUN_COST = 400;
export const MAX_GUNS = 10;
export const PIPE_REACH_DESIGN = 0.6;
/** Ground a snow gun and its hydrant box occupy, as a square side in design units. */
export const GUN_FOOTPRINT_DESIGN = 0.1;
export const GUN_RADIUS_DESIGN = 0.5;
export const GROOM_FT: Record<SnowPreset, number> = { minimal: 0, mid: 3000, high: 5000 };

const distance = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z);

export function gunPlacementReason(
  at: XZ,
  guns: readonly SnowGun[],
  terrain: Terrain = TERRAIN,
): GunPlacementReason | null {
  const { xMin, xMax, zMin, zMax } = terrain.bounds;
  if (!Number.isFinite(at.x) || !Number.isFinite(at.z) ||
    at.x < xMin || at.x > xMax || at.z < zMin || at.z > zMax) return "off_map";
  if (!footprintOnLease(at, GUN_FOOTPRINT_DESIGN * terrain.scale.horizontal, GUN_FOOTPRINT_DESIGN * terrain.scale.horizontal, terrain)) return "off_lease";
  if (guns.length >= MAX_GUNS) return "max_guns";
  if (guns.some((gun) => distance(at, gun.at) < 0.01 * terrain.scale.horizontal)) return "gun_here";
  const reach = PIPE_REACH_DESIGN * terrain.scale.horizontal;
  const connected = distance(at, terrain.base) <= reach || guns.some((gun) => distance(at, gun.at) <= reach);
  return connected ? null : "out_of_pipe_reach";
}

/** Sample a path by cumulative ground distance, from summit (0) to base (1). */
export function sampleSnowPath(path: readonly XZ[], fractions: readonly number[]): XZ[] {
  if (!path.length) return [];
  const distances = [0];
  for (let i = 1; i < path.length; i++) {
    distances.push(distances[i - 1] + distance(path[i - 1], path[i]));
  }
  const total = distances.at(-1) ?? 0;
  return fractions.map((fraction) => {
    const at = Math.min(1, Math.max(0, fraction)) * total;
    if (at <= 0) return path[0];
    const i = distances.findIndex((length) => length >= at);
    const a = path[i - 1];
    const b = path[i];
    const t = (at - distances[i - 1]) / (distances[i] - distances[i - 1]);
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
  });
}

type SnowPath = Pick<TrailRun, "path" | "snow">;

export function trailSegmentMidpoints(trail: SnowPath): XZ[] {
  const fractions = trail.snow.map((_, i) => (i + 0.5) / trail.snow.length);
  return sampleSnowPath(trail.path, fractions);
}

export function gunCoverage(
  trail: SnowPath,
  guns: readonly SnowGun[],
  talentsOwned: readonly string[] = [],
  terrain: Terrain = TERRAIN,
): boolean[] {
  const talentFactor = talentsOwned.includes("trail_guns") ? 1.25 : 1;
  const reach = GUN_RADIUS_DESIGN * terrain.scale.horizontal * talentFactor;
  const midpoints = trailSegmentMidpoints(trail);
  return trail.snow.map((_, i) => {
    const at = midpoints[i];
    return Boolean(at && guns.some((gun) => distance(gun.at, at) <= reach));
  });
}

type GroomTrail = Pick<TrailRun, "lengthFt" | "open" | "snow">;

/** Each snow segment uses a share of the night's budget. A partially covered segment stays ungroomed. */
export function groomCoverage(
  trails: readonly GroomTrail[],
  runsByTrail: readonly number[],
  preset: SnowPreset,
  talentsOwned: readonly string[] = [],
): boolean[][] {
  const coverage = trails.map((trail) => trail.snow.map(() => false));
  let remainingFt = GROOM_FT[preset] * (talentsOwned.includes("groom_pass") ? 1.2 : 1);
  if (remainingFt <= 0) return coverage;

  const order = trails.map((trail, index) => ({ trail, index, runs: runsByTrail[index] ?? 0 }))
    .filter(({ trail }) => trail.open && trail.snow.length > 0 && trail.lengthFt > 0)
    .sort((a, b) => b.runs - a.runs || a.index - b.index);
  for (const { trail, index } of order) {
    const segmentFt = trail.lengthFt / trail.snow.length;
    for (let segment = trail.snow.length - 1; segment >= 0; segment--) {
      if (remainingFt + 1e-9 < segmentFt) return coverage;
      coverage[index][segment] = true;
      remainingFt -= segmentFt;
    }
  }
  return coverage;
}

/** Convert the old building to a base-connected chain. Migration does not charge cash. */
export function migrateLegacyGuns(
  trails: readonly Pick<TrailRun, "open" | "path">[],
  builtDay: number,
  terrain: Terrain = TERRAIN,
): SnowGun[] {
  const guns: SnowGun[] = [];
  const spacing = PIPE_REACH_DESIGN * terrain.scale.horizontal * 0.95;
  for (const trail of trails) {
    if (!trail.open) continue;
    for (const at of sampleSnowPath(trail.path, [0.95, 0.8, 0.65])) {
      if (guns.length >= MAX_GUNS) return guns;
      const anchors = [terrain.base, ...guns.map((gun) => gun.at)];
      const closest = anchors.reduce((a, b) => distance(at, a) <= distance(at, b) ? a : b);
      const steps = Math.ceil(distance(closest, at) / spacing);
      for (let i = 1; i <= steps; i++) {
        if (guns.length >= MAX_GUNS) return guns;
        const point = { x: closest.x + (at.x - closest.x) * i / steps, z: closest.z + (at.z - closest.z) * i / steps };
        if (!gunPlacementReason(point, guns, terrain)) guns.push({ at: point, builtDay, paid: 0 });
      }
    }
  }
  return guns.length ? guns : [{ at: { ...terrain.base }, builtDay, paid: 0 }];
}
