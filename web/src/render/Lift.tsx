"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { LiftAnchor } from "@/game/descent";
import type { LiftType } from "@/game/types";
import { box, cyl, merge, pitchedRoof, placeParts, type Part } from "./geo";
import { LIFT_BASE, LIFT_CABLE_OFFSET } from "./layout";
import { cableHeightAt, liftFrame, liftTowers } from "./liftLine";
import { terrainHeight } from "./terrainShape";
import { PALETTE } from "./palette";

const CARRIERS = 16;
const UP = new THREE.Vector3(0, 1, 0);

function segmentPart(
  a: THREE.Vector3,
  b: THREE.Vector3,
  r: number,
  color: THREE.ColorRepresentation,
): Part {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  return {
    geo: cyl(r, r, len, 4),
    color,
    pos: [mid.x, mid.y, mid.z],
    rot: [e.x, e.y, e.z],
  };
}

/** Small lift hut: red walls, white trim, snowy roof, lit window. */
function hutParts(x: number, y: number, z: number, yaw: number): Part[] {
  const local: Part[] = [
    { geo: box(0.46, 0.38, 0.36), color: PALETTE.barnRed, pos: [0, 0.19, 0] },
    { geo: box(0.5, 0.04, 0.4), color: PALETTE.clapboard, pos: [0, 0.02, 0] },
    { geo: box(0.16, 0.12, 0.02), color: PALETTE.window, pos: [0.08, 0.24, 0.185] },
    ...pitchedRoof({
      width: 0.36,
      length: 0.46,
      rise: 0.2,
      y: 0.38,
      roof: PALETTE.roofSlate,
      snow: PALETTE.snow,
    }),
  ];
  return placeParts(local, x, y, z, yaw);
}

/** Towers, terminals, bull wheels, cables and huts as one merged mesh. */
function liftStructure(anchor: LiftAnchor): THREE.BufferGeometry {
  const towers = liftTowers(anchor);
  const { px, pz, fx, fz, yaw } = liftFrame(anchor);
  const parts: Part[] = [];
  const steel = PALETTE.steel;
  const off = LIFT_CABLE_OFFSET;

  towers.forEach((t, i) => {
    const terminal = i === 0 || i === towers.length - 1;
    const h = t.top - t.ground;
    parts.push({
      geo: cyl(terminal ? 0.06 : 0.04, terminal ? 0.08 : 0.055, h + 0.1, 6),
      color: steel,
      pos: [t.x, t.ground + h / 2 - 0.05, t.z],
    });
    if (terminal) {
      // Bull wheel.
      parts.push({
        geo: cyl(off + 0.03, off + 0.03, 0.05, 14),
        color: PALETTE.silver,
        pos: [t.x, t.top + 0.02, t.z],
      });
      parts.push({
        geo: box(0.16, 0.12, 0.16),
        color: PALETTE.amber,
        pos: [t.x, t.top + 0.1, t.z],
        rot: [0, yaw, 0],
      });
    } else {
      // Crossarm with sheave trains.
      parts.push({
        geo: box(off * 2 + 0.16, 0.05, 0.06),
        color: steel,
        pos: [t.x, t.top, t.z],
        rot: [0, yaw, 0],
      });
      for (const s of [-1, 1]) {
        parts.push({
          geo: box(0.05, 0.05, 0.16),
          color: PALETTE.ink,
          pos: [t.x + px * off * s, t.top - 0.04, t.z + pz * off * s],
          rot: [0, yaw, 0],
        });
      }
      // Tower top gets a little snow cap.
      parts.push({
        geo: box(off * 2 + 0.12, 0.025, 0.07),
        color: PALETTE.snow,
        pos: [t.x, t.top + 0.035, t.z],
        rot: [0, yaw, 0],
      });
    }
  });

  // Up and return cables.
  for (const s of [-1, 1]) {
    for (let i = 0; i < towers.length - 1; i++) {
      const a = towers[i];
      const b = towers[i + 1];
      parts.push(
        segmentPart(
          new THREE.Vector3(a.x + px * off * s, a.top - 0.03, a.z + pz * off * s),
          new THREE.Vector3(b.x + px * off * s, b.top - 0.03, b.z + pz * off * s),
          0.012,
          PALETTE.cable,
        ),
      );
    }
  }

  // Terminal huts beside the bottom and top wheels (opposite the loading side).
  const bx = LIFT_BASE.x - px * 0.55 + fx * 0.45;
  const bz = LIFT_BASE.z - pz * 0.55 + fz * 0.45;
  parts.push(...hutParts(bx, terrainHeight(bx, bz) - 0.02, bz, yaw));
  const top = towers[towers.length - 1];
  const tx = top.x - px * 0.6 - fx * 0.15;
  const tz = top.z - pz * 0.6 - fz * 0.15;
  parts.push(...hutParts(tx, terrainHeight(tx, tz) - 0.02, tz, yaw + Math.PI));

  return merge(parts);
}

