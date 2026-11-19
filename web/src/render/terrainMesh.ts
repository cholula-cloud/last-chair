import * as THREE from "three";
import { TERRAIN } from "@/game/terrain";

export const NX = 192;
export const NZ = 160;

/** Non-uniform grid: dense in the play area, coarse toward the fogged edges. */
export function gridX(s: number) {
  return 3.6 + 51 * s + 93 * s * s * s;
}
export function gridZ(s: number) {
  return -2.4 + 42 * s + 66 * s * s * s;
}

/** Vertex positions (x, y, z per vertex, row by row); every y is `TERRAIN.height(x, z)`. */
export function buildPositions(cols = NX, rows = NZ): Float32Array {
  const positions = new Float32Array((cols + 1) * (rows + 1) * 3);
  let p = 0;
  for (let j = 0; j <= rows; j++) {
    const z = gridZ((j / rows) * 2 - 1);
    for (let i = 0; i <= cols; i++) {
      const x = gridX((i / cols) * 2 - 1);
      positions[p++] = x;
      positions[p++] = TERRAIN.height(x, z);
      positions[p++] = z;
    }
  }
  return positions;
}

export function buildGeometry(lowDetail = false) {
  const cols = lowDetail ? NX / 2 : NX;
  const rows = lowDetail ? NZ / 2 : NZ;
  const positions = buildPositions(cols, rows);
  const indices: number[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const b = a + 1;
      const c = a + (cols + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array(positions.length), 3),
  );
  return g;
}