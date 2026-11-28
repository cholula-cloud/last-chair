"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { REFERENCE_TOPS } from "@/game/descent";
import { openingStep } from "@/game/rules";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { usePlacementDraft } from "@/ui/placementDraft";
import { PALETTE } from "./palette";
import { useReducedMotion } from "./useReducedMotion";

/**
 * Subtle pulsing 3D 1985 survey guide shown on the hill during Day 1 opening
 * so cold-start players immediately see where the historic lift & starter run sit.
 */
export function OpeningGuide() {
  const step = useGameStore(openingStep);
  const placementActive = usePlacementDraft((s) => s.active);
  const reduced = useReducedMotion();
  const ringRef = useRef<THREE.Mesh>(null);
  const lineMatRef = useRef<THREE.LineBasicMaterial>(null);

  const top = REFERENCE_TOPS[0] ?? { x: -1.1, z: 0.2 };
  const bottom = TERRAIN.base;

  const lineGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segs = 28;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = bottom.x + (top.x - bottom.x) * t;
      const z = bottom.z + (top.z - bottom.z) * t;
      pts.push(new THREE.Vector3(x, TERRAIN.height(x, z) + 0.08, z));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return g;
  }, [bottom.x, bottom.z, top.x, top.z]);

  useEffect(() => () => lineGeo.dispose(), [lineGeo]);

  useFrame(({ clock }) => {
    if (!step || placementActive) return;
    const pulse = reduced.current ? 0.75 : 0.45 + 0.45 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 3.2));
    if (lineMatRef.current) lineMatRef.current.opacity = pulse;
    if (ringRef.current) {
      const s = reduced.current ? 1 : 0.92 + 0.14 * Math.sin(clock.elapsedTime * 3.2);
      ringRef.current.scale.set(s, s, 1);
    }
  });

  if (!step || placementActive) return null;
  const target = step === "lift" ? top : bottom;
  const ty = TERRAIN.height(target.x, target.z) + 0.06;

  return (
    <group name="opening-guide">
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial ref={lineMatRef} color={PALETTE.yellow} transparent opacity={0.75} />
      </lineSegments>
      <mesh ref={ringRef} position={[target.x, ty, target.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
        <ringGeometry args={[0.28, 0.42, 24]} />
        <meshBasicMaterial color={PALETTE.yellow} transparent opacity={0.85} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
