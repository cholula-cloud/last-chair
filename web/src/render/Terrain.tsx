"use client";

import { useEffect, useLayoutEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ROAD_Z, SITE } from "./layout";
import { smoothstep } from "./math";
import { PALETTE, SUN_DIR } from "./palette";
import type { Trail } from "@/game/snow";
import type { LiftLine } from "@/game/descent";
import type { SnowPreset } from "@/game/types";
import { TERRAIN, fbm } from "@/game/terrain";
import { forestMask } from "./forest";
import { distanceOutsideLease, onLease } from "@/game/lease";
import { outsideWeight, patchLeaseDim } from "./leaseDim";
import { patchOverlay } from "./terrainOverlay";
import { realGradeFactor } from "@/game/trails";
import { buildGeometry } from "./terrainMesh";
import { pathInfluence, trailInfluence, type TrailInfluence } from "./trail";
import type { XZ } from "@/game/terrain";
import {
  SNOW_TEX_SEGMENTS,
  SNOW_TEX_TRAILS,
  bakeSnowAttributes,
  groomStyle,
  snowTextureBytes,
  snowWearByTrail,
} from "./snowTexture";
import {
  MOUNTAIN_TRAIL_CONDITIONING,
  patchSnowMaterial,
  snowUniforms,
  syncSnowNightUniform,
} from "./snowMaterial";

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
const FOREST_FLOOR = new THREE.Color(PALETTE.forestFloor);
/** Distance outside the lease over which the canopy tint reaches full strength. */
const CANOPY_BAND = 12;
/** Soft forest wash on lease snow (keeps trail corridors readable). */
const LEASE_CANOPY = 0.22;

const C = {
  snow: new THREE.Color(PALETTE.snow),
  shade: new THREE.Color(PALETTE.snowShade),
  warm: new THREE.Color(PALETTE.snowWarm),
  old: new THREE.Color(PALETTE.snowOld),
  rock: new THREE.Color(PALETTE.rock),
  earth: new THREE.Color(PALETTE.earth),
};

/**
 * Off-trail vertex colours: hollows, sun-facing warmth, rock, hill-wide bare
 * patches, and canopy. Per-segment snow on corridors is drawn in the snow shader.
 */
