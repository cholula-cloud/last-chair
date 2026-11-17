import * as THREE from "three";
import { TERRAIN } from "@/game/terrain";

export const NX = 150;
export const NZ = 124;
const CX = 0.6;
const CZ = -0.4;

/** Non-uniform grid: dense in the play area, coarse toward the fogged edges. */
export function gridX(s: number) {
  return CX + 8.5 * s + 14 * s * s * s;
}
export function gridZ(s: number) {
  return CZ + 7 * s + 11 * s * s * s;
}

/** Vertex positions (x, y, z per vertex, row by row); every y is `TERRAIN.height(x, z)`. */
export function buildPositions(): Float32Array {
  const positions = new Float32Array((NX + 1) * (NZ + 1) * 3);
  let p = 0;
  for (let j = 0; j <= NZ; j++) {
    const z = gridZ((j / NZ) * 2 - 1);
    for (let i = 0; i <= NX; i++) {
      const x = gridX((i / NX) * 2 - 1);
      positions[p++] = x;
      positions[p++] = TERRAIN.height(x, z);
      positions[p++] = z;
    }
  }
  return positions;
}

export function buildGeometry() {
  const positions = buildPositions();
  const indices: number[] = [];
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i;
      const b = a + 1;
      const c = a + (NX + 1);
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
