"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  LIFT_PREVIEW_SLOTS,
  checkDescentValid,
  type LiftAnchor,
} from "@/game/descent";
import { useGameStore } from "@/game/store";
import type { LiftType } from "@/game/types";
import { Atmosphere } from "./Atmosphere";
import { followedGuestPosition, Guests } from "./Guests";
import { Lift } from "./Lift";
import { Village } from "./Lodge";
import { SnowGuns } from "./SnowGuns";
import { Road, Terrain } from "./Terrain";
import { TrailRibbon } from "./TrailRibbon";
import { Trees } from "./Trees";

/** Default framing: elevated 3/4 view of the whole hill, per aspect ratio. */
const VIEW_TARGET = new THREE.Vector3(0.7, 1.2, 0.5);
function defaultView(aspect: number) {
  const portrait = aspect < 0.9;
  const fov = portrait ? 52 : 38;
  const dist = portrait ? 19 : 14;
  const azimuth = -0.42;
  const elevation = portrait ? 0.56 : 0.44;
  const offset = new THREE.Vector3(
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(azimuth) * Math.cos(elevation),
  ).multiplyScalar(dist);
  const target = VIEW_TARGET.clone();
  return { fov, position: target.clone().add(offset), target };
}

const TARGET_MIN = new THREE.Vector3(-5, 0, -5);
const TARGET_MAX = new THREE.Vector3(6.5, 5, 5);

function CameraRig({
  followId,
  liftAnchor,
  liftType,
}: {
  followId: string | null;
  liftAnchor: LiftAnchor;
  liftType: LiftType;
}) {
  const guests = useGameStore((s) => s.guests);
  const controls = useThree((s) => s.controls as OrbitControlsImpl | undefined);
  const get = useThree((s) => s.get);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const portrait = aspect < 0.9;
  const goal = useRef(new THREE.Vector3());
  const returning = useRef(false);

  useEffect(() => {
    if (!controls) return;
    const v = defaultView(portrait ? 0.5 : 1.8);
    const camera = get().camera as THREE.PerspectiveCamera;
    camera.fov = v.fov;
    camera.position.copy(v.position);
    camera.updateProjectionMatrix();
    controls.target.copy(v.target);
    controls.update();
  }, [controls, get, portrait]);

  useEffect(() => {
    if (!followId) returning.current = true;
  }, [followId]);

  useFrame(() => {
    if (!controls) return;
    const pos = followedGuestPosition(guests, followId, liftAnchor, liftType);
    if (pos) {
      goal.current.set(pos.x, pos.y + 0.35, pos.z);
      controls.target.lerp(goal.current, 0.12);
    } else if (returning.current) {
      const home = defaultView(portrait ? 0.5 : 1.8).target;
      controls.target.lerp(home, 0.08);
      if (controls.target.distanceTo(home) < 0.02) returning.current = false;
    }
    controls.target.clamp(TARGET_MIN, TARGET_MAX);
    controls.update();
  });

  return null;
}

export function MountainScene() {
  const guests = useGameStore((s) => s.guests);
  const followId = useGameStore((s) => s.followId);
  const snowQuality = useGameStore((s) => s.snowQuality);
  const snowDepth = useGameStore((s) => s.snowDepth);
  const lifts = useGameStore((s) => s.lifts);
  const buildMode = useGameStore((s) => s.buildMode);
  const selectedSlotIndex = useGameStore((s) => s.selectedSlotIndex);
  const selectedLiftType = useGameStore((s) => s.selectedLiftType);
  const buildings = useGameStore((s) => s.buildings);
  const gunsVisible = useGameStore((s) => s.gunsVisible);
  const groomVisible = useGameStore((s) => s.groomVisible);
  const weather = useGameStore((s) => s.weather);
  const phase = useGameStore((s) => s.phase);
  const clockMin = useGameStore((s) => s.clockMin);

  const confirmedLifts = lifts.filter((l) => l.confirmed);
  const primaryAnchor: LiftAnchor =
    confirmedLifts[0]?.anchor ??
    LIFT_PREVIEW_SLOTS[0] ?? { x: -1.2, z: 0.2 };
  const primaryType: LiftType = confirmedLifts[0]?.type ?? "surface";
  const previewSlot =
    LIFT_PREVIEW_SLOTS[selectedSlotIndex] ?? LIFT_PREVIEW_SLOTS[0];
  const previewValid = previewSlot ? checkDescentValid(previewSlot) : false;
  const clearings: LiftAnchor[] = [
    ...confirmedLifts.map((l) => l.anchor),
    ...(confirmedLifts.length === 0 ? [primaryAnchor] : []),
    ...(buildMode && previewSlot && previewValid ? [previewSlot] : []),
  ];

  useFrame((_, delta) => {
    useGameStore.getState().tick(delta * 1000);
  });

  const terrainSnow = Math.min(1, snowQuality * 0.75 + snowDepth * 0.25);

  return (
    <>
      <Atmosphere
        night={phase === "night"}
        clockMin={clockMin}
        weather={weather}
      />
      <Terrain snowQuality={terrainSnow} snowDepth={snowDepth} />
      <Road />
      <Village buildings={buildings} />
      {(gunsVisible || buildings.includes("snow_guns")) && (
        <SnowGuns active={gunsVisible} />
      )}
      <Trees anchors={clearings} />

      {confirmedLifts.map((lift, i) => (
        <group key={`lift-${i}-${lift.type}-${lift.anchor.x}-${lift.anchor.z}`}>
          <TrailRibbon
            anchor={lift.anchor}
            buildMode={false}
            previewValid
            liftConfirmed
            groomed={groomVisible}
          />
          <Lift anchor={lift.anchor} visible previewInvalid={false} type={lift.type} />
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
            preview
            previewInvalid={!previewValid}
            type={selectedLiftType}
          />
        </>
      )}

      <Guests
        guests={guests}
        followId={followId}
        liftAnchor={primaryAnchor}
        liftType={primaryType}
      />
      <CameraRig followId={followId} liftAnchor={primaryAnchor} liftType={primaryType} />
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableDamping
        dampingFactor={0.12}
        minDistance={5}
        maxDistance={34}
        minPolarAngle={0.3}
        maxPolarAngle={1.22}
        minAzimuthAngle={-1.15}
        maxAzimuthAngle={1.15}
      />
    </>
  );
}
