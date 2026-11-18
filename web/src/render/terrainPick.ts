import * as THREE from "three";
import type { XZ } from "@/game/terrain";

/** 0.25 design units × 6× world scale. */
export const TERRAIN_MARCH_STEP = 1.5;
export const TERRAIN_PICK_MAX_DIST = 1000;
const BISECT_ITERS = 20;

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

export function marchToTerrain(
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  height: (x: number, z: number) => number,
  maxDist = TERRAIN_PICK_MAX_DIST,
  step = TERRAIN_MARCH_STEP,
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
    for (let i = 0; i < BISECT_ITERS; i++) {
      const mid = (lo + hi) / 2;
      if (below(mid)) hi = mid;
      else lo = mid;
    }
    const p = at(hi);
    return { x: p.x, z: p.z };
  }
  return null;
}

export function pickTerrain(
  screen: { x: number; y: number },
  camera: THREE.Camera,
  height: (x: number, z: number) => number,
): XZ | null {
  ndc.set(screen.x, screen.y);
  raycaster.setFromCamera(ndc, camera);
  const { origin, direction } = raycaster.ray;
  if (direction.y > 0) return null;
  return marchToTerrain(origin, direction, height);
}