"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { activeLeasePolygon } from "@/game/parcels";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { usePlacementDraft } from "@/ui/placementDraft";
import { leaseDim } from "./leaseDim";
import { PALETTE } from "./palette";

const DASH = 1.1;
const GAP = 0.75;
/** Distance between the samples that drape a dash over the ground. */
const STEP = 0.4;
const HALF_WIDTH = 0.11;
const LIFT = 0.1;

/** Quads for a dashed line draped over the terrain along the lease polygon. */
export function leaseDashGeometry(
  polygon: readonly { x: number; z: number }[],
  height: (x: number, z: number) => number,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  let travelled = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length === 0) continue;
    const dx = (b.x - a.x) / length;
    const dz = (b.z - a.z) / length;
    const point = (d: number, side: number) => {
      const x = a.x + dx * d - dz * side * HALF_WIDTH;
      const z = a.z + dz * d + dx * side * HALF_WIDTH;
      return [x, height(x, z) + LIFT, z];
    };
    // Dashes are laid by distance around the whole outline, so the pattern runs unbroken past corners.
    const period = DASH + GAP;
    for (let k = Math.floor(travelled / period); k * period < travelled + length; k++) {
      const from = Math.max(k * period, travelled) - travelled;
      const to = Math.min(k * period + DASH, travelled + length) - travelled;
      if (to - from < 1e-6) continue;
      const pieces = Math.max(1, Math.ceil((to - from) / STEP));
      for (let j = 0; j <= pieces; j++) {
        const at = from + ((to - from) * j) / pieces;
        const base = pos.length / 3;
        pos.push(...point(at, -1), ...point(at, 1));
        if (j > 0) idx.push(base - 2, base - 1, base, base - 1, base + 1, base);
      }
    }
    travelled += length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * The survey line around the lease, and the dimming of the land outside it. Both show
 * only while a build tool is open. The fade writes a uniform each frame and never sets state.
 */
export function LeaseBoundary() {
  const mountainId = useGameStore((s) => s.mountainId);
  const northRidgeParcel = useGameStore((s) => s.northRidgeParcel);
  const orchardParcel = useGameStore((s) => s.orchardParcel);
  const polygon = useMemo(
    () => activeLeasePolygon(TERRAIN, { mountainId, northRidgeParcel, orchardParcel }),
    [mountainId, northRidgeParcel, orchardParcel],
  );
  const geometry = useMemo(() => (polygon ? leaseDashGeometry(polygon, TERRAIN.height) : null), [polygon]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const goal = usePlacementDraft.getState().active ? 1 : 0;
    leaseDim.value += (goal - leaseDim.value) * Math.min(1, delta * 8);
    if (Math.abs(goal - leaseDim.value) < 0.005) leaseDim.value = goal;
    if (mesh.current) mesh.current.visible = leaseDim.value > 0.01;
  });

  if (!geometry) return null;
  return (
    <mesh ref={mesh} geometry={geometry} renderOrder={2} visible={false}>
      <meshBasicMaterial
        color={PALETTE.yellow}
        transparent
        opacity={0.95}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-3}
        polygonOffsetUnits={-3}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
