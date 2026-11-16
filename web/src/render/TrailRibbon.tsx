"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { LiftAnchor } from "@/game/descent";
import { trailPoint } from "./guestPaths";

function ribbonGeometry(anchor: LiftAnchor, width: number, segments: number) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const center = trailPoint(t, anchor);
    const next = trailPoint(Math.min(1, t + 1 / segments), anchor);
    const dx = next.x - center.x;
    const dz = next.z - center.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * (width / 2);
    const nz = (dx / len) * (width / 2);
    positions.push(
      center.x + nx,
      center.y + 0.03,
      center.z + nz,
      center.x - nx,
      center.y + 0.03,
      center.z - nz,
    );
    if (i < segments) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function TrailRibbon({
  anchor,
  buildMode,
  previewValid,
  liftConfirmed,
}: {
  anchor: LiftAnchor;
  buildMode: boolean;
  previewValid: boolean;
  liftConfirmed: boolean;
}) {
  const { x, z } = anchor;
  const groomGeo = useMemo(
    () => ribbonGeometry({ x, z }, 0.22, 28),
    [x, z],
  );
  const previewGeo = useMemo(
    () => ribbonGeometry({ x, z }, 0.28, 28),
    [x, z],
  );

  return (
    <group>
      {liftConfirmed && (
        <mesh geometry={groomGeo} rotation={[0, 0, 0]}>
          <meshStandardMaterial
            color="#eef2f8"
            roughness={0.35}
            metalness={0.05}
            transparent
            opacity={0.65}
          />
        </mesh>
      )}
      {buildMode && (
        <mesh geometry={previewGeo}>
          <meshBasicMaterial
            color={previewValid ? "#4ade80" : "#f87171"}
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}