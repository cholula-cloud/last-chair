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
/** Share of half-width that is the snow berm on each side. */
const BERM_FRACTION = 0.28;
const LIFT = 0.058;
/** Columns across the ribbon: outer berm, track edge, track edge, outer berm. */
const COLUMNS = [-1, -(1 - BERM_FRACTION), 1 - BERM_FRACTION, 1] as const;

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
  const across = COLUMNS.length;

  for (let i = 0; i < center.length; i++) {
    const prev = center[Math.max(0, i - 1)];
    const next = center[Math.min(center.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const endCap = i === 0 || i === center.length - 1;
    const pebble = Math.sin(center[i].x * 31.2 + center[i].z * 17.7) * Math.cos(center[i].z * 23.1 - center[i].x * 11.4);
    for (let c = 0; c < across; c++) {
      const s = COLUMNS[c];
      const x = center[i].x + nx * HALF_WIDTH * s;
      const z = center[i].z + nz * HALF_WIDTH * s;
      const y = terrain.height(x, z) + LIFT;
      positions.push(x, y, z);
      const berm = Math.abs(s) > 0.9;
      tint.copy(TRACK).lerp(TRACK_COMPACT, 0.42 + pebble * 0.04);
      if (berm) {
        tint.lerp(BERM, endCap ? 0.72 : 0.58);
        if (endCap) tint.lerp(BERM_BRIGHT, 0.18);
      } else if (endCap) {
        tint.lerp(BERM, 0.12);
      }
      colors.push(tint.r, tint.g, tint.b);
    }
    if (i < center.length - 1) {
      const row = i * across;
      for (let c = 0; c < across - 1; c++) {
        const a = row + c;
        indices.push(a, a + 1, a + across, a + 1, a + across + 1, a + across);
      }
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
