"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { LodgeTier } from "@/game/base";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { METERS_TO_WORLD } from "./kit";
import { LODGE } from "./layout";
import { useReducedMotion } from "./useReducedMotion";

const PUFFS_PER_STACK = 4;
const MAX_PUFFS = 24;

type Stack = { x: number; y: number; z: number; seed: number };

function lodgeChimneyOffset(tier: LodgeTier): [number, number, number] {
  const s = METERS_TO_WORLD;
  if (tier === 1) return [6.75 * s, 13.7 * s, -1.2 * s];
  if (tier === 2) return [8.9 * s, 14.5 * s, -1.8 * s];
  return [8.1 * s, 17.2 * s, -1.55 * s];
}

/**
 * Gentle stylized low-poly chimney smoke puffs drifting from the base lodge
 * and placed warming huts in a single instanced draw call.
 */
export function ChimneySmoke() {
  const tier = useGameStore((s) => s.lodgeTier);
  const assets = useGameStore((s) => s.assets);
  const reduced = useReducedMotion();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const stacks = useMemo<Stack[]>(() => {
    const out: Stack[] = [];
    const [dx, dy, dz] = lodgeChimneyOffset(tier);
    out.push({
      x: LODGE.x + dx,
      y: TERRAIN.height(LODGE.x, LODGE.z + 0.05) - 0.02 + dy,
      z: LODGE.z + 0.05 + dz,
      seed: 0.17,
    });
    const s = METERS_TO_WORLD * 1.05;
    assets.forEach((asset, idx) => {
      if (asset.id !== "warming_hut") return;
      const yaw = asset.attachPad === 1 ? Math.PI : 0;
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      const lx = 1.2 * s;
      const lz = -0.6 * s;
      const wx = asset.at.x + lx * cos + lz * sin;
      const wz = asset.at.z - lx * sin + lz * cos;
      out.push({
        x: wx,
        y: TERRAIN.height(asset.at.x, asset.at.z) - 0.02 + 5.55 * s,
        z: wz,
        seed: 0.41 + idx * 0.23,
      });
    });
    return out;
  }, [tier, assets]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (reduced.current) {
      mesh.count = 0;
      return;
    }
    const tNow = clock.elapsedTime * 0.24;
    let count = 0;
    for (const st of stacks) {
      for (let i = 0; i < PUFFS_PER_STACK; i++) {
        if (count >= MAX_PUFFS) break;
        const p = (tNow + st.seed + i / PUFFS_PER_STACK) % 1;
        const rise = p * 0.72;
        const driftX = p * 0.26 + Math.sin(p * Math.PI * 2 + i) * 0.03;
        const driftZ = -p * 0.16;
        const scale = Math.sin(p * Math.PI) * (0.045 + p * 0.055);
        dummy.position.set(st.x + driftX, st.y + rise, st.z + driftZ);
        dummy.rotation.set(p * 1.2, p * 0.9, i * 0.7);
        dummy.scale.setScalar(Math.max(0.001, scale));
        dummy.updateMatrix();
        mesh.setMatrixAt(count++, dummy.matrix);
      }
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} count={0} args={[undefined, undefined, MAX_PUFFS]} frustumCulled={false}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#f5f8fc" roughness={0.95} transparent opacity={0.62} depthWrite={false} />
    </instancedMesh>
  );
}
