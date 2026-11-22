import * as THREE from "three";
import type { SiteDef } from "@/game/site";
import type { Terrain, XZ } from "@/game/terrain";
import { PALETTE } from "./palette";
import { smoothPath } from "./trail";

const TRACK = new THREE.Color(PALETTE.earth);
const TRACK_COMPACT = new THREE.Color(PALETTE.road);
const BERM = new THREE.Color(PALETTE.snowShade);
const BERM_BRIGHT = new THREE.Color(PALETTE.snow);

const HALF_WIDTH = 0.34;
const LIFT = 0.058;

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
    const endCap = i === 0 || i === center.length - 1;
    const edgeBlend = endCap ? 0.44 : 0.26;
    const pebble = Math.sin(center[i].x * 31.2 + center[i].z * 17.7) * Math.cos(center[i].z * 23.1 - center[i].x * 11.4);
    for (const [side, sign] of [[left, -1], [right, 1]] as const) {
      const y = terrain.height(side.x, side.z) + LIFT;
      positions.push(side.x, y, side.z);
      tint.copy(TRACK).lerp(TRACK_COMPACT, 0.38 + pebble * 0.035);
      tint.lerp(BERM, edgeBlend * (sign === -1 ? 1 : 0.9));
      if (endCap) tint.lerp(BERM_BRIGHT, 0.12);
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