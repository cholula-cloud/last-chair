"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { bakeKit, LIFT_TOY_SCALE, METERS_TO_WORLD, mergePlaced, placeKit, useKit } from "./kit";
import type { LiftAnchor } from "@/game/descent";
import { terrainHeight } from "./terrainShape";
import { trailPoint } from "./trail";

/** Guns stand beside the trail at these positions along it (0 = lift top, 1 = lodge). */
const GUN_SPOTS: { t: number; side: number }[] = [
  { t: 0.78, side: 0.75 },
  { t: 0.42, side: -0.75 },
];
type Gun = { x: number; z: number; yaw: number; elevation: number };

function placeGuns(anchor: LiftAnchor): Gun[] {
  return GUN_SPOTS.map(({ t, side }) => {
    const c = trailPoint(t, anchor);
    const a = trailPoint(t - 0.02, anchor);
    const b = trailPoint(t + 0.02, anchor);
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const nx = -(b.z - a.z) / len;
    const nz = (b.x - a.x) / len;
    // Face the trail.
    return {
      x: c.x + nx * side,
      z: c.z + nz * side,
      yaw: Math.atan2(-nx * side, -nz * side),
      elevation: 1 - t,
    };
  });
}
const PUFFS = 14;
const SCALE = METERS_TO_WORLD * LIFT_TOY_SCALE;
/** Kit fan nozzle height (5.6 m) in world units. */
const NOZZLE_Y = 5.6 * SCALE;

/** Kit tower snow guns with a plume when running. */
export function SnowGuns({
  reach,
  anchor,
}: {
  /** Fraction of the trail from the bottom the guns covered last night; 0 = off. */
  reach: number;
  anchor: LiftAnchor;
}) {
  const GUNS = useMemo(() => placeGuns(anchor), [anchor]);
  const gun = bakeKit(useKit("snow-gun")).body;
  const geo = useMemo(
    () =>
      mergePlaced(
        GUNS.map((g) => placeKit(gun, g.x, terrainHeight(g.x, g.z) - 0.02, g.z, g.yaw, SCALE)),
      ),
    [gun, GUNS],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  const puffs = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const m = puffs.current;
    if (!m) return;
    // Plume only from guns whose stretch of trail is within reach.
    const firing = GUNS.filter((g) => g.elevation <= reach + 1e-9);
    m.visible = firing.length > 0;
    if (firing.length === 0) return;
    const t = clock.elapsedTime;
    let k = 0;
    for (const g of firing) {
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
    m.count = k;
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
