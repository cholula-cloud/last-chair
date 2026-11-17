"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { LiftAnchor } from "@/game/descent";
import { merge, type Part } from "./geo";
import { bakeKit, SHADOW_LAYER_MASK, useKit } from "./kit";
import { LIFT_BASE, ROAD_Z } from "./layout";
import { PALETTE } from "./palette";
import { fbm, terrainHeight } from "./terrainShape";
import { distSqToLiftLine, distSqToPolyline, trailPolyline } from "./trail";

const MAX_NEAR = 540;
const MAX_FAR = 1400;
const TRAIL_CLEAR = 0.64 ** 2;
const LIFT_CLEAR = 0.5 ** 2;
/** Trees closer than this to the hill centre use the modelled kit pines. */
const NEAR_R = 5.2;
const CENTER = { x: 0.6, z: -0.5 } as const;
/** South of this the trees sit in front of the base, close to the camera. */
const FRONT_Z = 2.5;

/** World scale per kit pine, giving each a ~0.75–0.9 unit height. */
const KIT_PINE_SCALE = [0.11, 0.085, 0.098] as const;

/** Low-poly stand-in for distant trees: two open 6-sided tiers and a snow tip (18 tris). */
function farPine(): THREE.BufferGeometry {
  const tier = (r: number, h: number) => new THREE.ConeGeometry(r, h, 6, 1, true);
  const parts: Part[] = [
    { geo: tier(0.3, 0.5), color: PALETTE.pineDeep, pos: [0, 0.32, 0] },
    { geo: tier(0.22, 0.42), color: PALETTE.pine, pos: [0, 0.56, 0], rot: [0, 0.5, 0] },
    { geo: tier(0.11, 0.2), color: PALETTE.snow, pos: [0, 0.7, 0] },
  ];
  return merge(parts);
}

/** Shadow-pass stand-in for every tree (6 tris). */
function proxyPine(): THREE.BufferGeometry {
  return new THREE.ConeGeometry(0.28, 0.8, 6, 1, true).translate(0, 0.45, 0);
}

type TreeSpot = { x: number; z: number; s: number; rot: number; tint: number };
type Forest = { near: TreeSpot[][]; far: TreeSpot[] };

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Keep a stable pseudo-random subset of at most `max` spots. */
function cap(list: TreeSpot[], max: number): TreeSpot[] {
  return list.length <= max ? list : list.filter((_, i) => (i * 2654435761) % list.length < max);
}

function scatter(anchors: LiftAnchor[]): Forest {
  const rand = rng(90210);
  const trails = anchors.map((a) => trailPolyline(a, 28));
  const near: TreeSpot[][] = [[], [], []];
  const far: TreeSpot[] = [];
  const step = 0.3;
  for (let gz = -7; gz <= 7; gz += step) {
    for (let gx = -10; gx <= 11; gx += step) {
      const x = gx + (rand() - 0.5) * step * 0.9;
      const z = gz + (rand() - 0.5) * step * 0.9;
      const r = rand();
      // Base village, lift loading and the road stay open.
      if (z > 1.95 && z < 5.0 && x > -1.2 && x < 5.6) continue;
      if (Math.abs(z - ROAD_Z) < 0.65) continue;
      if ((x - LIFT_BASE.x) ** 2 + (z - LIFT_BASE.z) ** 2 < 0.8) continue;
      // Houses across the road.
      if (z > 4.8 && z < 5.85 && x > -1.5 && x < 2.6) continue;
      let blocked = false;
      for (let i = 0; i < anchors.length && !blocked; i++) {
        if (distSqToPolyline(x, z, trails[i]) < TRAIL_CLEAR) blocked = true;
        else if (distSqToLiftLine(x, z, anchors[i]) < LIFT_CLEAR) blocked = true;
      }
      if (blocked) continue;
      const h = terrainHeight(x, z);
      if (h > 3.55 + fbm(x * 0.8, z * 0.8) * 0.5) continue; // open summit snowfield

      // Clumpy forest: denser on the ridges and back slopes, glades in the bowl.
      const valley = z > 4.8 ? 0.35 : 0;
      const density = 0.86 + fbm(x * 0.32 + 5, z * 0.32 - 2) * 0.9 - valley;
      if (r > density) continue;

      const dist = Math.hypot(x - CENTER.x, z - CENTER.z);
      const v = rand() < 0.45 ? 0 : rand() < 0.6 ? 1 : 2;
      // The valley in front of the base faces the camera: keep it modelled and
      // modestly sized. Behind it, thin the forest with distance and grow the
      // survivors to keep the cover.
      const front = z > FRONT_Z;
      const keep = front ? 0.8 : Math.max(0.5, Math.min(1, 1.15 - Math.max(0, dist - 3.2) * 0.09));
      const grow = front ? 1 : 1 + Math.max(0, dist - 5) * 0.04;
      const spot = {
        x,
        z,
        s: ((0.75 + rand() * 0.45) * grow) / Math.sqrt(keep),
        rot: rand() * Math.PI * 2,
        tint: 0.86 + rand() * 0.22,
      };
      if (rand() > keep) continue;
      if (front || dist < NEAR_R) near[v].push(spot);
      else far.push(spot);
    }
  }
  return { near: near.map((l) => cap(l, MAX_NEAR / 3)), far: cap(far, MAX_FAR) };
}

