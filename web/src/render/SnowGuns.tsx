"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { box, cyl, merge, type Part } from "./geo";
import { terrainHeight } from "./guestPaths";
import { PALETTE } from "./palette";

const GUNS: { x: number; z: number; yaw: number }[] = [
  { x: -2.2, z: 0.2, yaw: 0.9 },
  { x: 1.6, z: -0.4, yaw: -0.6 },
];
const PUFFS = 14;

/** Tower snow guns: mast, yellow fan housing, and a plume when running. */
export function SnowGuns({ active }: { active: boolean }) {
  const geo = useMemo(() => {
    const parts: Part[] = [];
    for (const g of GUNS) {
      const y = terrainHeight(g.x, g.z);
      const c = Math.cos(g.yaw);
      const s = Math.sin(g.yaw);
      const fan = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(Math.PI / 2 - 0.35, g.yaw, 0, "YXZ"),
        ),
      );
      parts.push(
        { geo: cyl(0.025, 0.035, 0.9, 6), color: PALETTE.steel, pos: [g.x, y + 0.45, g.z] },
        {
          geo: cyl(0.1, 0.085, 0.16, 12),
          color: "#f2c014",
          pos: [g.x + s * 0.05, y + 0.92, g.z + c * 0.05],
          rot: [fan.x, fan.y, fan.z],
        },
        { geo: box(0.12, 0.08, 0.1), color: "#2c333b", pos: [g.x, y + 0.08, g.z] },
      );
    }
    return merge(parts);
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);

  const puffs = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const m = puffs.current;
    if (!m) return;
    m.visible = active;
    if (!active) return;
    const t = clock.elapsedTime;
    let k = 0;
    for (const g of GUNS) {
      const y = terrainHeight(g.x, g.z) + 0.95;
      const dx = Math.sin(g.yaw);
      const dz = Math.cos(g.yaw);
      for (let i = 0; i < PUFFS / GUNS.length; i++) {
        const f = (t * 0.45 + i / (PUFFS / GUNS.length)) % 1;
        dummy.position.set(
          g.x + dx * (0.12 + f * 1.3),
          y + f * 0.35 - f * f * 0.5,
          g.z + dz * (0.12 + f * 1.3),
        );
        dummy.scale.setScalar(0.06 + f * 0.24);
        dummy.updateMatrix();
        m.setMatrixAt(k++, dummy.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={geo} castShadow>
        <meshLambertMaterial vertexColors />
      </mesh>
      <instancedMesh ref={puffs} args={[undefined, undefined, PUFFS]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshLambertMaterial
          color="#ffffff"
          emissive="#dfe9ff"
          emissiveIntensity={0.3}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}
