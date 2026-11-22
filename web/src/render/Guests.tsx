"use client";

import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControlsImpl } from "./orbitControlsType";
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useShallow } from "zustand/react/shallow";
import * as THREE from "three";
import type { LiftType } from "@/game/types";
import type { LiftLine } from "@/game/descent";
import { useGameStore } from "@/game/store";
import { useReducedMotion } from "./useReducedMotion";
import { pathSampler } from "./trail";
import { placeGuests, type GuestPlacement } from "./guestPlacement";
import { useStallMap } from "./useStallMap";
import { LIFT_CABLE_OFFSET } from "./layout";
import { TBAR_DROP, useCarrierGeometry } from "./Lift";
import { cableHeightAt, liftFrame, liftTowers } from "./liftLine";
import { HATS, JACKETS, PALETTE } from "./palette";
import { OVERLAY_DIM } from "./terrainOverlay";
import { satisfactionContext } from "@/game/rules";
import { guestSatisfaction } from "@/game/satisfaction";
import { jacketForGuest, type GuestVariant, variantOf } from "./guestLook";
import { GUEST_SCALE, GUEST_VARIANTS, GuestVariantLayer, type VariantMeshes } from "./GuestVariantLayers";

const MAX = 24;
const HIP_M = 0.98;

const dummy = new THREE.Object3D();
const jacketTint = new THREE.Color();
const hatTint = new THREE.Color();

export type FollowedRef = RefObject<GuestPlacement | null>;

function idHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function variantScale(variant: GuestVariant): number {
  return variant === "skier-kid" || variant === "boarder-kid" ? 0.82 : 1;
}

function boarderYawOffset(variant: GuestVariant, yaw: number, skiing: boolean): number {
  if (!skiing) return yaw;
  if (variant === "boarder" || variant === "boarder-kid") return yaw + Math.PI / 2;
  return yaw;
}

export type GuestLift = { line: LiftLine; type: LiftType; path?: readonly import("@/game/terrain").XZ[] };

