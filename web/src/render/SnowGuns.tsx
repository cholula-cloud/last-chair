"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { SnowGun } from "@/game/guns";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { bakeKit, LIFT_TOY_SCALE, METERS_TO_WORLD, mergePlaced, placeKit, useKit } from "./kit";
import { OVERLAY_DIM } from "./terrainOverlay";

const SCALE = METERS_TO_WORLD * LIFT_TOY_SCALE;
/** Kit fan nozzle height (5.6 m) in world units. */
const NOZZLE_Y = 5.6 * SCALE;
const MAX_PUFFS = 20;

type GunModel = SnowGun & { height: number; yaw: number };

function Plumes({ firing }: { firing: readonly GunModel[] }) {
  const puffs = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const mesh = puffs.current;
    if (!mesh) return;
    const perGun = Math.floor(MAX_PUFFS / firing.length);
    let index = 0;
    for (const gun of firing) {
      const dx = Math.sin(gun.yaw);
      const dz = Math.cos(gun.yaw);
      for (let i = 0; i < perGun; i++) {
        const f = (clock.elapsedTime * 0.45 + i / perGun) % 1;
        const distance = 0.16 + f * 1.3;
        dummy.position.set(
          gun.at.x + dx * distance,
          gun.height + NOZZLE_Y + f * 0.35 - f * f * 0.5,
          gun.at.z + dz * distance,
        );
        dummy.scale.setScalar(0.06 + f * 0.24);
        dummy.updateMatrix();
        mesh.setMatrixAt(index++, dummy.matrix);
      }
    }
    mesh.count = index;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={puffs} count={0} args={[undefined, undefined, MAX_PUFFS]} frustumCulled={false}>
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
  );
}

function PlacedGuns({ guns, fired, day }: { guns: readonly SnowGun[]; fired: boolean; day: number }) {
  const gunBody = bakeKit(useKit("snow-gun")).body;
  const models = useMemo(() => guns.map((gun) => {
    const { x, z } = gun.at;
    const slope = TERRAIN.gradient(x, z);
    return {
      ...gun,
      height: TERRAIN.height(x, z),
      yaw: Math.atan2(-slope.dx, -slope.dz),
    };
  }), [guns]);
  const geo = useMemo(() => mergePlaced(models.map(({ at, height, yaw }) =>
    placeKit(gunBody, at.x, height - 0.02, at.z, yaw, SCALE),
  )), [gunBody, models]);
  useEffect(() => () => geo.dispose(), [geo]);
  const firing = fired ? models.filter((gun) => gun.builtDay < day) : [];

  return (
    <group>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial vertexColors roughness={0.38} metalness={0.3} {...OVERLAY_DIM} />
      </mesh>
      {models.map(({ at, height, yaw }, index) => (
        <mesh key={`${at.x}-${at.z}`} position={[at.x, height - 0.02, at.z]} rotation-y={yaw} scale={SCALE}
          geometry={gunBody} visible={false} dispose={null} userData={{ asset: { kind: "gun", index } }} />
      ))}
      {firing.length > 0 && <Plumes firing={firing} />}
    </group>
  );
}

/** Render actual placements, with morning plumes from the guns that fired overnight. */
export function SnowGuns() {
  const guns = useGameStore((s) => s.guns);
  const fired = useGameStore((s) => s.gunsVisible);
  const day = useGameStore((s) => s.dayIndex);
  return guns.length > 0 ? <PlacedGuns guns={guns} fired={fired} day={day} /> : null;
}
