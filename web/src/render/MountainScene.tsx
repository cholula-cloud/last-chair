"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  LIFT_PREVIEW_SLOTS,
  checkDescentValid,
  type LiftAnchor,
} from "@/game/descent";
import { useGameStore } from "@/game/store";
import { followedGuestPosition, Guests } from "./Guests";
import { Lift } from "./Lift";
import { Lodge } from "./Lodge";
import { Terrain } from "./Terrain";
import { TrailRibbon } from "./TrailRibbon";
import { Trees } from "./Trees";
import { terrainHeight } from "./guestPaths";

function FollowCamera({
  followId,
  liftAnchor,
}: {
  followId: string | null;
  liftAnchor: LiftAnchor;
}) {
  const guests = useGameStore((s) => s.guests);
  const target = useRef(new THREE.Vector3(0, 0.5, 1));
  const controls = useThree(
    (s) => s.controls as OrbitControlsImpl | undefined,
  );

  useFrame(() => {
    if (!controls) return;
    const pos = followedGuestPosition(guests, followId, liftAnchor);
    if (pos) {
      target.current.set(pos.x, pos.y + 0.35, pos.z);
      controls.target.lerp(target.current, 0.12);
      controls.update();
    }
  });

  return null;
}

function VillageExtras({
  buildings,
  gunsVisible,
}: {
  buildings: string[];
  gunsVisible: boolean;
}) {
  const cafeY = terrainHeight(3.4, 2.0);
  const shopY = terrainHeight(3.2, 3.1);

  return (
    <>
      {buildings.includes("cafe") && (
        <group position={[3.4, cafeY, 2.0]}>
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[0.85, 0.65, 0.75]} />
            <meshStandardMaterial
              color="#b45309"
              roughness={0.8}
              emissive="#fbbf24"
              emissiveIntensity={0.15}
            />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <coneGeometry args={[0.65, 0.4, 4]} />
            <meshStandardMaterial color="#7c2d12" roughness={0.9} />
          </mesh>
        </group>
      )}

      {buildings.includes("shop") && (
        <group position={[3.2, shopY, 3.1]}>
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[0.75, 0.55, 0.65]} />
            <meshStandardMaterial color="#334155" roughness={0.85} />
          </mesh>
        </group>
      )}

      {(gunsVisible || buildings.includes("snow_guns")) && (
        <>
          <SnowGun x={-2.2} z={0.2} active={gunsVisible} />
          <SnowGun x={1.6} z={-0.4} active={gunsVisible} />
        </>
      )}
    </>
  );
}

function SnowGun({
  x,
  z,
  active,
}: {
  x: number;
  z: number;
  active: boolean;
}) {
  const y = terrainHeight(x, z);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 1.1, 8]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial
          color="#e2e8f0"
          emissive="#93c5fd"
          emissiveIntensity={active ? 0.55 : 0.15}
        />
      </mesh>
    </group>
  );
}

function GroomBands({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <>
      <mesh position={[0.8, 0.06, 1.2]} rotation={[-Math.PI / 2.15, 0, 0.35]}>
        <planeGeometry args={[0.45, 3.2]} />
        <meshBasicMaterial color="#dbeafe" transparent opacity={0.28} />
      </mesh>
      <mesh position={[1.4, 0.06, 1.0]} rotation={[-Math.PI / 2.15, 0, 0.35]}>
        <planeGeometry args={[0.45, 2.8]} />
        <meshBasicMaterial color="#bfdbfe" transparent opacity={0.24} />
      </mesh>
    </>
  );
}

export function MountainScene() {
  const guests = useGameStore((s) => s.guests);
  const followId = useGameStore((s) => s.followId);
  const snowQuality = useGameStore((s) => s.snowQuality);
  const snowDepth = useGameStore((s) => s.snowDepth);
  const lifts = useGameStore((s) => s.lifts);
  const buildMode = useGameStore((s) => s.buildMode);
  const selectedSlotIndex = useGameStore((s) => s.selectedSlotIndex);
  const buildings = useGameStore((s) => s.buildings);
  const gunsVisible = useGameStore((s) => s.gunsVisible);
  const groomVisible = useGameStore((s) => s.groomVisible);
  const weather = useGameStore((s) => s.weather);

  const confirmedLifts = lifts.filter((l) => l.confirmed);
  const primaryAnchor: LiftAnchor =
    confirmedLifts[0]?.anchor ??
    LIFT_PREVIEW_SLOTS[0] ?? { x: -1.2, z: 0.2 };
  const previewSlot =
    LIFT_PREVIEW_SLOTS[selectedSlotIndex] ?? LIFT_PREVIEW_SLOTS[0];
  const previewValid = previewSlot ? checkDescentValid(previewSlot) : false;
  const treeAnchor =
    buildMode && previewSlot ? previewSlot : primaryAnchor;

  useFrame((_, delta) => {
    useGameStore.getState().tick(delta * 1000);
  });

  const lightBoost = weather === "snow" ? 0.15 : weather === "thaw" ? -0.08 : 0;
  const terrainSnow = Math.min(1, snowQuality * 0.75 + snowDepth * 0.25);
  const defaultTarget: [number, number, number] = followId
    ? [0, 1, 1]
    : [0.5, 0.4, 1.8];

  return (
    <>
      <color attach="background" args={["#0b1628"]} />
      <ambientLight intensity={0.55 + lightBoost} />
      <directionalLight
        position={[6, 10, 5]}
        intensity={1.15 + lightBoost}
        castShadow
      />
      <Terrain snowQuality={terrainSnow} />
      <Lodge />
      <VillageExtras buildings={buildings} gunsVisible={gunsVisible} />
      <GroomBands visible={groomVisible} />
      <Trees liftAnchor={treeAnchor} />

      {confirmedLifts.map((lift, i) => (
        <group key={`lift-${i}-${lift.type}-${lift.anchor.x}-${lift.anchor.z}`}>
          <TrailRibbon
            anchor={lift.anchor}
            buildMode={false}
            previewValid
            liftConfirmed
          />
          <Lift
            anchor={lift.anchor}
            visible
            previewInvalid={false}
          />
        </group>
      ))}

      {buildMode && previewSlot && (
        <>
          <TrailRibbon
            anchor={previewSlot}
            buildMode
            previewValid={previewValid}
            liftConfirmed={false}
          />
          <Lift
            anchor={previewSlot}
            visible
            previewInvalid={!previewValid}
          />
        </>
      )}

      <Guests
        guests={guests}
        followId={followId}
        liftAnchor={primaryAnchor}
      />
      <FollowCamera followId={followId} liftAnchor={primaryAnchor} />
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        maxPolarAngle={Math.PI / 2.08}
        minDistance={4}
        maxDistance={18}
        target={defaultTarget}
      />
    </>
  );
}