export function Guests({
  lifts,
  trailPaths,
  followedRef,
}: {
  lifts: GuestLift[];
  trailPaths?: readonly (readonly import("@/game/terrain").XZ[] | undefined)[];
  followedRef: FollowedRef;
}) {
  const guests = useGameStore((s) => s.guests);
  const trails = useGameStore((s) => s.trails);
  const routes = useMemo(() => trails.filter((t) => t.open && t.path.length > 1).map((t) => pathSampler(t.path)), [trails]);
  const reduced = useReducedMotion();
  const assets = useGameStore((s) => s.assets);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const followId = useGameStore((s) => s.followId);
  const guestLens = useGameStore((s) => s.guestLens);
  const moodCtx = useGameStore(useShallow(satisfactionContext));
  const stallMap = useStallMap(guests, dayIndex);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls as OrbitControlsImpl | undefined);

  const tbar = useCarrierGeometry("surface");
  const chair = useCarrierGeometry("chair");
  const liftKey = lifts
    .map((l) => `${l.type}:${l.line.bottom.x},${l.line.bottom.z},${l.line.top.x},${l.line.top.z}`)
    .join("|");
  const placedLifts = useMemo(
    () =>
      lifts.map((l) => ({
        line: l.line,
        type: l.type,
        towers: liftTowers(l.line, l.type),
        frame: liftFrame(l.line),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liftKey],
  );

  const meshMap = useRef(new Map<GuestVariant, VariantMeshes>());
  const [meshLayersReady, setMeshLayersReady] = useState(0);
  const onVariantReady = useCallback((variant: GuestVariant, meshes: VariantMeshes | null) => {
    if (meshes) meshMap.current.set(variant, meshes);
    else meshMap.current.delete(variant);
    setMeshLayersReady(meshMap.current.size);
  }, []);

  const tbarRef = useRef<THREE.InstancedMesh>(null);
  const chairRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.Group>(null);
  const markerRef = useRef<THREE.Mesh>(null);

  const placements = useMemo(
    () => placeGuests(guests, placedLifts, stallMap, trailPaths, assets),
    [guests, placedLifts, stallMap, trailPaths, assets],
  );

  useLayoutEffect(() => {
    if (meshMap.current.size < GUEST_VARIANTS.length) return;
    const tbarMesh = tbarRef.current;
    const chairMesh = chairRef.current;
    if (!tbarMesh || !chairMesh) return;

    const counts = Object.fromEntries(GUEST_VARIANTS.map((v) => [v, 0])) as Record<GuestVariant, number>;
    const tgt = controls?.target;
    const camDist = tgt ? camera.position.distanceTo(tgt) : 25;
    const sizeScale = Math.max(1, camDist / 25);
    let tbars = 0;
    let chairs = 0;
    followedRef.current = null;
    const game = useGameStore.getState();
    const downhill = guests.filter((g) => g.state === "ski").length;
    const decorative =
      routes.length && game.phase === "day"
        ? Math.max(0, Math.min(5, Math.floor(game.dayStats.guestsArrived / 4)) - downhill)
        : 0;
    const totalCap = MAX - decorative;

    const priority = (i: number) => {
      const guest = guests[i];
      return guest.id === followId ? 0 : guest.state === "ride" || guest.state === "ski" ? 1 : 2;
    };
    const order = guests.map((_, i) => i).sort((a, b) => priority(a) - priority(b));

    const setGuestMatrix = (
      variant: GuestVariant,
      slot: number,
      matrix: THREE.Matrix4,
      jacketColor: THREE.Color,
      hatColor: THREE.Color,
    ) => {
      const m = meshMap.current.get(variant);
      if (!m) return;
      m.base.setMatrixAt(slot, matrix);
      m.jacket.setMatrixAt(slot, matrix);
      m.hat.setMatrixAt(slot, matrix);
      m.shadow.setMatrixAt(slot, matrix);
      m.jacket.setColorAt(slot, jacketColor);
      m.hat.setColorAt(slot, hatColor);
    };

    order.forEach((gi) => {
      const g = guests[gi];
      if (g.state === "pending" || g.state === "gone") return;
      const p = placements[gi];
      const variant = variantOf(g.id, g.persona);
      const shown = GUEST_VARIANTS.reduce((sum, v) => sum + counts[v], 0);
      if (shown >= totalCap) return;
      const slot = counts[variant];
      counts[variant] = slot + 1;

      const isFollowed = g.id === followId;
      if (isFollowed) followedRef.current = p;

      const skiing = g.state === "ski";
      const yaw = boarderYawOffset(variant, p.yaw, skiing);
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.lean * 0.6, yaw, p.roll * 0.6, "YXZ");
      dummy.scale.setScalar(GUEST_SCALE * sizeScale * variantScale(variant) * (isFollowed ? 1.25 : 1));
      dummy.updateMatrix();
      const h = idHash(g.id);
      const moodJacket = jacketForGuest(g, guestLens, guestSatisfaction(g, moodCtx));
      setGuestMatrix(
        variant,
        slot,
        dummy.matrix,
        jacketTint.set(moodJacket ?? JACKETS[h % JACKETS.length]),
        hatTint.set(HATS[(h >> 3) % HATS.length]),
      );

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
        if (lift.type === "chair") dummy.scale.setScalar(variantScale(variant));
        else {
          const reach = cy - (p.y + HIP_M * GUEST_SCALE * variantScale(variant));
          dummy.scale.set(1, Math.max(0.4, reach / TBAR_DROP), 1);
        }
        dummy.updateMatrix();
        if (lift.type === "chair") chairMesh.setMatrixAt(chairs++, dummy.matrix);
        else tbarMesh.setMatrixAt(tbars++, dummy.matrix);
      }
    });

    let totalDrawn = GUEST_VARIANTS.reduce((n, v) => n + counts[v], 0);
    const target = Math.min(MAX, game.dayStats.guestsArrived, totalDrawn * 3);
    if (game.phase === "day" && routes.length && totalDrawn < target) {
      for (let j = 0; totalDrawn < target; j++) {
        const variant: GuestVariant = GUEST_VARIANTS[j % GUEST_VARIANTS.length];
        const slot = counts[variant];
        counts[variant] = slot + 1;
        totalDrawn++;
        const sample = routes[j % routes.length];
        const progress = (0.17 + j * 0.618 + (reduced.current ? 0 : game.clockMin / 27)) % 1;
        const point = sample(progress);
        const ahead = sample(Math.min(1, progress + 0.01));
        dummy.position.set(point.x, point.y, point.z);
        dummy.rotation.set(0.18, Math.atan2(ahead.x - point.x, ahead.z - point.z), 0, "YXZ");
        dummy.scale.setScalar(GUEST_SCALE * sizeScale * variantScale(variant));
        dummy.updateMatrix();
        setGuestMatrix(
          variant,
          slot,
          dummy.matrix,
          jacketTint.set(JACKETS[j % JACKETS.length]),
          hatTint.set(HATS[j % HATS.length]),
        );
      }
    }

    for (const variant of GUEST_VARIANTS) {
      const m = meshMap.current.get(variant);
      if (!m) continue;
      const c = counts[variant];
      for (const mesh of [m.base, m.jacket, m.hat, m.shadow]) {
        mesh.count = c;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
    tbarMesh.count = tbars;
    tbarMesh.instanceMatrix.needsUpdate = true;
    chairMesh.count = chairs;
    chairMesh.instanceMatrix.needsUpdate = true;
  }, [guests, placements, followId, placedLifts, followedRef, camera, controls, routes, reduced, meshLayersReady, guestLens, moodCtx]);

  useFrame(({ clock }) => {
    const p = followedRef.current;
    const ring = ringRef.current;
    const marker = markerRef.current;
    if (!ring || !marker) return;
    ring.visible = marker.visible = !!p;
    if (!p) return;
    const t = reduced.current ? 0 : clock.elapsedTime;
    ring.position.set(p.x, p.y + 0.03, p.z);
    const s = 1 + Math.sin(t * 4) * 0.08;
    ring.scale.set(s, s, s);
    marker.position.set(p.x, p.y + 0.9 + Math.sin(t * 3) * 0.05, p.z);
    marker.rotation.y = t * 1.5;
  });

  return (
    <group name="guests">
      {GUEST_VARIANTS.map((variant) => (
        <GuestVariantLayer key={variant} variant={variant} max={MAX} onReady={onVariantReady} />
      ))}
      <instancedMesh ref={tbarRef} args={[tbar, undefined, MAX]} castShadow frustumCulled={false}>
        <meshLambertMaterial vertexColors {...OVERLAY_DIM} />
      </instancedMesh>
      <instancedMesh name="occupied-chairs" ref={chairRef} args={[chair, undefined, MAX]} castShadow frustumCulled={false}>
        <meshLambertMaterial vertexColors {...OVERLAY_DIM} />
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