/** Carrier geometry hanging from a grip at the origin, rider facing +Z. */
export function carrierGeometry(type: LiftType): THREE.BufferGeometry {
  if (type === "chair") {
    return merge([
      { geo: box(0.05, 0.05, 0.08), color: PALETTE.ink, pos: [0, 0, 0] },
      { geo: cyl(0.012, 0.012, 0.5, 4), color: PALETTE.ink, pos: [0, -0.25, -0.04] },
      { geo: box(0.36, 0.035, 0.16), color: PALETTE.amber, pos: [0, -0.52, 0.02] },
      { geo: box(0.36, 0.16, 0.03), color: PALETTE.amber, pos: [0, -0.43, -0.07] },
      { geo: box(0.38, 0.015, 0.015), color: PALETTE.ink, pos: [0, -0.32, 0.08] },
    ]);
  }
  return merge([
    { geo: box(0.05, 0.08, 0.06), color: PALETTE.ink, pos: [0, -0.02, 0] },
    { geo: cyl(0.01, 0.01, 0.56, 4), color: PALETTE.poleGrey, pos: [0, -0.32, 0] },
    { geo: box(0.3, 0.025, 0.03), color: PALETTE.amber, pos: [0, -0.6, 0] },
  ]);
}

export function Lift({
  anchor,
  previewInvalid,
  preview = false,
  type = "surface",
}: {
  anchor: LiftAnchor;
  previewInvalid: boolean;
  preview?: boolean;
  type?: LiftType;
}) {
  const { x, z } = anchor;
  const structure = useMemo(() => liftStructure({ x, z }), [x, z]);
  const towers = useMemo(() => liftTowers({ x, z }), [x, z]);
  const frame = useMemo(() => liftFrame({ x, z }), [x, z]);
  const carrierGeo = useMemo(() => carrierGeometry(type), [type]);
  const carriers = useRef<THREE.InstancedMesh>(null);
  const phase = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => () => structure.dispose(), [structure]);
  useEffect(() => () => carrierGeo.dispose(), [carrierGeo]);

  useFrame((_, delta) => {
    const mesh = carriers.current;
    if (!mesh) return;
    phase.current = (phase.current + delta * 0.035) % 1;
    const off = LIFT_CABLE_OFFSET;
    for (let i = 0; i < CARRIERS; i++) {
      const s = (phase.current + i / CARRIERS) % 1;
      const up = s < 0.5;
      const t = up ? s * 2 : 1 - (s - 0.5) * 2;
      const side = up ? 1 : -1;
      const lx = LIFT_BASE.x + (x - LIFT_BASE.x) * t + frame.px * off * side;
      const lz = LIFT_BASE.z + (z - LIFT_BASE.z) * t + frame.pz * off * side;
      dummy.position.set(lx, cableHeightAt(t, towers) - 0.04, lz);
      dummy.rotation.set(0, frame.yaw + (up ? 0 : Math.PI), 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const ghostColor = previewInvalid ? PALETTE.invalid : PALETTE.valid;

  return (
    <group>
      <mesh geometry={structure} castShadow={!preview} receiveShadow={!preview}>
        {preview ? (
          <meshBasicMaterial
            color={ghostColor}
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        ) : (
          <meshLambertMaterial vertexColors />
        )}
      </mesh>
      <instancedMesh
        ref={carriers}
        args={[carrierGeo, undefined, CARRIERS]}
        castShadow={!preview}
        frustumCulled={false}
      >
        {preview ? (
          <meshBasicMaterial
            color={ghostColor}
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        ) : (
          <meshLambertMaterial vertexColors />
        )}
      </instancedMesh>
    </group>
  );
}
