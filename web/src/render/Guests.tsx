"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Guest, LiftType } from "@/game/types";
import type { LiftAnchor } from "@/game/descent";
import { box, merge, sphere, type Part } from "./geo";
import { carrierGeometry } from "./Lift";
import {
  cableHeightAt,
  LIFT_BASE,
  LIFT_CABLE_OFFSET,
  liftFrame,
  liftTowers,
  placeGuests,
  type GuestPlacement,
} from "./guestPaths";
import { HATS, JACKETS } from "./palette";

const MAX = 48;
/** Toy scale: slightly oversized so skiers read on a phone. */
const SCALE = 1.25;

const WHITE = "#ffffff";
const PANTS = "#222a36";
const SKIN = "#f1c7a3";

/** Skier parts in three groups: fixed colours, jacket (tinted), hat (tinted). */
function skierGeometries() {
  const base: Part[] = [
    // Legs / boots.
    { geo: box(0.05, 0.15, 0.06), color: PANTS, pos: [-0.035, 0.09, 0] },
    { geo: box(0.05, 0.15, 0.06), color: PANTS, pos: [0.035, 0.09, 0] },
    // Skis.
    { geo: box(0.035, 0.014, 0.44), color: "#1b2129", pos: [-0.04, 0.008, 0.03] },
    { geo: box(0.035, 0.014, 0.44), color: "#1b2129", pos: [0.04, 0.008, 0.03] },
    { geo: box(0.036, 0.016, 0.06), color: "#f4f7fb", pos: [-0.04, 0.012, 0.22] },
    { geo: box(0.036, 0.016, 0.06), color: "#f4f7fb", pos: [0.04, 0.012, 0.22] },
    // Poles.
    { geo: box(0.012, 0.3, 0.012), color: "#9aa4b0", pos: [-0.11, 0.14, -0.04], rot: [-0.35, 0, 0.12] },
    { geo: box(0.012, 0.3, 0.012), color: "#9aa4b0", pos: [0.11, 0.14, -0.04], rot: [-0.35, 0, -0.12] },
    // Face and goggles.
    { geo: sphere(0.055, 8, 6), color: SKIN, pos: [0, 0.37, 0] },
    { geo: box(0.09, 0.025, 0.03), color: "#1b2129", pos: [0, 0.385, 0.042] },
  ];
  const jacket: Part[] = [
    { geo: box(0.13, 0.16, 0.1), color: WHITE, pos: [0, 0.245, 0] },
    { geo: box(0.04, 0.13, 0.05), color: WHITE, pos: [-0.085, 0.24, 0.015], rot: [-0.4, 0, 0.15] },
    { geo: box(0.04, 0.13, 0.05), color: WHITE, pos: [0.085, 0.24, 0.015], rot: [-0.4, 0, -0.15] },
  ];
  const hat: Part[] = [
    { geo: sphere(0.062, 8, 5), color: WHITE, pos: [0, 0.4, -0.005], scale: [1, 0.8, 1] },
    { geo: sphere(0.022, 6, 4), color: WHITE, pos: [0, 0.455, -0.005] },
  ];
  return { base: merge(base), jacket: merge(jacket), hat: merge(hat) };
}

function idHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Guests({
  guests,
  followId,
  liftAnchor,
  liftType,
}: {
  guests: Guest[];
  followId: string | null;
  liftAnchor: LiftAnchor;
  liftType: LiftType;
}) {
  const geos = useMemo(() => skierGeometries(), []);
  const hanger = useMemo(() => carrierGeometry(liftType), [liftType]);
  useEffect(
    () => () => {
      geos.base.dispose();
      geos.jacket.dispose();
      geos.hat.dispose();
    },
    [geos],
  );
  useEffect(() => () => hanger.dispose(), [hanger]);

  const baseRef = useRef<THREE.InstancedMesh>(null);
  const jacketRef = useRef<THREE.InstancedMesh>(null);
  const hatRef = useRef<THREE.InstancedMesh>(null);
  const hangerRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.Group>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  const followed = useRef<GuestPlacement | null>(null);

  const placements = useMemo(
    () => placeGuests(guests, liftAnchor, liftType),
    [guests, liftAnchor, liftType],
  );

  useLayoutEffect(() => {
    const meshes = [baseRef.current, jacketRef.current, hatRef.current];
    const hang = hangerRef.current;
    if (meshes.some((m) => !m) || !hang) return;
    const [base, jacket, hat] = meshes as THREE.InstancedMesh[];
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    const towers = liftTowers(liftAnchor);
    const frame = liftFrame(liftAnchor);
    const n = Math.min(MAX, guests.length);
    let hangers = 0;
    followed.current = null;
    for (let i = 0; i < n; i++) {
      const g = guests[i];
      const p = placements[i];
      const isFollowed = g.id === followId;
      if (isFollowed) followed.current = p;
      d.position.set(p.x, p.y, p.z);
      d.rotation.set(p.lean * 0.6, p.yaw, p.roll * 0.6, "YXZ");
      d.scale.setScalar(SCALE * (isFollowed ? 1.25 : 1));
      d.updateMatrix();
      base.setMatrixAt(i, d.matrix);
      jacket.setMatrixAt(i, d.matrix);
      hat.setMatrixAt(i, d.matrix);
      const h = idHash(g.id);
      jacket.setColorAt(i, c.set(JACKETS[h % JACKETS.length]));
      hat.setColorAt(i, c.set(HATS[(h >> 3) % HATS.length]));

      if (g.state === "ride" && hangers < MAX) {
        const t = g.progress;
        const lx = LIFT_BASE.x + (liftAnchor.x - LIFT_BASE.x) * t + frame.px * LIFT_CABLE_OFFSET;
        const lz = LIFT_BASE.z + (liftAnchor.z - LIFT_BASE.z) * t + frame.pz * LIFT_CABLE_OFFSET;
        const cy = cableHeightAt(t, towers) - 0.04;
        d.position.set(lx, cy, lz);
        d.rotation.set(0, frame.yaw, 0);
        if (liftType === "chair") {
          d.scale.setScalar(1);
        } else {
          // Stretch the T-bar so the bar sits at the skier's hip.
          const reach = cy - (p.y + 0.27 * SCALE);
          d.scale.set(1, Math.max(0.4, reach / 0.6), 1);
        }
        d.updateMatrix();
        hang.setMatrixAt(hangers++, d.matrix);
      }
    }
    for (const m of meshes as THREE.InstancedMesh[]) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    hang.count = hangers;
    hang.instanceMatrix.needsUpdate = true;
  }, [guests, placements, followId, liftAnchor, liftType]);

  useFrame(({ clock }) => {
    const p = followed.current;
    const ring = ringRef.current;
    const marker = markerRef.current;
    if (!ring || !marker) return;
    ring.visible = marker.visible = !!p;
    if (!p) return;
    const t = clock.elapsedTime;
    ring.position.set(p.x, p.y + 0.03, p.z);
    const s = 1 + Math.sin(t * 4) * 0.08;
    ring.scale.set(s, s, s);
    marker.position.set(p.x, p.y + 0.9 + Math.sin(t * 3) * 0.05, p.z);
    marker.rotation.y = t * 1.5;
  });

  return (
    <group>
      <instancedMesh ref={baseRef} args={[geos.base, undefined, MAX]} castShadow frustumCulled={false}>
        <meshLambertMaterial vertexColors />
      </instancedMesh>
      <instancedMesh ref={jacketRef} args={[geos.jacket, undefined, MAX]} castShadow frustumCulled={false}>
        <meshLambertMaterial vertexColors />
      </instancedMesh>
      <instancedMesh ref={hatRef} args={[geos.hat, undefined, MAX]} castShadow frustumCulled={false}>
        <meshLambertMaterial vertexColors />
      </instancedMesh>
      <instancedMesh ref={hangerRef} args={[hanger, undefined, MAX]} castShadow frustumCulled={false}>
        <meshLambertMaterial vertexColors />
      </instancedMesh>
      <group ref={ringRef} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <ringGeometry args={[0.24, 0.32, 28]} />
          <meshBasicMaterial color="#ffb020" transparent opacity={0.85} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={markerRef} visible={false} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.09, 0.2, 4]} />
        <meshBasicMaterial color="#ffb020" toneMapped={false} />
      </mesh>
    </group>
  );
}

export function followedGuestPosition(
  guests: Guest[],
  followId: string | null,
  liftAnchor: LiftAnchor,
  liftType: LiftType = "surface",
): { x: number; y: number; z: number } | null {
  if (!followId) return null;
  const idx = guests.findIndex((g) => g.id === followId);
  if (idx < 0) return null;
  const p = placeGuests(guests, liftAnchor, liftType)[idx];
  return { x: p.x, y: p.y, z: p.z };
}
