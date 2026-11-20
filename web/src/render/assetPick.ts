import type { Object3D, Raycaster } from "three";
import { placedAssetTarget, type AssetTarget } from "@/game/assetNames";
import type { GameState } from "@/game/state";
import { TERRAIN, type XZ } from "@/game/terrain";
import { distSqToPath, pathInfluence } from "./trail";

export type AssetMarker = { kind: AssetTarget["kind"]; index?: number };

export function trailAt(state: Pick<GameState, "trails" | "lifts">, at: XZ): number {
  let best = -1;
  let strongest = 0.49;
  let closest = Infinity;
  const sample = [at.x, 0, at.z];
  state.trails.forEach((run, i) => {
    if (!run.open || run.path.length < 2 || !state.lifts[run.liftIndex]?.confirmed) return;
    const { w } = pathInfluence(run.path, sample, undefined, undefined, undefined, run.widths);
    if (w[0] < strongest) return;
    const distance = distSqToPath(at.x, at.z, run.path);
    if (w[0] === strongest && distance >= closest) return;
    best = i;
    strongest = w[0];
    closest = distance;
  });
  return best;
}

/** Resolve the nearest marked model in front of the hill, with a ground pick for trail surfaces. */
export function pickSceneAsset(
  scene: Object3D, ray: Raycaster, ground: XZ | null, state: GameState, allowTrailSurface: boolean,
): AssetTarget | null {
  const models: Object3D[] = [];
  scene.traverse((object) => {
    if (object.userData.asset) models.push(object);
  });
  const { origin } = ray.ray;
  const depth = ground ? Math.hypot(ground.x - origin.x, TERRAIN.height(ground.x, ground.z) - origin.y, ground.z - origin.z) : Infinity;
  for (const hit of ray.intersectObjects(models, true)) {
    if (hit.distance > depth + 0.15) break;
    let model: Object3D | null = hit.object;
    while (model && !model.userData.asset) model = model.parent;
    const marker = model?.userData.asset as AssetMarker | undefined;
    if (!marker) continue;
    const { kind, index } = marker;
    if (kind === "lodge" || kind === "parking" || kind === "snowcat") return { kind };
    const target = index === undefined ? null : placedAssetTarget(state, kind, index);
    if (target) return target;
  }
  return ground && allowTrailSurface ? placedAssetTarget(state, "trail", trailAt(state, ground)) : null;
}
