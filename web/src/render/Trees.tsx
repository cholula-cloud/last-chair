"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { LiftAnchor } from "@/game/descent";
import { distSqToTrail, terrainHeight } from "./guestPaths";

const TREE_COUNT = 18;
const TRAIL_CLEAR = 0.6 ** 2;
const PINE = "#2d5a4a";

function scatterPositions(anchor: LiftAnchor, seed: number): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = [];
  let s = seed;
  const rand = () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
  let attempts = 0;
  while (out.length < TREE_COUNT && attempts < 400) {
    attempts++;
    const x = (rand() - 0.5) * 12;
    const z = rand() * 4.5 - 2.8;
    if (distSqToTrail(x, z, anchor) < TRAIL_CLEAR) continue;
    if (x > 3.8 && z > 1.5) continue;
    if (x < -4.5) continue;
    out.push({ x, z });
  }
  return out;
}

export function Trees({ liftAnchor }: { liftAnchor: LiftAnchor }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const coneRef = useRef<THREE.InstancedMesh>(null);

  const places = useMemo(
    () => scatterPositions(liftAnchor, 90210),
    [liftAnchor.x, liftAnchor.z],
  );

  useLayoutEffect(() => {
    const trunk = trunkRef.current;
    const cone = coneRef.current;
    if (!trunk || !cone) return;
    const dummy = new THREE.Object3D();
    places.forEach((p, i) => {
      const y = terrainHeight(p.x, p.z);
      const hScale = 0.7 + (i % 5) * 0.12;
      dummy.position.set(p.x, y, p.z);
      dummy.rotation.set(0, (i * 0.7) % (Math.PI * 2), 0);
      dummy.scale.set(hScale, hScale, hScale);
      dummy.updateMatrix();
      trunk.setMatrixAt(i, dummy.matrix);
      dummy.position.y = y + 0.55 * hScale;
      dummy.updateMatrix();
      cone.setMatrixAt(i, dummy.matrix);
    });
    trunk.instanceMatrix.needsUpdate = true;
    cone.instanceMatrix.needsUpdate = true;
  }, [places]);

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, places.length]}>
        <cylinderGeometry args={[0.06, 0.08, 0.5, 5]} />
        <meshStandardMaterial color="#4a3520" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={coneRef} args={[undefined, undefined, places.length]}>
        <coneGeometry args={[0.32, 0.85, 6]} />
        <meshStandardMaterial color={PINE} roughness={0.88} />
      </instancedMesh>
    </group>
  );
}