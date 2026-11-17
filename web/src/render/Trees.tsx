"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { LiftAnchor } from "@/game/descent";
import {
  distSqToLiftLine,
  distSqToPolyline,
  fbm,
  LIFT_BASE,
  ROAD_Z,
  terrainHeight,
  trailPolyline,
} from "./guestPaths";
import { cone, cyl, merge, type Part } from "./geo";
import { PALETTE } from "./palette";

const MAX_PER_VARIANT = 480;
const TRAIL_CLEAR = 0.64 ** 2;
const LIFT_CLEAR = 0.5 ** 2;

/** Tiered conifer: green tiers, each with a white snow cap on its top. */
function conifer(
  tiers: { r: number; h: number; y: number }[],
  green: string,
  trunkH: number,
): THREE.BufferGeometry {
  const parts: Part[] = [
    { geo: cyl(0.035, 0.05, trunkH, 5), color: PALETTE.bark, pos: [0, trunkH / 2, 0] },
  ];
  for (const t of tiers) {
    parts.push({ geo: cone(t.r, t.h, 7), color: green, pos: [0, t.y + t.h / 2, 0] });
    const ch = t.h * 0.44;
    parts.push({
      geo: cone(t.r * 0.56, ch, 7),
      color: PALETTE.snow,
      pos: [0, t.y + t.h - ch / 2 + 0.012, 0],
      rot: [0, 0.4, 0],
    });
  }
  return merge(parts);
}

const VARIANTS = [
  () =>
    conifer(
      [
        { r: 0.3, h: 0.4, y: 0.1 },
        { r: 0.24, h: 0.36, y: 0.3 },
        { r: 0.17, h: 0.32, y: 0.5 },
      ],
      PALETTE.pineDeep,
      0.16,
    ),
  () =>
    conifer(
      [
        { r: 0.34, h: 0.32, y: 0.08 },
        { r: 0.29, h: 0.3, y: 0.24 },
        { r: 0.22, h: 0.28, y: 0.4 },
        { r: 0.14, h: 0.26, y: 0.56 },
      ],
      PALETTE.pine,
      0.12,
    ),
  () =>
    conifer(
      [
        { r: 0.2, h: 0.42, y: 0.1 },
        { r: 0.15, h: 0.36, y: 0.34 },
      ],
      PALETTE.pineCool,
      0.14,
    ),
];

type TreeSpot = { x: number; z: number; s: number; rot: number; tint: number };

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function scatter(anchors: LiftAnchor[]): TreeSpot[][] {
  const rand = rng(90210);
  const trails = anchors.map((a) => trailPolyline(a, 28));
  const out: TreeSpot[][] = [[], [], []];
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
      const density =
        0.86 + fbm(x * 0.32 + 5, z * 0.32 - 2) * 0.9 - valley;
      if (r > density) continue;

      const dist = Math.hypot(x - 0.6, z + 0.5);
      const v = rand() < 0.45 ? 0 : rand() < 0.6 ? 1 : 2;
      out[v].push({
        x,
        z,
        s: (0.75 + rand() * 0.45) * (1 + Math.max(0, dist - 5) * 0.06),
        rot: rand() * Math.PI * 2,
        tint: 0.82 + rand() * 0.28,
      });
    }
  }
  // Cap per variant (keep a stable random subset).
  return out.map((list) =>
    list.length <= MAX_PER_VARIANT
      ? list
      : list.filter((_, i) => (i * 2654435761) % list.length < MAX_PER_VARIANT),
  );
}

function TreeVariant({ geo, spots }: { geo: THREE.BufferGeometry; spots: TreeSpot[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const c = new THREE.Color();
    const n = Math.min(spots.length, MAX_PER_VARIANT);
    for (let i = 0; i < n; i++) {
      const p = spots[i];
      dummy.position.set(p.x, terrainHeight(p.x, p.z) - 0.03, p.z);
      dummy.rotation.set(0, p.rot, 0);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      c.setRGB(p.tint, p.tint * (0.97 + (i % 5) * 0.012), p.tint);
      mesh.setColorAt(i, c);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [spots]);

  return (
    <instancedMesh
      ref={ref}
      args={[geo, undefined, MAX_PER_VARIANT]}
      castShadow
      receiveShadow
    >
      <meshLambertMaterial vertexColors />
    </instancedMesh>
  );
}

export function Trees({ anchors }: { anchors: LiftAnchor[] }) {
  const geos = useMemo(() => VARIANTS.map((v) => v()), []);
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  const key = anchors.map((a) => `${a.x},${a.z}`).join("|");
  const spots = useMemo(
    () =>
      scatter(
        key
          .split("|")
          .filter(Boolean)
          .map((s) => {
            const [x, z] = s.split(",").map(Number);
            return { x, z };
          }),
      ),
    [key],
  );
  return (
    <group>
      {geos.map((g, i) => (
        <TreeVariant key={i} geo={g} spots={spots[i]} />
      ))}
    </group>
  );
}
