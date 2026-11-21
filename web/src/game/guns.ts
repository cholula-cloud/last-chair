import { TALENT } from "./talents";
import { ASSET_CATALOG } from "./base";
import { footprintOnLease } from "./lease";
import { TERRAIN, type Terrain, type XZ } from "./terrain";
import type { TrailRun } from "./trails";
import type { SnowPreset, Wind } from "./types";

export type SnowGun = { at: XZ; builtDay: number; paid: number; name?: string };
export type GunPlacementReason = "off_map" | "off_lease" | "out_of_pipe_reach" | "max_guns" | "gun_here";

export const GUN_COST = ASSET_CATALOG.snow_guns.cost;
export const MAX_GUNS_BASE = 10;
export const MAX_GUNS_CAP = 18;
/** @deprecated use maxGunsFor */
export const MAX_GUNS = MAX_GUNS_BASE;
export const PIPE_REACH_DESIGN = 0.72;
/** On gusty nights, gun reach scales down on exposed segments (B5 clearing). */
export const GUN_WIND_EXPOSURE = 0.35;
/** Ground a snow gun and its hydrant box occupy, as a square side in design units. */
export const GUN_FOOTPRINT_DESIGN = 0.1;
export const GUN_RADIUS_DESIGN = 0.5;
export const GROOM_FT: Record<SnowPreset, number> = { minimal: 0, mid: 3000, high: 5000 };
/** Mid/High groom budget without a maintenance garage on the hill. */
export const GROOM_WITHOUT_GARAGE = 0.4;

const distance = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z);

export type GunCoverageOpts = {
  wind?: Wind;
  exposure?: readonly number[];
};

/** Gun cap grows with open trail mileage (Dutch Hill stays within MAX_GUNS_CAP). */
export function maxGunsFor(trails: readonly { open: boolean; lengthFt?: number }[]): number {
  const openFt = trails.filter((t) => t.open).reduce((sum, t) => sum + (t.lengthFt ?? 0), 0);
  if (openFt <= 0) return MAX_GUNS_BASE;
  return Math.min(MAX_GUNS_CAP, Math.max(MAX_GUNS_BASE, Math.ceil(openFt / 1500)));
}

export function gunPlacementReason(
  at: XZ,
  guns: readonly SnowGun[],
  terrain: Terrain = TERRAIN,
  maxGuns: number = MAX_GUNS_BASE,
): GunPlacementReason | null {
  const { xMin, xMax, zMin, zMax } = terrain.bounds;
  if (!Number.isFinite(at.x) || !Number.isFinite(at.z) ||
    at.x < xMin || at.x > xMax || at.z < zMin || at.z > zMax) return "off_map";
  if (!footprintOnLease(at, GUN_FOOTPRINT_DESIGN * terrain.scale.horizontal, GUN_FOOTPRINT_DESIGN * terrain.scale.horizontal, terrain)) return "off_lease";
  if (guns.length >= maxGuns) return "max_guns";
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
  opts: GunCoverageOpts = {},
): boolean[] {
  const talentFactor = TALENT.trailGuns.learned(talentsOwned) ? 1 + TALENT.trailGuns.extraReach : 1;
  const baseReach = GUN_RADIUS_DESIGN * terrain.scale.horizontal * talentFactor;
  const midpoints = trailSegmentMidpoints(trail);
  const gusty = opts.wind === "gusty";
  return trail.snow.map((_, i) => {
    const at = midpoints[i];
    if (!at) return false;
    const windFactor = gusty
      ? Math.max(0.35, 1 - GUN_WIND_EXPOSURE * (opts.exposure?.[i] ?? 0))
      : 1;
    const reach = baseReach * windFactor;
    return guns.some((gun) => distance(gun.at, at) <= reach);
  });
}

type GroomTrail = Pick<TrailRun, "lengthFt" | "open" | "snow">;