function paint(
  g: THREE.BufferGeometry,
  snowQuality: number,
  snowDepth: number,
  canGrow: ReturnType<typeof forestMask>,
) {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute;
  const col = g.attributes.color as THREE.BufferAttribute;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const q = snowQuality;
    const thin = 1 - Math.max(0, Math.min(1, snowDepth));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = nor.getY(i);
    const sun =
      nor.getX(i) * SUN_DIR[0] + ny * SUN_DIR[1] + nor.getZ(i) * SUN_DIR[2];

    c.copy(C.snow);
    const e = 0.45;
    const avg =
      (TERRAIN.height(x + e, z) +
        TERRAIN.height(x - e, z) +
        TERRAIN.height(x, z + e) +
        TERRAIN.height(x, z - e)) /
      4;
    const curv = avg - y;
    c.lerp(C.shade, Math.max(0, Math.min(0.55, curv * 4 + 0.05)));
    c.lerp(C.warm, Math.max(0, Math.min(0.6, (sun - 0.72) * 2.4)));
    c.lerp(C.old, Math.max(0, 0.75 - q) * 0.7);

    const forested = canGrow(x, z);
    const steep = 1 - ny + fbm(x * 1.7, z * 1.7) * 0.12;
    // Soften rock on wooded slopes so the floor reads as snow under canopy.
    c.lerp(C.rock, smoothstep(0.38, 0.55, steep) * (forested ? 0.35 : 0.7));

    const n = fbm(x * 0.9 + 3.1, z * 0.9 - 7.7);
    const bareDepth = (thin - 0.45) * 1.6 - 0.42 - y * 0.1 + n * 0.7;
    const road = Math.abs(z - ROAD_Z) < 0.5 ? 0.25 : 0;
    c.lerp(C.earth, smoothstep(0, 0.18, bareDepth - road) * 0.9);
    if (forested) {
      if (onLease({ x, z })) {
        c.lerp(FOREST_FLOOR, LEASE_CANOPY);
      } else {
        c.lerp(CANOPY, 0.55 * smoothstep(0, CANOPY_BAND, distanceOutsideLease({ x, z })));
      }
    }

    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

export function Terrain({
  lowDetail,
  snowQuality,
  snowDepth,
  trails,
  groomed,
  snowPreset,
  runsByTrail,
  lines,
  paths,
  pathWidths,
  forestPaths,
}: {
  lowDetail: boolean;
  snowQuality: number;
  snowDepth: number;
  trails: readonly Trail[];
  groomed?: readonly (boolean[] | undefined)[];
  snowPreset: SnowPreset;
  runsByTrail?: readonly number[];
  lines: readonly LiftLine[];
  paths?: readonly (readonly XZ[])[];
  pathWidths?: readonly (readonly number[] | undefined)[];
  forestPaths?: readonly (readonly XZ[])[];
}) {
  const geometry = useMemo(() => {
    const g = buildGeometry(lowDetail);
    const pos = g.attributes.position;
    const outside = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) outside[i] = outsideWeight({ x: pos.getX(i), z: pos.getZ(i) });
    g.setAttribute("aOut", new THREE.BufferAttribute(outside, 1));
    const pitch = new Float32Array(pos.count);
    const factor = realGradeFactor();
    for (let i = 0; i < pos.count; i++) pitch[i] = TERRAIN.grade(pos.getX(i), pos.getZ(i)) * factor;
    g.setAttribute("aPitch", new THREE.BufferAttribute(pitch, 1));
    return g;
  }, [lowDetail]);
  const q = Math.round(snowQuality * 20) / 20;
  const d = Math.round(snowDepth * 20) / 20;
  const lineKey = lines
    .map((l) => `${l.bottom.x},${l.bottom.z}|${l.top.x},${l.top.z}`)
    .join(";");
  const pathKey = paths?.map((p, i) => `${shapeKey(p)}:${shapeKey(pathWidths?.[i])}`).join("|") ?? "";
  const forestKey = forestPaths?.map(shapeKey).join("|") ?? "";
  const canGrow = useMemo(() => forestMask({ lines, paths: forestPaths }),
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
        out.push({ w: new Float32Array(count), t: new Float32Array(count), u: new Float32Array(count) });
      } else if (lines[i]) {
        out.push(trailInfluence(lines[i], positions));
      } else if (lines[0]) {
        out.push(trailInfluence(lines[0], positions));
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry, lineKey, pathKey, trails.length]);

  useLayoutEffect(() => {
    paint(geometry, q, d, canGrow);
  }, [geometry, q, d, canGrow]);

  useLayoutEffect(() => {
    if (!MOUNTAIN_TRAIL_CONDITIONING) return;
    const count = geometry.attributes.position.count;
    const { aTrail, aT, aU, aW } = bakeSnowAttributes(influence, count);
    geometry.setAttribute("aTrail", new THREE.BufferAttribute(aTrail, 1));
    geometry.setAttribute("aT", new THREE.BufferAttribute(aT, 1));
    geometry.setAttribute("aU", new THREE.BufferAttribute(aU, 1));
    geometry.setAttribute("aW", new THREE.BufferAttribute(aW, 1));
  }, [geometry, influence]);

  const snowTex = useMemo(() => {
    if (!MOUNTAIN_TRAIL_CONDITIONING) return null;
    const data = snowTextureBytes(trails, groomed ?? [], snowPreset);
    const tex = new THREE.DataTexture(
      data,
      SNOW_TEX_SEGMENTS,
      SNOW_TEX_TRAILS,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, [trails, groomed, snowPreset]);

  useLayoutEffect(() => {
    if (!MOUNTAIN_TRAIL_CONDITIONING || !snowTex) return;
    snowUniforms.uSnow.value = snowTex;
    snowUniforms.uTrailCount.value = Math.min(trails.length, SNOW_TEX_TRAILS);
    const style = groomStyle(snowPreset);
    snowUniforms.uGroomStrength.value = style.strength;
    snowUniforms.uStripePitch.value = style.pitch;
    snowUniforms.uWear.value.set(snowWearByTrail(runsByTrail ?? []));
  }, [snowTex, trails.length, snowPreset, runsByTrail]);

  const material = useMemo(() => {
    const base = new THREE.MeshLambertMaterial({ vertexColors: true });
    const withSnow = MOUNTAIN_TRAIL_CONDITIONING ? patchSnowMaterial(base) : base;
    return patchOverlay(patchLeaseDim(withSnow));
  }, []);

  useFrame(() => syncSnowNightUniform());

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => snowTex?.dispose(), [snowTex]);

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