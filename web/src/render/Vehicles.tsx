"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { LodgeTier } from "@/game/base";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import type { Guest } from "@/game/types";
import { box, cyl, merge, type Part } from "./geo";
import { ROAD_Z, SITE } from "./layout";
import type { StallSlot } from "./parking";
import { buildFootpathSurface } from "./footpathSurface";
import { buildParkingSurface } from "./parkingSurface";
import { PALETTE } from "./palette";
import { useStallMap } from "./useStallMap";
import { OVERLAY_DIM } from "./terrainOverlay";
import { useReducedMotion } from "./useReducedMotion";

const CAR_COLORS = ["#2f7de1", "#a8382b", "#e8e4dc", "#3f6b4a", "#5c4a3a", "#8b4513"] as const;

function carGeo(kind: 0 | 1 | 2): THREE.BufferGeometry {
  if (kind === 1) {
    // Stylized New England pickup truck with cargo bed and roof skis.
    const parts: Part[] = [
      { geo: box(0.38, 0.09, 0.19), color: "#888", pos: [0, 0.075, 0] },
      { geo: box(0.15, 0.08, 0.17), color: "#cfd8e3", pos: [-0.04, 0.16, 0] },
      { geo: box(0.16, 0.025, 0.18), color: PALETTE.snow, pos: [-0.04, 0.21, 0] },
      { geo: box(0.14, 0.04, 0.15), color: PALETTE.doorWood, pos: [0.1, 0.11, 0] },
      { geo: box(0.22, 0.015, 0.025), color: PALETTE.inkDeep, pos: [-0.02, 0.23, -0.04] },
      { geo: box(0.22, 0.015, 0.025), color: PALETTE.inkDeep, pos: [-0.02, 0.23, 0.04] },
      { geo: cyl(0.032, 0.032, 0.21, 6), color: "#1c2026", pos: [-0.11, 0.035, 0], rot: [Math.PI / 2, 0, 0] },
      { geo: cyl(0.032, 0.032, 0.21, 6), color: "#1c2026", pos: [0.11, 0.035, 0], rot: [Math.PI / 2, 0, 0] },
    ];
    return merge(parts);
  }
  if (kind === 2) {
    // 1980s wood-panel station wagon with roof skis.
    const parts: Part[] = [
      { geo: box(0.37, 0.085, 0.18), color: "#888", pos: [0, 0.072, 0] },
      { geo: box(0.32, 0.038, 0.188), color: PALETTE.deckWood, pos: [0.01, 0.075, 0] },
      { geo: box(0.24, 0.075, 0.165), color: "#cfd8e3", pos: [0.02, 0.15, 0] },
      { geo: box(0.25, 0.022, 0.175), color: PALETTE.snow, pos: [0.02, 0.198, 0] },
      { geo: box(0.22, 0.014, 0.025), color: PALETTE.amber, pos: [0.02, 0.215, -0.038] },
      { geo: box(0.22, 0.014, 0.025), color: PALETTE.amber, pos: [0.02, 0.215, 0.038] },
      { geo: cyl(0.03, 0.03, 0.2, 6), color: "#1c2026", pos: [-0.11, 0.032, 0], rot: [Math.PI / 2, 0, 0] },
      { geo: cyl(0.03, 0.03, 0.2, 6), color: "#1c2026", pos: [0.11, 0.032, 0], rot: [Math.PI / 2, 0, 0] },
    ];
    return merge(parts);
  }
  // Compact sedan with snow roof & wheels.
  const body: Part[] = [
    { geo: box(0.35, 0.09, 0.18), color: "#888", pos: [0, 0.075, 0] },
    { geo: box(0.19, 0.075, 0.16), color: "#cfd8e3", pos: [-0.02, 0.155, 0] },
    { geo: box(0.2, 0.025, 0.17), color: PALETTE.snow, pos: [-0.02, 0.205, 0] },
    { geo: cyl(0.03, 0.03, 0.2, 6), color: "#1c2026", pos: [-0.1, 0.032, 0], rot: [Math.PI / 2, 0, 0] },
    { geo: cyl(0.03, 0.03, 0.2, 6), color: "#1c2026", pos: [0.1, 0.032, 0], rot: [Math.PI / 2, 0, 0] },
  ];
  return merge(body);
}

