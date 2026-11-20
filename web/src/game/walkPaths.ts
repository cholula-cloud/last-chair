import type { Terrain, XZ } from "./terrain";
import { pathLengthWorld } from "./trails";

/** World-unit distance past which a trail end counts as remote from lift base or village. Scales with mountain size. */
export function remoteTrailEndThreshold(terrain: Terrain): number {
  return 0.5 * terrain.scale.horizontal;
}

/** Guest walk from a trail end back to the lift queue: follow the run downhill, then beside the lift to the bottom. */
export function walkToLiftPath(trailPath: readonly XZ[] | undefined, liftBottom: XZ): readonly XZ[] {
  if (!trailPath?.length) return [liftBottom, liftBottom];
  const top = trailPath[0]!;
  return [...[...trailPath].reverse(), top, liftBottom];
}

/** Guest walk from a remote trail end toward the village base along the painted corridor. */
export function walkToBasePath(trailPath: readonly XZ[] | undefined, base: XZ): readonly XZ[] {
  if (!trailPath?.length) return [base, base];
  return [...[...trailPath].reverse(), base];
}

export function walkDurationMin(path: readonly XZ[], terrain: Terrain, feetPerMin = 250): number {
  return Math.max(0.1, pathLengthWorld(path) * terrain.horizontalFeetPerUnit / feetPerMin);
}