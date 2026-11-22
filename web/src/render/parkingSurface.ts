import * as THREE from "three";
import { lodgeParkingLots, type LodgeTier } from "@/game/base";
import type { SiteDef } from "@/game/site";
import { TERRAIN, type Terrain } from "@/game/terrain";
import { expandedStallCenters } from "./parking";

const GRAVEL = new THREE.Color("#98938b");
const TRACK = new THREE.Color("#777982");
const SNOWBANK = new THREE.Color("#dce4ed");
const STALL_MARK = new THREE.Color("#d4d0c3");

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** A single batch for the ploughed lot, its road entrance and stall markings. */
export function buildParkingSurface(
  site: SiteDef,
  tier: LodgeTier,
  terrain: Terrain = TERRAIN,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const tint = new THREE.Color();

  function patch(
    centerX: number, centerZ: number, width: number, depth: number,
    radius: number, columns: number, rows: number,
    surface: (x: number, z: number, edge: number) => number,
  ) {
    const first = positions.length / 3;
    const step = rows + 1;
    const halfW = width / 2;
    const halfD = depth / 2;
    for (let col = 0; col <= columns; col++) {
      const x = width * (col / columns - 0.5);
      const cornerX = Math.max(0, Math.abs(x) - (halfW - radius));
      const maxZ = halfD - radius + Math.sqrt(Math.max(0, radius ** 2 - cornerX ** 2));
      for (let row = 0; row <= rows; row++) {
        const z = maxZ * (2 * row / rows - 1);
        const cornerZ = Math.abs(z) - (halfD - radius);
        const edge = radius - Math.hypot(cornerX, Math.max(0, cornerZ)) +
          Math.max(0, -Math.max(Math.abs(x) - (halfW - radius), cornerZ));
        const worldX = centerX + x;
        const worldZ = centerZ + z;
        positions.push(worldX, terrain.height(worldX, worldZ) + surface(worldX, worldZ, edge), worldZ);
        colors.push(tint.r, tint.g, tint.b);
        if (col < columns && row < rows) {
          const a = first + col * step + row;
          indices.push(a, a + 1, a + step, a + 1, a + step + 1, a + step);
        }
      }
    }
  }

  const lots = lodgeParkingLots(tier, site);
  const first = lots[0];
  const last = lots[lots.length - 1];
  const left = first.center.x - first.size.w / 2 - 0.34;
  const right = last.center.x + last.size.w / 2 + 0.34;
  const entrance = site.road.spur.at(-1);
  const roadJoin = site.road.spur[0];
  const footpath = site.paths.find((path) => path.id === "lot_lodge")?.points[0];

  if (entrance && roadJoin) {
    const endZ = roadJoin.z + 0.25;
    patch(entrance.x, (entrance.z + endZ) / 2, 0.88, endZ - entrance.z, 0.27, 6, 14, (_x, _z, edge) => {
      tint.copy(TRACK).lerp(GRAVEL, 0.42).lerp(SNOWBANK, 0.42 * (1 - clamp01(edge / 0.24)));
      return 0.027;
    });
  }

  patch((left + right) / 2, first.center.z, right - left, first.size.d + 1.15, 0.60,
    Math.ceil((right - left) / 0.16), 20, (x, z, edge) => {
      const center = Math.abs(z - first.center.z);
      const aisle = 1 - clamp01((center - 0.15) / 0.2);
      const entry = entrance && z > first.center.z ? clamp01((0.58 - Math.abs(x - entrance.x)) / 0.18) : 0;
      const walkway = footpath && z < first.center.z ? clamp01((0.46 - Math.abs(x - footpath.x)) / 0.14) : 0;
      const snowCover = 1 - Math.max(entry, walkway);
      const edgeBand = 1 - clamp01(edge / 0.24);
      const pebbles = Math.sin(x * 37.8 + z * 19.3) * Math.cos(z * 30.7 - x * 18.1);
      tint.copy(GRAVEL).lerp(TRACK, aisle * 0.76).multiplyScalar(1 + pebbles * 0.065)
        .lerp(SNOWBANK, edgeBand * snowCover);
      return 0.038 + Math.sin(Math.PI * edgeBand) * snowCover * 0.085;
    });

  for (const { x, z } of expandedStallCenters(site, tier)) {
    const outer = z > first.center.z ? 0.29 : -0.29;
    patch(x, z + outer, 0.22, 0.037, 0.013, 2, 1, () => {
      tint.copy(STALL_MARK);
      return 0.054;
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
