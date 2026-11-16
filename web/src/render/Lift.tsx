"use client";

import type { LiftAnchor } from "@/game/descent";
import { LIFT_BASE, terrainHeight } from "./guestPaths";

export function Lift({
  anchor,
  visible,
  previewInvalid,
}: {
  anchor: LiftAnchor;
  visible: boolean;
  previewInvalid: boolean;
}) {
  if (!visible) return null;

  const baseY = terrainHeight(LIFT_BASE.x, LIFT_BASE.z) + 0.05;
  const topY = terrainHeight(anchor.x, anchor.z) + 0.15;
  const poleH = Math.max(0.5, topY - baseY);

  const midX = (LIFT_BASE.x + anchor.x) / 2;
  const midZ = (LIFT_BASE.z + anchor.z) / 2;
  const span = Math.hypot(anchor.x - LIFT_BASE.x, anchor.z - LIFT_BASE.z);

  const metal = previewInvalid ? "#c45c5c" : "#5c6b7a";
  const cable = previewInvalid ? "#fca5a5" : "#94a3b8";

  const angle = Math.atan2(anchor.z - LIFT_BASE.z, anchor.x - LIFT_BASE.x);

  return (
    <group>
      <mesh position={[LIFT_BASE.x, baseY + poleH * 0.5, LIFT_BASE.z]}>
        <boxGeometry args={[0.08, poleH, 0.08]} />
        <meshStandardMaterial color={metal} roughness={0.6} />
      </mesh>
      <mesh position={[anchor.x, baseY + poleH * 0.5, anchor.z]}>
        <boxGeometry args={[0.08, poleH, 0.08]} />
        <meshStandardMaterial color={metal} roughness={0.6} />
      </mesh>
      <mesh
        position={[
          (LIFT_BASE.x + anchor.x) / 2,
          baseY + poleH + 0.05,
          (LIFT_BASE.z + anchor.z) / 2,
        ]}
        rotation={[0, -angle, 0]}
      >
        <boxGeometry args={[span, 0.04, 0.04]} />
        <meshStandardMaterial color={cable} roughness={0.4} />
      </mesh>
      <group
        position={[midX, baseY + poleH * 0.55, midZ]}
        rotation={[0, -angle, 0]}
      >
        <mesh>
          <boxGeometry args={[0.65, 0.05, 0.05]} />
          <meshStandardMaterial color={metal} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}