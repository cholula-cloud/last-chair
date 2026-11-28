"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/game/store";
import { liftLineOf } from "@/game/rules";
import { TERRAIN } from "@/game/terrain";
import { box, cyl, merge, placeParts, type Part } from "./geo";
import { PALETTE } from "./palette";
import { sceneMood } from "./Atmosphere";
import { smoothstep } from "./math";

type PoleSpot = { x: number; y: number; z: number; yaw: number };

const dummy = new THREE.Object3D();

function radialPoolTex(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, "rgba(255, 184, 77, 0.72)");
  g.addColorStop(0.55, "rgba(255, 168, 64, 0.25)");
  g.addColorStop(1, "rgba(255, 168, 64, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Holyoke sodium-vapor floodlight towers on Mount Tom when nightLights is built.
 * Ramps on from 15:30 through 18:30 twilight night sessions and stays lit at night.
 */
export function RangeLights() {
  const mountainId = useGameStore((s) => s.mountainId);
  const nightLights = useGameStore((s) => s.nightLights);
  const lifts = useGameStore((s) => s.lifts);
  const trails = useGameStore((s) => s.trails);

  const spots = useMemo<PoleSpot[]>(() => {
    if (mountainId !== "mount_tom" || !nightLights) return [];
    const out: PoleSpot[] = [];
    const primaryLift = lifts.find((l) => l.confirmed);
    if (primaryLift) {
      const line = liftLineOf(primaryLift);
      const dx = line.top.x - line.bottom.x;
      const dz = line.top.z - line.bottom.z;
      const len = Math.hypot(dx, dz) || 1;
      const px = -dz / len;
      const pz = dx / len;
      for (const t of [0.2, 0.52, 0.84]) {
        const x = line.bottom.x + dx * t + px * 0.42;
        const z = line.bottom.z + dz * t + pz * 0.42;
        out.push({ x, y: TERRAIN.height(x, z), z, yaw: Math.atan2(-px, -pz) });
      }
    }
    const primaryTrail = trails.find((t) => t.open && t.path.length >= 2);
    if (primaryTrail) {
      const pts = primaryTrail.path;
      for (const frac of [0.22, 0.55, 0.82]) {
        const idx = Math.min(pts.length - 1, Math.floor(frac * (pts.length - 1)));
        const pt = pts[idx];
        const next = pts[Math.min(pts.length - 1, idx + 1)] ?? pt;
        const prev = pts[Math.max(0, idx - 1)] ?? pt;
        const tx = next.x - prev.x;
        const tz = next.z - prev.z;
        const len = Math.hypot(tx, tz) || 1;
        const nx = -tz / len;
        const nz = tx / len;
        const x = pt.x + nx * 0.42;
        const z = pt.z + nz * 0.42;
        out.push({ x, y: TERRAIN.height(x, z), z, yaw: Math.atan2(-nx, -nz) });
      }
    }
    return out;
  }, [mountainId, nightLights, lifts, trails]);

  const poleGeo = useMemo(() => {
    if (!spots.length) return null;
    const parts: Part[] = [];
    for (const s of spots) {
      parts.push(
        ...placeParts(
          [
            { geo: cyl(0.025, 0.036, 0.72, 6), color: PALETTE.bark, pos: [0, 0.36, 0] },
            { geo: box(0.2, 0.035, 0.035), color: PALETTE.steel, pos: [0, 0.71, 0.02] },
            { geo: box(0.08, 0.05, 0.06), color: PALETTE.shutter, pos: [-0.06, 0.71, 0.05] },
            { geo: box(0.08, 0.05, 0.06), color: PALETTE.shutter, pos: [0.06, 0.71, 0.05] },
          ],
          s.x,
          s.y - 0.02,
          s.z,
          s.yaw,
        ),
      );
    }
    return merge(parts);
  }, [spots]);

  const lampGeo = useMemo(() => box(0.18, 0.042, 0.025), []);
  const coneGeo = useMemo(() => new THREE.CylinderGeometry(0.09, 1.05, 2.2, 12, 1, true), []);
  const poolTex = useMemo(() => radialPoolTex(), []);

  useEffect(
    () => () => {
      poleGeo?.dispose();
      lampGeo.dispose();
      coneGeo.dispose();
      poolTex?.dispose();
    },
    [poleGeo, lampGeo, coneGeo, poolTex],
  );

  const lampRef = useRef<THREE.InstancedMesh>(null);
  const coneRef = useRef<THREE.InstancedMesh>(null);
  const poolRef = useRef<THREE.InstancedMesh>(null);
  const lampMat = useRef<THREE.MeshBasicMaterial>(null);
  const coneMat = useRef<THREE.MeshBasicMaterial>(null);
  const poolMat = useRef<THREE.MeshBasicMaterial>(null);

  useLayoutEffect(() => {
    if (!spots.length) return;
    spots.forEach((s, i) => {
      if (lampRef.current) {
        dummy.position.set(s.x + Math.sin(s.yaw) * 0.08, s.y + 0.69, s.z + Math.cos(s.yaw) * 0.08);
        dummy.rotation.set(0, s.yaw, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        lampRef.current.setMatrixAt(i, dummy.matrix);
      }
      if (coneRef.current) {
        dummy.position.set(s.x + Math.sin(s.yaw) * 0.42, s.y + 0.16, s.z + Math.cos(s.yaw) * 0.42);
        dummy.rotation.set(0.32, s.yaw, 0, "YXZ");
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        coneRef.current.setMatrixAt(i, dummy.matrix);
      }
      if (poolRef.current) {
        const px = s.x + Math.sin(s.yaw) * 0.62;
        const pz = s.z + Math.cos(s.yaw) * 0.62;
        dummy.position.set(px, TERRAIN.height(px, pz) + 0.04, pz);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.set(2.1, 2.1, 1);
        dummy.updateMatrix();
        poolRef.current.setMatrixAt(i, dummy.matrix);
      }
    });
    if (lampRef.current) lampRef.current.instanceMatrix.needsUpdate = true;
    if (coneRef.current) coneRef.current.instanceMatrix.needsUpdate = true;
    if (poolRef.current) poolRef.current.instanceMatrix.needsUpdate = true;
  }, [spots]);

  useFrame(() => {
    if (!spots.length) return;
    const { clockMin, nightSessionOn, phase } = useGameStore.getState();
    const twilight = nightSessionOn ? smoothstep(15 * 60 + 30, 16 * 60 + 25, clockMin) : 0;
    const nightBoost = phase === "night" && nightSessionOn ? 0.85 : sceneMood.night * 0.45;
    const on = Math.max(twilight, nightBoost);

    if (lampMat.current) {
      lampMat.current.color.set("#ffbe5c").multiplyScalar(0.35 + on * 1.15);
    }
    if (coneMat.current) {
      coneMat.current.opacity = on * 0.18;
    }
    if (poolMat.current) {
      poolMat.current.opacity = on * 0.58;
    }
    if (coneRef.current) coneRef.current.visible = on > 0.02;
    if (poolRef.current) poolRef.current.visible = on > 0.02;
  });

  if (!spots.length || !poleGeo) return null;

  return (
    <group name="range-lights">
      <mesh geometry={poleGeo} castShadow>
        <meshStandardMaterial vertexColors roughness={0.78} metalness={0.12} />
      </mesh>
      <instancedMesh ref={lampRef} args={[lampGeo, undefined, spots.length]}>
        <meshBasicMaterial ref={lampMat} color="#ffbe5c" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={coneRef} args={[coneGeo, undefined, spots.length]} renderOrder={4}>
        <meshBasicMaterial
          ref={coneMat}
          color="#ffb84d"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={poolRef} args={[undefined, undefined, spots.length]} renderOrder={3}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={poolMat}
          map={poolTex}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
