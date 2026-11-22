import * as THREE from "three";
import type { SiteDef } from "@/game/site";
import type { Terrain, XZ } from "@/game/terrain";
import { PALETTE } from "./palette";
import { pathSampler, smoothPath } from "./trail";

const GRAVEL = new THREE.Color("#98938b");
const TRACK = new THREE.Color("#87827a");
const SNOW_EDGE = new THREE.Color(PALETTE.snowShade);

/** Full width ≈ 0.34 world u — compact guest walk, not a road. */
const HALF_WIDTH = 0.17;
const BERM_FRAC = 0.24;
const LIFT = 0.042;
const ROAD_HALF = 0.52;
const COLUMNS = [-1, -(1 - BERM_FRAC), 1 - BERM_FRAC, 1] as const;

/** Decorative mesh only — sim walking still reads `lot_lodge` from site data. */
export function decorativeFootpathPoints(site: SiteDef): XZ[] {
  const lot = site.paths.find((path) => path.id === "lot_lodge")?.points ?? [];
  if (lot.length < 2) return lot;
  const pathX = lot[0].x;
  const roadZ = site.road.z;
  const filtered = lot.filter(
    (p) => !(Math.abs(p.z - roadZ) < ROAD_HALF * 0.9 && Math.abs(p.x - pathX) < 0.45),
  );
  const { lodge } = site.buildings;
  const porch: XZ = {
    x: lodge.x + 0.08,
    z: lodge.z + lodge.footprint.depth * 0.36,
  };
  return [...filtered.slice(0, -1), porch];
}

function inRoadBand(site: SiteDef, p: XZ, pathX: number) {
  return Math.abs(p.z - site.road.z) < ROAD_HALF && Math.abs(p.x - pathX) < 0.55;
}

function widthScale(site: SiteDef, points: XZ[], i: number, pathX: number): number {
  const lengths = [0];
  for (let j = 1; j < points.length; j++) {
    lengths.push(lengths[j - 1] + Math.hypot(points[j].x - points[j - 1].x, points[j].z - points[j - 1].z));
  }
  const total = lengths.at(-1) ?? 1;
  const along = lengths[i] / total;
  let scale = Math.min(1, (1 - along) / 0.2);
  if (inRoadBand(site, points[i], pathX)) scale = 0;
  return scale;
}

/** Compacted gravel walk from the lot through the apron — leaves Route 100 clear. */
export function buildFootpathSurface(site: SiteDef, terrain: Terrain): THREE.BufferGeometry {
  const raw = decorativeFootpathPoints(site);
  if (raw.length < 2) return new THREE.BufferGeometry();
  const pathX = raw[0].x;
  const center = smoothPath(raw, 0.32, 0.16, 2);
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const tint = new THREE.Color();
  const across = COLUMNS.length;

  let row = 0;
  for (let i = 0; i < center.length; i++) {
    const width = HALF_WIDTH * widthScale(site, center, i, pathX);
    if (width < 0.02) continue;

    const prev = center[Math.max(0, i - 1)];
    const next = center[Math.min(center.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const pebble = Math.sin(center[i].x * 29 + center[i].z * 19) * Math.cos(center[i].z * 21 - center[i].x * 13);

    for (let c = 0; c < across; c++) {
      const s = COLUMNS[c];
      const x = center[i].x + nx * width * s;
      const z = center[i].z + nz * width * s;
      positions.push(x, terrain.height(x, z) + LIFT, z);
      const outer = Math.abs(s) > 0.9;
      tint.copy(GRAVEL).lerp(TRACK, 0.22 + pebble * 0.025);
      if (outer) tint.lerp(SNOW_EDGE, 0.35);
      colors.push(tint.r, tint.g, tint.b);
    }
    if (row > 0) {
      const base = row * across;
      const prevBase = (row - 1) * across;
      for (let c = 0; c < across - 1; c++) {
        const a = prevBase + c;
        const b = base + c;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    row++;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function footpathPolyline(site: SiteDef): XZ[] {
  return smoothPath(decorativeFootpathPoints(site), 0.32, 0.16, 2);
}

/** Full lot-to-lodge chain including road spur (walk polyline length). */
const LAMP_ALONG = [0.17, 0.36, 0.55, 0.76] as const;
const LAMP_OFFSET = 0.34;

/** Lamp posts just off the walk, evenly spaced (skips the Route 100 band). */
export function footpathLampPosts(site: SiteDef): XZ[] {
  const path = footpathPolyline(site);
  if (path.length < 2) return [];
  const sample = pathSampler(path);
  const roadZ = site.road.z;
  const posts: XZ[] = [];
  for (const t of LAMP_ALONG) {
    const here = sample(t);
    const lead = sample(Math.min(1, t + 0.012));
    const dx = lead.x - here.x;
    const dz = lead.z - here.z;
    const len = Math.hypot(dx, dz) || 1;
    const x = here.x + (-dz / len) * LAMP_OFFSET;
    const z = here.z + (dx / len) * LAMP_OFFSET;
    if (Math.abs(z - roadZ) < ROAD_HALF * 0.85) continue;
    posts.push({ x, z });
  }
  return posts;
}

export function footpathWalkChain(site: SiteDef): XZ[] {
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