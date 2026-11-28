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
import { useGameStore } from "@/game/store";
import { forestMask } from "./forest";
import { mountainTheme, type MountainVisualTheme } from "./mountainThemes";
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
  theme: MountainVisualTheme,
) {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute;
  const col = g.attributes.color as THREE.BufferAttribute;
  const rockCol = new THREE.Color(theme.rock);
  const floorCol = new THREE.Color(theme.forestFloor);
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
    const rockStart = theme.rockThreshold - 0.04;
    const rockEnd = theme.rockThreshold + 0.13;
    // Soften rock on wooded slopes so the floor reads as snow under canopy.
    c.lerp(rockCol, smoothstep(rockStart, rockEnd, steep) * (forested ? 0.35 : 0.78));

    const n = fbm(x * 0.9 + 3.1, z * 0.9 - 7.7);
    const bareDepth = (thin - 0.45) * 1.6 - 0.42 - y * 0.1 + n * 0.7;
    const road = Math.abs(z - ROAD_Z) < 0.5 ? 0.25 : 0;
    c.lerp(C.earth, smoothstep(0, 0.18, bareDepth - road) * 0.9);
    if (forested) {
      if (onLease({ x, z })) {
        c.lerp(floorCol, LEASE_CANOPY);
      } else {
        c.lerp(CANOPY, 0.55 * smoothstep(0, CANOPY_BAND, distanceOutsideLease({ x, z })));
      }
    }

    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}
void C.rock;
void FOREST_FLOOR;

export function Terrain({
  lowDetail,
  snowQuality,
  snowDepth,
  trails,
  groomed,
  gunCovered,
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
  gunCovered?: readonly (boolean[] | undefined)[];
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
  const mountainId = useGameStore((s) => s.mountainId);
  const theme = useMemo(() => mountainTheme(mountainId), [mountainId]);
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
    paint(geometry, q, d, canGrow, theme);
  }, [geometry, q, d, canGrow, theme]);

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
    const data = snowTextureBytes(trails, groomed ?? [], snowPreset, gunCovered ?? []);
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
  }, [trails, groomed, gunCovered, snowPreset]);

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
    const base = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68, metalness: 0.02 });
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

/** Ploughed valley road with dashed yellow centreline and sculpted snowbanks. */
export function Road() {
  const geometry = useMemo(() => {
    const { xFrom, xTo } = SITE.road;
    const segs = 120;
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];

    const roadCol = new THREE.Color(PALETTE.road);
    const stripeCol = new THREE.Color(PALETTE.yellow);
    const bankTop = new THREE.Color(PALETTE.snow);
    const bankEdge = new THREE.Color(PALETTE.snowShade).lerp(bankTop, 0.72);

    // Cross-section offsets (z-offset, y-lift, color)
    const w = 0.44;
    const profile: { dz: number; dy: number; c: THREE.Color }[] = [
      { dz: -(w + 0.42), dy: 0.0, c: bankEdge },
      { dz: -(w + 0.2), dy: 0.09, c: bankTop },
      { dz: -w, dy: 0.025, c: roadCol },
      { dz: -0.05, dy: 0.025, c: roadCol },
      { dz: 0.05, dy: 0.025, c: roadCol },
      { dz: w, dy: 0.025, c: roadCol },
      { dz: w + 0.2, dy: 0.09, c: bankTop },
      { dz: w + 0.42, dy: 0.0, c: bankEdge },
    ];
    const stride = profile.length;

    for (let i = 0; i <= segs; i++) {
      const x = xFrom + (i / segs) * (xTo - xFrom);
      const z = ROAD_Z + Math.sin(x * 0.18) * 0.25;
      for (const p of profile) {
        const zz = z + p.dz;
        pos.push(x, TERRAIN.height(x, zz) + p.dy, zz);
        col.push(p.c.r, p.c.g, p.c.b);
      }
      if (i < segs) {
        const a = i * stride;
        for (let k = 0; k < stride - 1; k++) {
          idx.push(a + k, a + k + 1, a + stride + k);
          idx.push(a + k + 1, a + stride + k + 1, a + stride + k);
        }
      }
    }

    // Crisp dashed yellow center dashes along the road
    for (let i = 0; i < segs; i += 2) {
      const x0 = xFrom + (i / segs) * (xTo - xFrom);
      const x1 = xFrom + ((i + 1) / segs) * (xTo - xFrom);
      const z0 = ROAD_Z + Math.sin(x0 * 0.18) * 0.25;
      const z1 = ROAD_Z + Math.sin(x1 * 0.18) * 0.25;
      const base = pos.length / 3;
      const sw = 0.032;
      pos.push(
        x0, TERRAIN.height(x0, z0) + 0.032, z0 - sw,
        x0, TERRAIN.height(x0, z0) + 0.032, z0 + sw,
        x1, TERRAIN.height(x1, z1) + 0.032, z1 - sw,
        x1, TERRAIN.height(x1, z1) + 0.032, z1 + sw,
      );
      for (let k = 0; k < 4; k++) col.push(stripeCol.r, stripeCol.g, stripeCol.b);
      idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }

    // Plowed gravel apron joining the main road to the parking lot spur.
    const spur = SITE.road.spur;
    if (spur.length >= 2) {
      const sx = spur[0].x;
      const zA = ROAD_Z + Math.sin(sx * 0.18) * 0.25 + w;
      const zB = spur[1].z;
      const halfSpur = 0.56;
      const base = pos.length / 3;
      pos.push(
        sx - halfSpur, TERRAIN.height(sx - halfSpur, zA) + 0.024, zA,
        sx + halfSpur, TERRAIN.height(sx + halfSpur, zA) + 0.024, zA,
        sx - halfSpur * 1.18, TERRAIN.height(sx - halfSpur * 1.18, zB) + 0.024, zB,
        sx + halfSpur * 1.18, TERRAIN.height(sx + halfSpur * 1.18, zB) + 0.024, zB,
      );
      for (let k = 0; k < 4; k++) col.push(roadCol.r, roadCol.g, roadCol.b);
      idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }

    // Timber roadside guard posts along the shoulder snowbanks.
    const postCol = new THREE.Color(PALETTE.bark);
    const pushPost = (px: number, pz: number) => {
      const py = TERRAIN.height(px, pz) + 0.04;
      const hw = 0.04;
      const ph = 0.22;
      const b = pos.length / 3;
      pos.push(
        px - hw, py, pz - hw, px + hw, py, pz - hw, px + hw, py, pz + hw, px - hw, py, pz + hw,
        px - hw, py + ph, pz - hw, px + hw, py + ph, pz - hw, px + hw, py + ph, pz + hw, px - hw, py + ph, pz + hw,
      );
      for (let k = 0; k < 8; k++) col.push(postCol.r, postCol.g, postCol.b);
      idx.push(
        b + 4, b + 5, b + 6, b + 4, b + 6, b + 7,
        b + 0, b + 1, b + 5, b + 0, b + 5, b + 4,
        b + 1, b + 2, b + 6, b + 1, b + 6, b + 5,
        b + 2, b + 3, b + 7, b + 2, b + 7, b + 6,
        b + 3, b + 0, b + 4, b + 3, b + 4, b + 7,
      );
    };
    for (let px = xFrom + 1.5; px <= xTo - 1.5; px += 3.2) {
      if (Math.abs(px - SITE.arrival.center.x) < 1.3) continue;
      const rz = ROAD_Z + Math.sin(px * 0.18) * 0.25;
      pushPost(px, rz - (w + 0.22));
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.84}
        metalness={0.02}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  );
}