const dummy = new THREE.Object3D();
const tint = new THREE.Color();

function TreeInstances({
  geo,
  spots,
  scale = 1,
  shadowOnly = false,
}: {
  geo: THREE.BufferGeometry;
  spots: TreeSpot[];
  scale?: number;
  shadowOnly?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const max = Math.max(1, spots.length);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < spots.length; i++) {
      const p = spots[i];
      dummy.position.set(p.x, terrainHeight(p.x, p.z) - 0.03, p.z);
      dummy.rotation.set(0, p.rot, 0);
      dummy.scale.setScalar(p.s * scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (!shadowOnly) {
        tint.setRGB(p.tint, p.tint * (0.98 + (i % 5) * 0.01), p.tint);
        mesh.setColorAt(i, tint);
      }
    }
    mesh.count = spots.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [spots, scale, shadowOnly]);

  if (shadowOnly) {
    return (
      <instancedMesh
        key={max}
        ref={ref}
        args={[geo, undefined, max]}
        castShadow
        layers={SHADOW_LAYER_MASK}
      >
        <meshBasicMaterial colorWrite={false} />
      </instancedMesh>
    );
  }
  return (
    <instancedMesh key={max} ref={ref} args={[geo, undefined, max]} receiveShadow>
      <meshLambertMaterial vertexColors />
    </instancedMesh>
  );
}

/**
 * Forest that leaves clearings along every lift and trail in `anchors`: kit
 * pines near the hill, an 18-triangle stand-in further out, and a 6-triangle
 * cone per tree that casts the shadows.
 */
export function Trees({ anchors }: { anchors: LiftAnchor[] }) {
  const a = bakeKit(useKit("pine-a")).body;
  const b = bakeKit(useKit("pine-b")).body;
  const c = bakeKit(useKit("pine-c")).body;
  const far = useMemo(() => farPine(), []);
  const proxy = useMemo(() => proxyPine(), []);
  useEffect(
    () => () => {
      far.dispose();
      proxy.dispose();
    },
    [far, proxy],
  );
  const forest = useMemo(() => scatter(anchors), [anchors]);
  const all = useMemo(() => [...forest.near.flat(), ...forest.far], [forest]);
  // Proxy scale per spot differs by variant; the shared cone is close enough.
  return (
    <group>
      {[a, b, c].map((g, i) => (
        <TreeInstances key={i} geo={g} spots={forest.near[i]} scale={KIT_PINE_SCALE[i]} />
      ))}
      <TreeInstances geo={far} spots={forest.far} />
      <TreeInstances geo={proxy} spots={all} shadowOnly />
    </group>
  );
}
