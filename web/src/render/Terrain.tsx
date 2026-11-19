"use client";

import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { ROAD_Z, SITE } from "./layout";
import { smoothstep } from "./math";
import { PALETTE, SUN_DIR } from "./palette";
import type { Trail } from "@/game/snow";
import type { LiftLine } from "@/game/descent";
import { TERRAIN, fbm } from "@/game/terrain";
import { forestMask } from "./forest";
import { distanceOutsideLease } from "@/game/lease";
import { outsideWeight, patchLeaseDim } from "./leaseDim";
import { patchOverlay } from "./terrainOverlay";
import { realGradeFactor } from "@/game/trails";
import { buildGeometry } from "./terrainMesh";
import { pathInfluence, sampleSegments, trailInfluence, type TrailInfluence } from "./trail";
import type { XZ } from "@/game/terrain";

// Paths and widths are immutable. Key by array identity so an edit with the
// same endpoints still updates the terrain without serializing every point.
const shapeKeys = new WeakMap<object, number>();
let nextShapeKey = 1;
function shapeKey(points: readonly unknown[] | undefined): number {
  if (!points?.length) return 0;
  const known = shapeKeys.get(points);
  if (known) return known;
  const key = nextShapeKey++;
  shapeKeys.set(points, key);
  return key;
}

const CANOPY = new THREE.Color(PALETTE.pineDeep);
/** Distance outside the lease over which the canopy tint reaches full strength. */
const CANOPY_BAND = 12;

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
  canGrow: ReturnType<typeof forestMask>,
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
      (TERRAIN.height(x + e, z) +
        TERRAIN.height(x - e, z) +
        TERRAIN.height(x, z + e) +
        TERRAIN.height(x, z - e)) /
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
    // Beyond the lease the forest floor reads as canopy, easing in across the far-forest band.
    if (canGrow(x, z)) {
      c.lerp(CANOPY, 0.5 * smoothstep(0, CANOPY_BAND, distanceOutsideLease({ x, z })));
    }

    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

export function Terrain({
  snowQuality,
  snowDepth,
  trails,
  lines,
  paths,
  pathWidths,
  forestPaths,
}: {
  snowQuality: number;
  snowDepth: number;
  /** Trail snow, one entry per run (see `snowKey`). */
  trails: readonly Trail[];
  lines: readonly LiftLine[];
  paths?: readonly (readonly XZ[])[];
  pathWidths?: readonly (readonly number[] | undefined)[];
  forestPaths?: readonly (readonly XZ[])[];
}) {
  const geometry = useMemo(() => {
    const g = buildGeometry();
    // Weight for the build-mode dimming of land outside the lease.
    const pos = g.attributes.position;
    const outside = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) outside[i] = outsideWeight({ x: pos.getX(i), z: pos.getZ(i) });
    g.setAttribute("aOut", new THREE.BufferAttribute(outside, 1));
    // Real pitch at each vertex, for the slope layer. Computed once, so a layer switch rebuilds nothing.
    const pitch = new Float32Array(pos.count);
    const factor = realGradeFactor();
    for (let i = 0; i < pos.count; i++) pitch[i] = TERRAIN.grade(pos.getX(i), pos.getZ(i)) * factor;
    g.setAttribute("aPitch", new THREE.BufferAttribute(pitch, 1));
    return g;
  }, []);
  const q = Math.round(snowQuality * 20) / 20;
  const d = Math.round(snowDepth * 20) / 20;
  const lineKey = lines
    .map((l) => `${l.bottom.x},${l.bottom.z}|${l.top.x},${l.top.z}`)
    .join(";");
  const pathKey = paths?.map((p, i) => `${shapeKey(p)}:${shapeKey(pathWidths?.[i])}`).join("|") ?? "";
  const forestKey = forestPaths?.map(shapeKey).join("|") ?? "";
  const canGrow = useMemo(() => forestMask({ lines, paths: forestPaths }),
    // Keys reflect the world-space lift and forest path geometry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lineKey, forestKey],
  );
  const positions = geometry.attributes.position.array;
  const influence = useMemo(() => {
    const n = Math.max(trails.length, paths?.length ?? 0, lines.length);
    const out: TrailInfluence[] = [];
    for (let i = 0; i < n; i++) {
      const path = paths?.[i];
      if (path?.length) {
        out.push(pathInfluence(path, positions, undefined, undefined, undefined, pathWidths?.[i]));
      } else if (path) {
        const count = positions.length / 3;
        out.push({ w: new Float32Array(count), t: new Float32Array(count) });
      } else if (lines[i]) {
        out.push(trailInfluence(lines[i], positions));
      } else if (lines[0]) {
        out.push(trailInfluence(lines[0], positions));
      }
    }
    return out;
    // paths/lines from closure; pathKey and lineKey capture geometry changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry, lineKey, pathKey, trails.length]);

  // Repaints when snow or the clearings change. The camera plays no part.
  useLayoutEffect(() => {
    paint(geometry, q, d, trails, influence, canGrow);
  }, [geometry, q, d, trails, influence, canGrow]);

  const material = useMemo(() => patchOverlay(patchLeaseDim(new THREE.MeshLambertMaterial({ vertexColors: true }))), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  // Receives only: the hill barely self-shadows at this sun angle, and casting
  // cost ~37k triangles per frame.
  return (
    <mesh geometry={geometry} material={material} receiveShadow />
  );
}

/** Ploughed valley road with a dark centre line, across the front of the base. */
export function Road() {
  const geometry = useMemo(() => {
    const { xFrom, xTo } = SITE.road;
    const segs = 90;
    const pos: number[] = [];
    const idx: number[] = [];
    const w = 0.38;
    for (let i = 0; i <= segs; i++) {
      const x = xFrom + (i / segs) * (xTo - xFrom);
      const z = ROAD_Z + Math.sin(x * 0.18) * 0.25;
      for (const s of [-1, 0, 1]) {
        const zz = z + s * w;
        pos.push(x, TERRAIN.height(x, zz) + 0.025, zz);
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
