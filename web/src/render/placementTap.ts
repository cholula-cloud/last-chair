import * as THREE from "three";
import { TERRAIN } from "@/game/terrain";

/** World-space snap radius from one CSS pixel at the hit point. */
export function snapRadiusAtHit(
  camera: THREE.PerspectiveCamera,
  hit: { x: number; y: number; z: number },
  viewportHeightPx: number,
): number {
  const d = Math.hypot(
    hit.x - camera.position.x,
    hit.y - camera.position.y,
    hit.z - camera.position.z,
  );
  const w = (2 * d * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, viewportHeightPx);
  return Math.min(4.8, Math.max(0.5, 22 * w));
}

export function heightAt(x: number, z: number) {
  return TERRAIN.height(x, z);
}