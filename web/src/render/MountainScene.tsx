"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { checkDescentValid } from "@/game/descent";
import { useGameStore } from "@/game/store";
import { followedGuestPosition, Guests } from "./Guests";
import { Lift } from "./Lift";
import { Lodge } from "./Lodge";
import { Terrain } from "./Terrain";
import { TrailRibbon } from "./TrailRibbon";
import { Trees } from "./Trees";

function FollowCamera({ followId }: { followId: string | null }) {
  const guests = useGameStore((s) => s.guests);
  const liftAnchor = useGameStore((s) => s.liftAnchor);
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

export function MountainScene() {
  const guests = useGameStore((s) => s.guests);
  const followId = useGameStore((s) => s.followId);
  const snowQuality = useGameStore((s) => s.snowQuality);
  const liftAnchor = useGameStore((s) => s.liftAnchor);
  const buildMode = useGameStore((s) => s.buildMode);
  const liftConfirmed = useGameStore((s) => s.liftConfirmed);
  const showLift = liftConfirmed || buildMode;
  const previewValid = checkDescentValid(liftAnchor);

  useFrame((_, delta) => {
    useGameStore.getState().tick(delta * 1000);
  });

  const defaultTarget: [number, number, number] = followId
    ? [0, 1, 1]
    : [0.5, 0.4, 1.8];

  return (
    <>
      <color attach="background" args={["#0b1628"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 10, 5]} intensity={1.15} castShadow />
      <Terrain snowQuality={snowQuality} />
      <Lodge />
      <Trees liftAnchor={liftAnchor} />
      <TrailRibbon
        anchor={liftAnchor}
        buildMode={buildMode}
        previewValid={previewValid}
        liftConfirmed={liftConfirmed}
      />
      <Lift
        anchor={liftAnchor}
        visible={showLift}
        previewInvalid={buildMode && !previewValid}
      />
      <Guests guests={guests} followId={followId} liftAnchor={liftAnchor} />
      <FollowCamera followId={followId} />
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