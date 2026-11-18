"use client";

import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { LiftType } from "@/game/types";
import type { LiftLine } from "@/game/descent";
import { useGameStore } from "@/game/store";
import { placeGuests, type GuestPlacement } from "./guestPlacement";
import { useStallMap } from "./useStallMap";
import { bakeKit, METERS_TO_WORLD, SHADOW_LAYER_MASK, TOY_SCALE, useKit } from "./kit";
import { LIFT_CABLE_OFFSET } from "./layout";
import { TBAR_DROP, useCarrierGeometry } from "./Lift";
import { cableHeightAt, liftFrame, liftTowers } from "./liftLine";
import { HATS, JACKETS, PALETTE } from "./palette";

const SPLIT = ["jacket", "helmet"] as const;

const MAX = 48;
/** Kit skier (1.8 m) at toy scale so guests read on a phone. */
const SCALE = METERS_TO_WORLD * TOY_SCALE;
/** Hip height of the kit skier, metres. */
const HIP_M = 0.98;

/** Scratch objects reused by every layout pass (module scope: no per-frame allocation). */
const dummy = new THREE.Object3D();
const tint = new THREE.Color();

/** Latest placement of the followed guest, written by <Guests>, read by the camera rig. */
export type FollowedRef = RefObject<GuestPlacement | null>;

/** Cheap box standing in for a skier in the shadow pass (metres, scaled with the skier). */
const shadowProxy = new THREE.BoxGeometry(0.5, 1.7, 0.4).translate(0, 0.85, 0);

function idHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** A lift as the guests see it; the array index matches `Guest.liftIndex`. */
export type GuestLift = { line: LiftLine; type: LiftType; path?: readonly import("@/game/terrain").XZ[] };

