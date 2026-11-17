"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { bakeKit, LIFT_TOY_SCALE, METERS_TO_WORLD, mergePlaced, placeKit, useKit } from "./kit";
import { terrainHeight } from "./terrainShape";

const GUNS: { x: number; z: number; yaw: number }[] = [
  { x: -2.2, z: 0.2, yaw: 0.9 },
  { x: 1.6, z: -0.4, yaw: -0.6 },
];
const PUFFS = 14;
const SCALE = METERS_TO_WORLD * LIFT_TOY_SCALE;
/** Kit fan nozzle height (5.6 m) in world units. */
const NOZZLE_Y = 5.6 * SCALE;

/** Kit tower snow guns with a plume when running. */
export function SnowGuns({ active }: { active: boolean }) {
  const gun = bakeKit(useKit("snow-gun")).body;
  const geo = useMemo(
    () =>
      mergePlaced(
        GUNS.map((g) => placeKit(gun, g.x, terrainHeight(g.x, g.z) - 0.02, g.z, g.yaw, SCALE)),
      ),
    [gun],
  );
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
      const y = terrainHeight(g.x, g.z) + NOZZLE_Y;
      const dx = Math.sin(g.yaw);
      const dz = Math.cos(g.yaw);
      for (let i = 0; i < PUFFS / GUNS.length; i++) {
        const f = (t * 0.45 + i / (PUFFS / GUNS.length)) % 1;
        dummy.position.set(
          g.x + dx * (0.16 + f * 1.3),
          y + f * 0.35 - f * f * 0.5,
          g.z + dz * (0.16 + f * 1.3),
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
