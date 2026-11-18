"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { LiftLine } from "@/game/descent";
import { merge, type Part } from "./geo";
import { bakeKit, SHADOW_LAYER_MASK, useKit } from "./kit";
import {
  forestForTarget,
  shouldRebuildForest,
  type ForestTiers,
  type TreeSpot,
} from "./forest";
import { sceneCameraTarget } from "./sceneCamera";
import { PALETTE } from "./palette";
import { TERRAIN } from "@/game/terrain";

const KIT_PINE_SCALE = [0.11, 0.085, 0.098] as const;

function farPine(): THREE.BufferGeometry {
  const tier = (r: number, h: number) => new THREE.ConeGeometry(r, h, 6, 1, true);
  const parts: Part[] = [
    { geo: tier(0.3, 0.5), color: PALETTE.pineDeep, pos: [0, 0.32, 0] },
    { geo: tier(0.22, 0.42), color: PALETTE.pine, pos: [0, 0.56, 0], rot: [0, 0.5, 0] },
    { geo: tier(0.11, 0.2), color: PALETTE.snow, pos: [0, 0.7, 0] },
  ];
  return merge(parts);
}

function birchGeo(): THREE.BufferGeometry {
  const parts: Part[] = [
    {
      geo: new THREE.CylinderGeometry(0.06, 0.09, 1.1, 5, 1),
      color: PALETTE.trimWhite,
      pos: [0, 0.55, 0],
    },
    {
      geo: new THREE.ConeGeometry(0.2, 0.35, 5, 1, true),
      color: PALETTE.birchCrown,
      pos: [0, 1.05, 0],
    },
    {
      geo: new THREE.ConeGeometry(0.14, 0.28, 5, 1, true),
      color: PALETTE.birchCrown,
      pos: [0.08, 1.28, 0],
      rot: [0, 0.4, 0],
    },
  ];
  return merge(parts);
}

function proxyPine(): THREE.BufferGeometry {
  return new THREE.ConeGeometry(0.28, 0.8, 6, 1, true).translate(0, 0.45, 0);
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
      dummy.position.set(p.x, TERRAIN.height(p.x, p.z) - 0.03, p.z);
      dummy.rotation.set(0, p.rot, 0);
      dummy.scale.setScalar(p.s * scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (!shadowOnly) {
        tint.setRGB(p.tint, p.tint * 0.98, p.tint * 0.96);
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
      <instancedMesh ref={ref} args={[geo, undefined, max]} castShadow layers={SHADOW_LAYER_MASK}>
        <meshBasicMaterial colorWrite={false} />
      </instancedMesh>
    );
  }
  return (
    <instancedMesh ref={ref} args={[geo, undefined, max]} receiveShadow>
      <meshLambertMaterial vertexColors />
    </instancedMesh>
  );
}

/**
 * Tiered forest around the camera target: kit pines and birch nearby, a
 * low-poly stand-in farther out, and shadow proxies on the near tier only.
 */
export function Trees({ lines }: { lines: LiftLine[] }) {
  const a = bakeKit(useKit("pine-a")).body;
  const b = bakeKit(useKit("pine-b")).body;
  const c = bakeKit(useKit("pine-c")).body;
  const far = useMemo(() => farPine(), []);
  const birch = useMemo(() => birchGeo(), []);
  const proxy = useMemo(() => proxyPine(), []);
  useEffect(
    () => () => {
      far.dispose();
      birch.dispose();
      proxy.dispose();
    },
    [far, birch, proxy],
  );

  const [forest, setForest] = useState<ForestTiers>(() =>
    forestForTarget(sceneCameraTarget, { lines }),
  );
  const lastTarget = useRef({ ...sceneCameraTarget });

  useFrame(() => {
    const t = sceneCameraTarget;
    if (!shouldRebuildForest(t, lastTarget.current)) return;
    lastTarget.current = { x: t.x, z: t.z };
    setForest(forestForTarget(t, { lines }));
  });

  const nearAll = useMemo(
    () => [...forest.near.flat(), ...forest.birch],
    [forest],
  );

  return (
    <group>
      {[a, b, c].map((g, i) => (
        <TreeInstances key={i} geo={g} spots={forest.near[i]} scale={KIT_PINE_SCALE[i]} />
      ))}
      <TreeInstances geo={birch} spots={forest.birch} scale={0.12} />
      <TreeInstances geo={far} spots={forest.mid} />
      <TreeInstances geo={proxy} spots={nearAll} shadowOnly />
    </group>
  );
}