export function Guests({
  lifts,
  followedRef,
}: {
  lifts: GuestLift[];
  followedRef: FollowedRef;
}) {
  const guests = useGameStore((s) => s.guests);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const followId = useGameStore((s) => s.followId);
  const stallMap = useStallMap(guests, dayIndex);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls as OrbitControlsImpl | undefined);

  const skier = bakeKit(useKit("skier"), SPLIT);
  const geos = { base: skier.body, jacket: skier.split.jacket, hat: skier.split.helmet };
  const tbar = useCarrierGeometry("surface");
  const chair = useCarrierGeometry("chair");
  // `lifts` changes identity on every sim tick (queues move); geometry only depends on anchor and type.
  const liftKey = lifts
    .map(
      (l) =>
        `${l.type}:${l.line.bottom.x},${l.line.bottom.z},${l.line.top.x},${l.line.top.z}`,
    )
    .join("|");
  const placedLifts = useMemo(
    () =>
      lifts.map((l) => ({
        line: l.line,
        type: l.type,
        towers: liftTowers(l.line),
        frame: liftFrame(l.line),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liftKey],
  );

  const baseRef = useRef<THREE.InstancedMesh>(null);
  const jacketRef = useRef<THREE.InstancedMesh>(null);
  const hatRef = useRef<THREE.InstancedMesh>(null);
  const tbarRef = useRef<THREE.InstancedMesh>(null);
  const chairRef = useRef<THREE.InstancedMesh>(null);
  const shadowRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.Group>(null);
  const markerRef = useRef<THREE.Mesh>(null);

  const placements = useMemo(
    () => placeGuests(guests, placedLifts, stallMap),
    [guests, placedLifts, stallMap],
  );

  useLayoutEffect(() => {
    const meshes = [baseRef.current, jacketRef.current, hatRef.current, shadowRef.current];
    const tbarMesh = tbarRef.current;
    const chairMesh = chairRef.current;
    if (meshes.some((m) => !m) || !tbarMesh || !chairMesh) return;
    const [base, jacket, hat, shadow] = meshes as THREE.InstancedMesh[];
    const tgt = controls?.target;
    const camDist =
      tgt && camera ? camera.position.distanceTo(new THREE.Vector3(tgt.x, tgt.y, tgt.z)) : 25;
    const sizeScale = Math.max(1, camDist / 25);
    // Pending and gone guests are not drawn; the rest fill instance slots 0..n-1.
    let n = 0;
    let tbars = 0;
    let chairs = 0;
    followedRef.current = null;
    guests.forEach((g, gi) => {
      if (g.state === "pending" || g.state === "gone") return;
      const p = placements[gi];
      const isFollowed = g.id === followId;
      if (isFollowed) followedRef.current = p;
      if (n >= MAX) return;
      const i = n++;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.lean * 0.6, p.yaw, p.roll * 0.6, "YXZ");
      dummy.scale.setScalar(SCALE * sizeScale * (isFollowed ? 1.25 : 1));
      dummy.updateMatrix();
      base.setMatrixAt(i, dummy.matrix);
      jacket.setMatrixAt(i, dummy.matrix);
      hat.setMatrixAt(i, dummy.matrix);
      shadow.setMatrixAt(i, dummy.matrix);
      const h = idHash(g.id);
      jacket.setColorAt(i, tint.set(JACKETS[h % JACKETS.length]));
      hat.setColorAt(i, tint.set(HATS[(h >> 3) % HATS.length]));

      if (g.state === "ride") {
        const lift = placedLifts[g.liftIndex ?? 0] ?? placedLifts[0];
        if (!lift) return;
        const { line, towers, frame } = lift;
        const t = g.progress;
        const lx = line.bottom.x + (line.top.x - line.bottom.x) * t + frame.px * LIFT_CABLE_OFFSET;
        const lz = line.bottom.z + (line.top.z - line.bottom.z) * t + frame.pz * LIFT_CABLE_OFFSET;
        const cy = cableHeightAt(t, towers) - 0.03;
        dummy.position.set(lx, cy, lz);
        dummy.rotation.set(0, frame.yaw, 0);
        if (lift.type === "chair") {
          dummy.scale.setScalar(1);
        } else {
          // Stretch the T-bar so the bar sits at the skier's hip.
          const reach = cy - (p.y + HIP_M * SCALE);
          dummy.scale.set(1, Math.max(0.4, reach / TBAR_DROP), 1);
        }
        dummy.updateMatrix();
        if (lift.type === "chair") chairMesh.setMatrixAt(chairs++, dummy.matrix);
        else tbarMesh.setMatrixAt(tbars++, dummy.matrix);
      }
    });
    for (const m of [base, jacket, hat, shadow]) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    tbarMesh.count = tbars;
    tbarMesh.instanceMatrix.needsUpdate = true;
    chairMesh.count = chairs;
    chairMesh.instanceMatrix.needsUpdate = true;
  }, [guests, placements, followId, placedLifts, followedRef]);

  useFrame(({ clock }) => {
    const p = followedRef.current;
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
      <instancedMesh ref={baseRef} args={[geos.base, undefined, MAX]} frustumCulled={false}>
        <meshLambertMaterial vertexColors />
      </instancedMesh>
      <instancedMesh ref={jacketRef} args={[geos.jacket, undefined, MAX]} frustumCulled={false}>
        <meshLambertMaterial vertexColors />
      </instancedMesh>
      <instancedMesh ref={hatRef} args={[geos.hat, undefined, MAX]} frustumCulled={false}>
        <meshLambertMaterial vertexColors />
      </instancedMesh>
      <instancedMesh
        ref={shadowRef}
        args={[shadowProxy, undefined, MAX]}
        castShadow
        frustumCulled={false}
        layers={SHADOW_LAYER_MASK}
      >
        <meshBasicMaterial colorWrite={false} />
      </instancedMesh>
      <instancedMesh ref={tbarRef} args={[tbar, undefined, MAX]} castShadow frustumCulled={false}>
        <meshLambertMaterial vertexColors />
      </instancedMesh>
      <instancedMesh ref={chairRef} args={[chair, undefined, MAX]} castShadow frustumCulled={false}>
        <meshLambertMaterial vertexColors />
      </instancedMesh>
      <group ref={ringRef} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <ringGeometry args={[0.24, 0.32, 28]} />
          <meshBasicMaterial color={PALETTE.marker} transparent opacity={0.85} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={markerRef} visible={false} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.09, 0.2, 4]} />
        <meshBasicMaterial color={PALETTE.marker} toneMapped={false} />
      </mesh>
    </group>
  );
}
