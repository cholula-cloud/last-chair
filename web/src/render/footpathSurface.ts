import * as THREE from "three";
import type { SiteDef } from "@/game/site";
import type { Terrain, XZ } from "@/game/terrain";
import { smoothPath } from "./trail";

const GRAVEL = new THREE.Color("#8f8a82");
const TRACK = new THREE.Color("#6f737c");
const EDGE = new THREE.Color("#dce4ed");

const HALF_WIDTH = 0.26;
const LIFT = 0.04;

function chainPath(site: SiteDef): XZ[] {
  const lot = site.paths.find((path) => path.id === "lot_lodge")?.points ?? [];
  const spur = site.road.spur;
  if (spur.length < 2 || lot.length < 2) return lot.length ? [...lot] : [...spur];
  const merged = [...spur];
  for (const point of lot) {
    const last = merged[merged.length - 1];
    if (!last || Math.hypot(point.x - last.x, point.z - last.z) > 0.08) merged.push(point);
  }
  return merged;
}

/** Gravel footpath from the road spur through the lot to the lodge porch. */
export function buildFootpathSurface(site: SiteDef, terrain: Terrain): THREE.BufferGeometry {
  const raw = chainPath(site);
  if (raw.length < 2) return new THREE.BufferGeometry();
  const center = smoothPath(raw, 0.4, 0.2, 2);
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const tint = new THREE.Color();

  for (let i = 0; i < center.length; i++) {
    const prev = center[Math.max(0, i - 1)];
    const next = center[Math.min(center.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const left = { x: center[i].x + nx * HALF_WIDTH, z: center[i].z + nz * HALF_WIDTH };
    const right = { x: center[i].x - nx * HALF_WIDTH, z: center[i].z - nz * HALF_WIDTH };
    const edgeBlend = i === 0 || i === center.length - 1 ? 0.35 : 0.12;
    for (const [side, sign] of [[left, -1], [right, 1]] as const) {
      const y = terrain.height(side.x, side.z) + LIFT;
      positions.push(side.x, y, side.z);
      tint.copy(GRAVEL).lerp(TRACK, 0.55).lerp(EDGE, edgeBlend * (sign === -1 ? 1 : 0.85));
      colors.push(tint.r, tint.g, tint.b);
    }
    if (i < center.length - 1) {
      const row = i * 2;
      indices.push(row, row + 1, row + 2, row + 1, row + 3, row + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function footpathPolyline(site: SiteDef): XZ[] {
  return smoothPath(chainPath(site), 0.4, 0.2, 2);
}