function schoolBusGeo(): THREE.BufferGeometry {
  return merge([
    { geo: box(0.68, 0.2, 0.24), color: PALETTE.yellow, pos: [0, 0.14, 0] },
    { geo: box(0.13, 0.12, 0.22), color: PALETTE.yellow, pos: [-0.39, 0.1, 0] },
    { geo: box(0.58, 0.07, 0.25), color: "#1d2a38", pos: [0.02, 0.17, 0] },
    { geo: box(0.65, 0.03, 0.24), color: PALETTE.snow, pos: [0, 0.255, 0] },
    { geo: cyl(0.05, 0.05, 0.27, 8), color: "#1c2026", pos: [-0.22, 0.05, 0], rot: [Math.PI / 2, 0, 0] },
    { geo: cyl(0.05, 0.05, 0.27, 8), color: "#1c2026", pos: [0.22, 0.05, 0], rot: [Math.PI / 2, 0, 0] },
  ]);
}

function sloaneSuvGeo(): THREE.BufferGeometry {
  return merge([
    { geo: box(0.44, 0.11, 0.21), color: "#1b2129", pos: [0, 0.09, 0] },
    { geo: box(0.28, 0.09, 0.19), color: "#222933", pos: [0.03, 0.185, 0] },
    { geo: box(0.14, 0.02, 0.22), color: "#cfd8e3", pos: [0.03, 0.185, 0] },
    { geo: cyl(0.036, 0.036, 0.23, 6), color: "#14181f", pos: [-0.13, 0.038, 0], rot: [Math.PI / 2, 0, 0] },
    { geo: cyl(0.036, 0.036, 0.23, 6), color: "#14181f", pos: [0.13, 0.038, 0], rot: [Math.PI / 2, 0, 0] },
  ]);
}

function whiterockCoachGeo(): THREE.BufferGeometry {
  return merge([
    { geo: box(0.76, 0.22, 0.25), color: "#1d4ed8", pos: [0, 0.15, 0] },
    { geo: box(0.72, 0.07, 0.256), color: "#f8fbff", pos: [0, 0.18, 0] },
    { geo: box(0.74, 0.03, 0.24), color: PALETTE.snow, pos: [0, 0.275, 0] },
    { geo: cyl(0.05, 0.05, 0.28, 8), color: "#1c2026", pos: [-0.24, 0.05, 0], rot: [Math.PI / 2, 0, 0] },
    { geo: cyl(0.05, 0.05, 0.28, 8), color: "#1c2026", pos: [0.24, 0.05, 0], rot: [Math.PI / 2, 0, 0] },
  ]);
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
    <mesh geometry={geometry} receiveShadow userData={{ asset: { kind: "parking" } }}>
      <meshStandardMaterial vertexColors roughness={0.88} metalness={0.02} {...OVERLAY_DIM} />
    </mesh>
  );
}

function LodgeFootpath() {
  const geometry = useMemo(() => buildFootpathSurface(SITE, TERRAIN), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow userData={{ asset: { kind: "footpath" } }}>
      <meshStandardMaterial vertexColors roughness={0.85} metalness={0.02} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-1} {...OVERLAY_DIM} />
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
    mesh.visible = subset.length > 0;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [subset]);

  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <instancedMesh ref={ref} args={[geo, undefined, max]} visible={subset.length > 0} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.42} metalness={0.18} {...OVERLAY_DIM} />
    </instancedMesh>
  );
}

const cruiserDummy = new THREE.Object3D();
const CRUISER_COUNT = 2;

