"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { LiftLine } from "@/game/descent";
import { LIFT_SPECS, MS_PER_GAME_MINUTE, type LiftType } from "@/game/types";
import { useSpeed } from "@/ui/speed";
import { sceneMood } from "./Atmosphere";
import { cyl, merge, type Part } from "./geo";
import {
  bakeKit,
  GLOW_DAY,
  GLOW_NIGHT,
  KIT_GRIP_Y,
  KIT_ROPE_Y,
  KIT_TBAR_BAR_Y,
  LIFT_TOY_SCALE,
  METERS_TO_WORLD,
  mergePlaced,
  placeKit,
  TOY_SCALE,
  useKit,
} from "./kit";
import { LIFT_CABLE_OFFSET } from "./layout";
import { cableHeightAt, liftFrame, liftTowers } from "./liftLine";
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

/** Up and return cables between tower tops (procedural, thin). */
function cableGeometry(line: LiftLine): THREE.BufferGeometry {
  const towers = liftTowers(line);
  const { px, pz } = liftFrame(line);
  const off = LIFT_CABLE_OFFSET;
  const parts: Part[] = [];
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
  return merge(parts);
}

const S = METERS_TO_WORLD * LIFT_TOY_SCALE;

/** Kit towers and terminals placed along the line; returns body + window glow. */
function useLiftStructure(line: LiftLine) {
  const tower = bakeKit(useKit("lift-tower"));
  const bottom = bakeKit(useKit("lift-terminal-bottom"));
  const top = bakeKit(useKit("lift-terminal-top"));
  const cables = useMemo(() => cableGeometry(line), [line]);
  const built = useMemo(() => {
    const towers = liftTowers(line);
    const { yaw } = liftFrame(line);
    const body: THREE.BufferGeometry[] = [cables.clone()];
    const glow: THREE.BufferGeometry[] = [];
    towers.forEach((t, i) => {
      const last = towers.length - 1;
      if (i === 0 || i === last) {
        const kit = i === 0 ? bottom : top;
        // Uniform scale; liftTowers puts the terminal rope at LIFT_TERMINAL_H.
        const sy = (t.top - 0.03 - t.ground) / (KIT_ROPE_Y.terminal * S);
        const y = t.ground - 0.02;
        body.push(placeKit(kit.body, t.x, y, t.z, yaw, [S, S * sy, S]));
        if (kit.glow) glow.push(placeKit(kit.glow, t.x, y, t.z, yaw, [S, S * sy, S]));
      } else {
        // Stretch only vertically so each tower's sheaves meet the cable.
        const sy = (t.top - 0.03 - (t.ground - 0.03)) / KIT_ROPE_Y.tower;
        body.push(placeKit(tower.body, t.x, t.ground - 0.03, t.z, yaw, [S, sy, S]));
      }
    });
    return { body: mergePlaced(body), glow: glow.length ? mergePlaced(glow) : null };
  }, [line, cables, tower, bottom, top]);
  useEffect(() => () => cables.dispose(), [cables]);
  useEffect(
    () => () => {
      built.body.dispose();
      built.glow?.dispose();
    },
    [built],
  );
  return built;
}

/** Height from a carrier's grip down to the T-bar crossbar (world units). */
export const TBAR_DROP = (KIT_GRIP_Y["t-bar"] - KIT_TBAR_BAR_Y) * METERS_TO_WORLD * TOY_SCALE;

/** Kit carrier with its rope grip at the origin, rider facing +Z. Shared; do not dispose. */
export function useCarrierGeometry(type: LiftType): THREE.BufferGeometry {
  const name = type === "chair" ? "chair-double" : "t-bar";
  const kit = bakeKit(useKit(name));
  return useMemo(() => {
    const s = METERS_TO_WORLD * TOY_SCALE;
    return placeKit(kit.body, 0, -KIT_GRIP_Y[name] * s, 0, 0, s);
  }, [kit, name]);
}

export function Lift({
  line,
  previewInvalid,
  preview = false,
  type = "surface",
}: {
  line: LiftLine;
  previewInvalid: boolean;
  preview?: boolean;
  type?: LiftType;
}) {
  const structure = useLiftStructure(line);
  const towers = useMemo(() => liftTowers(line), [line]);
  const frame = useMemo(() => liftFrame(line), [line]);
  const carrierGeo = useCarrierGeometry(type);
  const carriers = useRef<THREE.InstancedMesh>(null);
  const phase = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const speed = useSpeed((s) => s.speed);

  useFrame((_, delta) => {
    const mesh = carriers.current;
    if (!mesh) return;
    const rideMs = LIFT_SPECS[type].rideMinutes * MS_PER_GAME_MINUTE;
    const rate = rideMs > 0 ? (1000 / rideMs) * speed : 0;
    phase.current = (phase.current + delta * rate) % 1;
    const off = LIFT_CABLE_OFFSET;
    for (let i = 0; i < CARRIERS; i++) {
      const s = (phase.current + i / CARRIERS) % 1;
      const up = s < 0.5;
      const t = up ? s * 2 : 1 - (s - 0.5) * 2;
      const side = up ? 1 : -1;
      const lx = line.bottom.x + (line.top.x - line.bottom.x) * t + frame.px * off * side;
      const lz = line.bottom.z + (line.top.z - line.bottom.z) * t + frame.pz * off * side;
      dummy.position.set(lx, cableHeightAt(t, towers) - 0.03, lz);
      dummy.rotation.set(0, frame.yaw + (up ? 0 : Math.PI), 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (glowMat.current) {
      const k = Math.max(sceneMood.night, sceneMood.dusk * 0.6);
      glowMat.current.color.setScalar(GLOW_DAY + (GLOW_NIGHT - GLOW_DAY) * k);
    }
  });

  const ghostColor = previewInvalid ? PALETTE.invalid : PALETTE.valid;

  return (
    <group>
      {structure.glow && (
        <mesh geometry={structure.glow}>
          {preview ? (
            <meshBasicMaterial color={ghostColor} transparent opacity={0.55} depthWrite={false} />
          ) : (
            <meshBasicMaterial ref={glowMat} vertexColors toneMapped={false} />
          )}
        </mesh>
      )}
      <mesh geometry={structure.body} castShadow={!preview} receiveShadow={!preview}>
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
