"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ROAD_Z, SITE } from "./layout";
import { smoothstep } from "./math";
import { PALETTE, SUN_DIR } from "./palette";
import type { Trail } from "@/game/snow";
import type { LiftLine } from "@/game/descent";
import { TERRAIN, fbm } from "@/game/terrain";
import { forestMask } from "./forest";
import { sceneCameraTarget } from "./sceneCamera";
import { buildGeometry } from "./terrainMesh";
import { pathInfluence, sampleSegments, trailInfluence, type TrailInfluence } from "./trail";
import type { XZ } from "@/game/terrain";

/** Cheap cache key: full polylines on every trail would stringify thousands of points per frame. */
function pathSignature(path: readonly XZ[] | undefined): string {
  if (!path?.length) return "";
  const a = path[0];
  const b = path[path.length - 1];
  return `${path.length}:${a.x},${a.z}|${b.x},${b.z}`;
}

const CANOPY = new THREE.Color(PALETTE.pineDeep);

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
  lines: readonly LiftLine[],
  paths?: readonly (readonly XZ[])[],
) {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute;
  const col = g.attributes.color as THREE.BufferAttribute;
  const c = new THREE.Color();
  const isForested = forestMask({ lines, paths });
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
    const distCam = Math.hypot(x - sceneCameraTarget.x, z - sceneCameraTarget.z);
    if (distCam > 45 && isForested(x, z)) {
      c.lerp(CANOPY, 0.5);
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
}: {
  snowQuality: number;
  snowDepth: number;
  /** Trail snow, one entry per run (see `snowKey`). */
  trails: readonly Trail[];
  lines: readonly LiftLine[];
  paths?: readonly (readonly XZ[])[];
}) {
  const geometry = useMemo(() => buildGeometry(), []);
  const q = Math.round(snowQuality * 20) / 20;
  const d = Math.round(snowDepth * 20) / 20;
  const lineKey = lines
    .map((l) => `${l.bottom.x},${l.bottom.z}|${l.top.x},${l.top.z}`)
    .join(";");
  const pathKey = paths?.map((p) => pathSignature(p)).join("|") ?? "";
  const positions = geometry.attributes.position.array;
  const influence = useMemo(() => {
    const n = Math.max(trails.length, paths?.length ?? 0, lines.length);
    const out: TrailInfluence[] = [];
    for (let i = 0; i < n; i++) {
      const path = paths?.[i];
      if (path?.length) {
        out.push(pathInfluence(path, positions));
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

  const camBand = useRef("");

  // Repaints when snow changes and when the camera pans enough to move the canopy band.
  useLayoutEffect(() => {
    paint(geometry, q, d, trails, influence, lines, paths);
  }, [geometry, q, d, trails, influence, lineKey, lines, paths]);

  useFrame(() => {
    const band = `${Math.round(sceneCameraTarget.x / 6)},${Math.round(sceneCameraTarget.z / 6)}`;
    if (band === camBand.current) return;
    camBand.current = band;
    paint(geometry, q, d, trails, influence, lines, paths);
  });

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