/** Each snow segment uses a share of the night's budget. A partially covered segment stays ungroomed. */
export function groomCoverage(
  trails: readonly GroomTrail[],
  runsByTrail: readonly number[],
  preset: SnowPreset,
  talentsOwned: readonly string[] = [],
  hasGarage = true,
): boolean[][] {
  const coverage = trails.map((trail) => trail.snow.map(() => false));
  const garageFactor = preset === "minimal" || hasGarage ? 1 : GROOM_WITHOUT_GARAGE;
  const talentFactor = TALENT.groomPass.learned(talentsOwned) ? TALENT.groomPass.capacity : 1;
  let remainingFt = GROOM_FT[preset] * garageFactor * talentFactor;
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

/** Feet of trail the cat would groom tonight at this preset (open trails only). */
export function groomedFeet(
  trails: readonly GroomTrail[],
  runsByTrail: readonly number[],
  preset: SnowPreset,
  talentsOwned: readonly string[] = [],
  hasGarage = true,
): number {
  const coverage = groomCoverage(trails, runsByTrail, preset, talentsOwned, hasGarage);
  let ft = 0;
  trails.forEach((trail, i) => {
    if (!trail.open || trail.lengthFt <= 0) return;
    const segmentFt = trail.lengthFt / Math.max(1, trail.snow.length);
    coverage[i]?.forEach((on) => {
      if (on) ft += segmentFt;
    });
  });
  return Math.round(ft);
}

/** Open-trail segments inside gun reach tonight (Mid/High; uses same wind/exposure rules as sleep). */
export function gunSegmentsTonight(
  trails: readonly (SnowPath & Pick<TrailRun, "open">)[],
  guns: readonly SnowGun[],
  preset: SnowPreset,
  talentsOwned: readonly string[] = [],
  wind?: Wind,
  exposureByTrail?: readonly (readonly number[])[],
): number {
  if (preset === "minimal" || guns.length === 0) return 0;
  let n = 0;
  trails.forEach((trail, i) => {
    if (!trail.open) return;
    const opts: GunCoverageOpts = { wind, exposure: exposureByTrail?.[i] };
    const row = gunCoverage(trail, guns, talentsOwned, TERRAIN, opts);
    n += row.filter(Boolean).length;
  });
  return n;
}

export function gunCoverageForTrails(
  trails: readonly (SnowPath & Pick<TrailRun, "open">)[],
  guns: readonly SnowGun[],
  talentsOwned: readonly string[],
  wind: Wind | undefined,
  exposureByTrail: readonly (readonly number[])[],
): boolean[][] {
  return trails.map((trail, i) =>
    trail.open
      ? gunCoverage(trail, guns, talentsOwned, TERRAIN, { wind, exposure: exposureByTrail[i] })
      : [],
  );
}

/** Convert the old building to a base-connected chain. Migration does not charge cash. */
export function migrateLegacyGuns(
  trails: readonly Pick<TrailRun, "open" | "path">[],
  builtDay: number,
  terrain: Terrain = TERRAIN,
  maxGuns: number = maxGunsFor(trails),
): SnowGun[] {
  const guns: SnowGun[] = [];
  const spacing = PIPE_REACH_DESIGN * terrain.scale.horizontal * 0.95;
  for (const trail of trails) {
    if (!trail.open) continue;
    for (const at of sampleSnowPath(trail.path, [0.95, 0.8, 0.65])) {
      if (guns.length >= maxGuns) return guns;
      const anchors = [terrain.base, ...guns.map((gun) => gun.at)];
      const closest = anchors.reduce((a, b) => distance(at, a) <= distance(at, b) ? a : b);
      const steps = Math.ceil(distance(closest, at) / spacing);
      for (let i = 1; i <= steps; i++) {
        if (guns.length >= maxGuns) return guns;
        const point = { x: closest.x + (at.x - closest.x) * i / steps, z: closest.z + (at.z - closest.z) * i / steps };
        if (!gunPlacementReason(point, guns, terrain, maxGuns)) guns.push({ at: point, builtDay, paid: 0 });
      }
    }
  }
  return guns.length ? guns : [{ at: { ...terrain.base }, builtDay, paid: 0 }];
}
