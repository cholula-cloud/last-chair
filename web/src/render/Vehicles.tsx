"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Guest } from "@/game/types";
import { lodgeParkingLots, type LodgeTier } from "@/game/base";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { merge, type Part } from "./geo";
import { SITE } from "./layout";
import { expandedStallCenters, type StallSlot } from "./parking";
import { PALETTE } from "./palette";
import { useStallMap } from "./useStallMap";

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
  const geometry = useMemo(() => {
    const lots = lodgeParkingLots(tier, SITE);
    const first = lots[0];
    const last = lots[lots.length - 1];
    const left = first.center.x - first.size.w / 2;
    const right = last.center.x + last.size.w / 2;
    const x = (left + right) / 2;
    const z = first.center.z;
    const parts: Part[] = [{
      geo: new THREE.PlaneGeometry(right - left + 0.55, first.size.d + 1.15),
      pos: [x, TERRAIN.height(x, z) + 0.022, z],
      rot: [-Math.PI / 2, 0, 0],
      color: PALETTE.earth,
    }];
    for (const { x, z } of expandedStallCenters(SITE, tier)) {
      parts.push({
        geo: new THREE.PlaneGeometry(0.22, 0.025),
        pos: [x, TERRAIN.height(x, z) + 0.03, z + (z > SITE.arrival.center.z ? 0.32 : -0.32)],
        rot: [-Math.PI / 2, 0, 0],
        color: PALETTE.snowOld,
      });
    }
    return merge(parts);
  }, [tier]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshLambertMaterial vertexColors />
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
      <meshLambertMaterial vertexColors />
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
