"use client";

import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { ROAD_Z } from "./layout";
import { smoothstep } from "./math";
import { PALETTE, SUN_DIR } from "./palette";
import type { Trail } from "@/game/snow";
import type { LiftAnchor } from "@/game/descent";
import { fbm, terrainHeight } from "./terrainShape";
import { sampleSegments, trailInfluence, type TrailInfluence } from "./trail";

const NX = 150;
const NZ = 124;
const CX = 0.6;
const CZ = -0.4;

/** Non-uniform grid: dense in the play area, coarse toward the fogged edges. */
function gridX(s: number) {
  return CX + 8.5 * s + 14 * s * s * s;
}
function gridZ(s: number) {
  return CZ + 7 * s + 11 * s * s * s;
}

function buildGeometry() {
  const positions = new Float32Array((NX + 1) * (NZ + 1) * 3);
  let p = 0;
  for (let j = 0; j <= NZ; j++) {
    const z = gridZ((j / NZ) * 2 - 1);
    for (let i = 0; i <= NX; i++) {
      const x = gridX((i / NX) * 2 - 1);
      positions[p++] = x;
      positions[p++] = terrainHeight(x, z);
      positions[p++] = z;
    }
  }
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

const C = {
  snow: new THREE.Color(PALETTE.snow),
  shade: new THREE.Color(PALETTE.snowShade),
  warm: new THREE.Color(PALETTE.snowWarm),
  old: new THREE.Color(PALETTE.snowOld),
  ice: new THREE.Color(PALETTE.snowIce),
  white: new THREE.Color(PALETTE.white),
  rock: new THREE.Color(PALETTE.rock),
  earth: new THREE.Color(PALETTE.earth),
};

/**
 * Vertex colours: white snow, blue in hollows, warm on sun-facing slopes,
 * rock on steep faces, and bare earth patches that grow from the bottom of
 * the hill as `snowDepth` drops.
 */
function paint(
  g: THREE.BufferGeometry,
  snowQuality: number,
  snowDepth: number,
  trails: readonly Trail[],
  influence: readonly TrailInfluence[],
) {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute;
  const col = g.attributes.color as THREE.BufferAttribute;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    // Near a trail the segment values replace the hill-wide means (strongest trail wins).
    let w = 0;
    let q = snowQuality;
    let depth = snowDepth;
    let cover = 1;
    for (let k = 0; k < influence.length && k < trails.length; k++) {
      if (influence[k].w[i] > w) {
        w = influence[k].w[i];
        const t = influence[k].t[i];
        q = snowQuality + (sampleSegments(trails[k], t, "quality") - snowQuality) * w;
        depth = snowDepth + (sampleSegments(trails[k], t, "depth") - snowDepth) * w;
        cover = 1 + (sampleSegments(trails[k], t, "coverage") - 1) * w;
      }
    }
    const thin = 1 - Math.max(0, Math.min(1, depth));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = nor.getY(i);
    const sun =
      nor.getX(i) * SUN_DIR[0] + ny * SUN_DIR[1] + nor.getZ(i) * SUN_DIR[2];

    c.copy(C.snow);
    // Hollows go blue-lavender.
    const e = 0.45;
    const avg =
      (terrainHeight(x + e, z) +
        terrainHeight(x - e, z) +
        terrainHeight(x, z + e) +
        terrainHeight(x, z - e)) /
      4;
    const curv = avg - y;
    c.lerp(C.shade, Math.max(0, Math.min(0.55, curv * 4 + 0.05)));
    // Sun-facing slopes go a touch warm.
    c.lerp(C.warm, Math.max(0, Math.min(0.6, (sun - 0.72) * 2.4)));
    // Tired snow greys out.
    c.lerp(C.old, Math.max(0, 0.75 - q) * 0.7);
    // Worn trail segments go grey-blue ice; a fresh groom reads a clean bright white.
    if (w > 0) {
      c.lerp(C.ice, w * Math.max(0, Math.min(1, (0.55 - q) / 0.3)) * 0.85);
      c.lerp(C.white, w * smoothstep(0.62, 0.88, q) * 0.7);
    }

    // Rock on steep faces.
    const steep = 1 - ny + fbm(x * 1.7, z * 1.7) * 0.12;
    c.lerp(C.rock, smoothstep(0.38, 0.55, steep) * 0.7);

    // Bare earth: thin cover shows first low on the hill and on the valley floor.
    const n = fbm(x * 0.9 + 3.1, z * 0.9 - 7.7);
    const bareDepth = (thin - 0.45) * 1.6 - 0.42 - y * 0.1 + n * 0.7;
    const bareCover = (1 - cover) * 1.6 - 0.35 + (n - 0.5) * 0.6;
    const bare = Math.max(bareDepth, bareCover);
    const road = Math.abs(z - ROAD_Z) < 0.5 ? 0.25 : 0;
    c.lerp(C.earth, smoothstep(0, 0.18, bare - road) * 0.9);

    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

export function Terrain({
  snowQuality,
  snowDepth,
  trails,
  anchors,
}: {
  snowQuality: number;
  snowDepth: number;
  /** Trail snow, one per entry of `anchors` (already snapped, see `snowKey`). */
  trails: readonly Trail[];
  anchors: readonly LiftAnchor[];
}) {
  const geometry = useMemo(() => buildGeometry(), []);
  const q = Math.round(snowQuality * 20) / 20;
  const d = Math.round(snowDepth * 20) / 20;
  const anchorKey = anchors.map((a) => `${a.x},${a.z}`).join("|");
  // Which vertices sit on which trail never changes while the lifts do not.
  const influence = useMemo(
    () => anchors.map((a) => trailInfluence(a, geometry.attributes.position.array)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geometry, anchorKey],
  );

  // Repaints only when the snapped snow changes: once a night, then now and then by day.
  useLayoutEffect(() => {
    paint(geometry, q, d, trails, influence);
  }, [geometry, q, d, trails, influence]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Receives only: the hill barely self-shadows at this sun angle, and casting
  // cost ~37k triangles per frame.
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshLambertMaterial vertexColors />
    </mesh>
  );
}

/** Ploughed valley road with a dark centre line, across the front of the base. */
export function Road() {
  const geometry = useMemo(() => {
    const segs = 90;
    const pos: number[] = [];
    const idx: number[] = [];
    const w = 0.38;
    for (let i = 0; i <= segs; i++) {
      const x = -16 + (i / segs) * 34;
      const z = ROAD_Z + Math.sin(x * 0.18) * 0.25;
      for (const s of [-1, 0, 1]) {
        const zz = z + s * w;
        pos.push(x, terrainHeight(x, zz) + 0.025, zz);
      }
      if (i < segs) {
        const a = i * 3;
        idx.push(a, a + 1, a + 3, a + 1, a + 4, a + 3);
        idx.push(a + 1, a + 2, a + 4, a + 2, a + 5, a + 4);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshLambertMaterial
        color={PALETTE.road}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  );
}