function AmbientRoadTraffic() {
  const geo = useMemo(() => carGeo(1), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  const reduced = useReducedMotion();
  const phaseRef = useRef(0);

  useEffect(() => () => geo.dispose(), [geo]);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { phase, paused } = useGameStore.getState();
    mesh.visible = phase === "day";
    if (phase !== "day") return;
    if (!reduced.current && !paused) {
      phaseRef.current += Math.min(0.05, delta) * 1.4;
    }
    const { xFrom, xTo } = SITE.road;
    const span = xTo - xFrom;
    for (let i = 0; i < CRUISER_COUNT; i++) {
      const dir = i === 0 ? 1 : -1;
      const raw = ((phaseRef.current + i * 19) % span + span) % span;
      const x = dir > 0 ? xFrom + raw : xTo - raw;
      const z = ROAD_Z + Math.sin(x * 0.18) * 0.25 + (dir > 0 ? 0.22 : -0.22);
      const slopeZ = Math.cos(x * 0.18) * 0.18 * 0.25;
      cruiserDummy.position.set(x, TERRAIN.height(x, z) + 0.025, z);
      cruiserDummy.rotation.set(0, Math.atan2(-dir * slopeZ, dir), 0);
      cruiserDummy.scale.setScalar(1);
      cruiserDummy.updateMatrix();
      mesh.setMatrixAt(i, cruiserDummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[geo, undefined, CRUISER_COUNT]} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.42} metalness={0.18} {...OVERLAY_DIM} />
    </instancedMesh>
  );
}

/** Gravel lot, guest cars, ambient highway cars, and story arrival vehicles. */
export function ArrivalArea({ guests, dayIndex }: { guests: Guest[]; dayIndex: number }) {
  const tier = useGameStore((s) => s.lodgeTier);
  const mountainId = useGameStore((s) => s.mountainId);
  const mtShuttleDecision = useGameStore((s) => s.mtShuttleDecision);
  const schoolContract = useGameStore((s) => s.schoolContract);
  const surprise = useGameStore((s) => s.surprise);
  const map = useStallMap(guests, dayIndex);
  const cars = useMemo(() => spotsFromGuests(guests, map), [guests, map]);
  const busGeo = useMemo(() => schoolBusGeo(), []);
  const suvGeo = useMemo(() => sloaneSuvGeo(), []);
  const coachGeo = useMemo(() => whiterockCoachGeo(), []);

  useEffect(
    () => () => {
      busGeo.dispose();
      suvGeo.dispose();
      coachGeo.dispose();
    },
    [busGeo, suvGeo, coachGeo],
  );

  const showSchoolBus =
    schoolContract?.decision === "accepted" && schoolContract.day === dayIndex;
  const showSloaneSuv = surprise?.kind === "sloane_visit";
  const showWhiterockCoach = mountainId === "mount_tom" && mtShuttleDecision === "accepted";

  return (
    <group>
      <GravelLot tier={tier} />
      <LodgeFootpath />
      <CarInstances kind={0} list={cars} />
      <CarInstances kind={1} list={cars} />
      <CarInstances kind={2} list={cars} />
      <AmbientRoadTraffic />
      {showSchoolBus && (
        <mesh
          geometry={busGeo}
          position={[8.75, TERRAIN.height(8.75, 22.8) + 0.02, 22.8]}
          rotation={[0, 0.15, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial vertexColors roughness={0.44} metalness={0.14} {...OVERLAY_DIM} />
        </mesh>
      )}
      {showSloaneSuv && (
        <mesh
          geometry={suvGeo}
          position={[5.35, TERRAIN.height(5.35, 24.9) + 0.02, 24.9]}
          rotation={[0, -0.1, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial vertexColors roughness={0.32} metalness={0.28} {...OVERLAY_DIM} />
        </mesh>
      )}
      {showWhiterockCoach && (
        <mesh
          geometry={coachGeo}
          position={[11.8, TERRAIN.height(11.8, 24.45) + 0.02, 24.45]}
          rotation={[0, 0.08, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial vertexColors roughness={0.42} metalness={0.16} {...OVERLAY_DIM} />
        </mesh>
      )}
    </group>
  );
}
