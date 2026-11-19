"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Guest } from "@/game/types";
import type { LodgeTier } from "@/game/base";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { merge, type Part } from "./geo";
import { SITE } from "./layout";
import type { StallSlot } from "./parking";
import { buildParkingSurface } from "./parkingSurface";
import { PALETTE } from "./palette";
import { useStallMap } from "./useStallMap";
import { OVERLAY_DIM } from "./terrainOverlay";

const CAR_COLORS = ["#2f7de1", "#a8382b", "#e8e4dc", "#3f6b4a", "#5c4a3a", "#8b4513"] as const;

function carGeo(kind: 0 | 1 | 2): THREE.BufferGeometry {
  const scale = kind === 0 ? 1 : kind === 1 ? 1.08 : 0.92;
  const body: Part[] = [
    { geo: new THREE.BoxGeometry(0.36 * scale, 0.1, 0.18 * scale), color: "#888", pos: [0, 0.08, 0] },
    { geo: new THREE.BoxGeometry(0.2 * scale, 0.08, 0.16 * scale), color: "#cfd8e3", pos: [-0.02, 0.17, 0] },
    { geo: new THREE.BoxGeometry(0.21 * scale, 0.025, 0.17 * scale), color: PALETTE.snow, pos: [-0.02, 0.22, 0] },
  ];
  return merge(body);
}

function idHash(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

type CarSpot = { x: number; z: number; yaw: number; color: string; kind: 0 | 1 | 2 };

function spotsFromGuests(guests: Guest[], map: Map<string, StallSlot>): CarSpot[] {
  const out: CarSpot[] = [];
  for (const g of guests) {
    if (g.state === "pending" || g.state === "gone") continue;
    const slot = map.get(g.id);
    if (!slot) continue;
    const h = idHash(g.id);
    out.push({
      x: slot.x,
      z: slot.z,
      yaw: slot.kind === "shoulder" ? Math.PI / 2 : 0,
      color: CAR_COLORS[h % CAR_COLORS.length],
      kind: (h % 3) as 0 | 1 | 2,
    });
  }
  return out;
}

function GravelLot({ tier }: { tier: LodgeTier }) {
  const geometry = useMemo(() => buildParkingSurface(SITE, tier), [tier]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshLambertMaterial vertexColors {...OVERLAY_DIM} />
    </mesh>
  );
}

function CarInstances({ kind, list }: { kind: 0 | 1 | 2; list: CarSpot[] }) {
  const geo = useMemo(() => carGeo(kind), [kind]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const subset = useMemo(() => list.filter((c) => c.kind === kind), [list, kind]);
  const max = Math.max(1, subset.length);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    for (let i = 0; i < subset.length; i++) {
      const c = subset[i];
      dummy.position.set(c.x, TERRAIN.height(c.x, c.z) + 0.02, c.z);
      dummy.rotation.set(0, c.yaw, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      tint.set(c.color);
      mesh.setColorAt(i, tint);
    }
    mesh.count = subset.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [subset]);

  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <instancedMesh ref={ref} args={[geo, undefined, max]} castShadow receiveShadow>
      <meshLambertMaterial vertexColors {...OVERLAY_DIM} />
    </instancedMesh>
  );
}

/** Gravel lot and guest cars (visual only; arrivals are not capped). */
export function ArrivalArea({ guests, dayIndex }: { guests: Guest[]; dayIndex: number }) {
  const tier = useGameStore((s) => s.lodgeTier);
  const map = useStallMap(guests, dayIndex);
  const cars = useMemo(() => spotsFromGuests(guests, map), [guests, map]);

  return (
    <group>
      <GravelLot tier={tier} />
      <CarInstances kind={0} list={cars} />
      <CarInstances kind={1} list={cars} />
      <CarInstances kind={2} list={cars} />
    </group>
  );
}
