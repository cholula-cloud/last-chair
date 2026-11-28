"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/game/store";
import { liftLineOf } from "@/game/rules";
import { guestWorldPosition } from "./guestPlacement";
import { pathSampler } from "./trail";
import { useReducedMotion } from "./useReducedMotion";
import { PALETTE } from "./palette";

const MAX_PUFFS = 120;
const MAX_TORCHES = 16;

type Puff = {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
};

const dummy = new THREE.Object3D();

/**
 * Carving snow spray behind skiing guests + Last Saturday torchlight descent.
 * Two single-draw-call InstancedMeshes; respects lowDetail and reduced motion.
 */
export function SkierVfx({ lowDetail = false }: { lowDetail?: boolean }) {
  const reduced = useReducedMotion();
  const puffRef = useRef<THREE.InstancedMesh>(null);
  const torchRef = useRef<THREE.InstancedMesh>(null);
  const spawnTimer = useRef(0);
  const nextSlot = useRef(0);
  const puffsRef = useRef<Puff[]>(
    Array.from({ length: MAX_PUFFS }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      age: 0,
      life: 0.45,
    })),
  );

  const puffGeo = useMemo(() => new THREE.IcosahedronGeometry(0.055, 0), []);
  const torchGeo = useMemo(() => new THREE.SphereGeometry(0.05, 6, 4), []);

  useEffect(
    () => () => {
      puffGeo.dispose();
      torchGeo.dispose();
    },
    [puffGeo, torchGeo],
  );

  useFrame(({ clock }, delta) => {
    const state = useGameStore.getState();
    const dt = Math.min(0.05, delta);

    const puffs = puffsRef.current;
    // 1. Carving snow spray puffs
    const puffMesh = puffRef.current;
    if (puffMesh) {
      if (lowDetail || reduced.current || state.phase !== "day") {
        puffMesh.visible = false;
      } else {
        if (!state.paused) {
          spawnTimer.current += dt;
          if (spawnTimer.current >= 0.09) {
            spawnTimer.current = 0;
            const skiing = state.guests;
            let spawned = 0;
            for (let i = 0; i < skiing.length && spawned < 3; i++) {
              const g = skiing[i];
              if (g.state !== "ski") continue;
              // Stagger across guests deterministically via clock + index.
              if ((Math.floor(clock.elapsedTime * 11) + i) % 3 !== 0) continue;
              const lift = state.lifts[g.liftIndex ?? 0] ?? state.lifts[0];
              if (!lift) continue;
              const trailPath = g.trailIndex != null ? state.trails[g.trailIndex]?.path : undefined;
              const p = guestWorldPosition(i, "ski", g.progress, liftLineOf(lift), {
                path: trailPath,
                skiLeg: g.skiRoute?.legs[g.skiRoute.current],
              });
              const slot = puffs[nextSlot.current % MAX_PUFFS];
              nextSlot.current = (nextSlot.current + 1) % MAX_PUFFS;
              slot.active = true;
              slot.x = p.x - Math.sin(p.yaw) * 0.08;
              slot.y = p.y + 0.04;
              slot.z = p.z - Math.cos(p.yaw) * 0.08;
              const side = (i % 2 === 0 ? 1 : -1) * 0.22;
              slot.vx = Math.cos(p.yaw) * side;
              slot.vy = 0.28 + (i % 3) * 0.06;
              slot.vz = -Math.sin(p.yaw) * side;
              slot.age = 0;
              slot.life = 0.42;
              spawned++;
            }
          }
          for (let i = 0; i < MAX_PUFFS; i++) {
            const p = puffs[i];
            if (!p.active) continue;
            p.age += dt;
            if (p.age >= p.life) {
              p.active = false;
              continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.vy -= 0.7 * dt;
          }
        }

        let visibleCount = 0;
        for (let i = 0; i < MAX_PUFFS; i++) {
          const p = puffs[i];
          if (!p.active) continue;
          const t = p.age / p.life;
          const s = Math.sin(t * Math.PI) * (0.75 + t * 0.65);
          dummy.position.set(p.x, p.y, p.z);
          dummy.rotation.set(t * 2, t * 3, 0);
          dummy.scale.setScalar(Math.max(0.01, s));
          dummy.updateMatrix();
          puffMesh.setMatrixAt(visibleCount++, dummy.matrix);
        }
        puffMesh.count = visibleCount;
        puffMesh.visible = visibleCount > 0;
        if (visibleCount > 0) puffMesh.instanceMatrix.needsUpdate = true;
      }
    }

    // 2. Last Saturday torchlight descent ribbon
    const torchMesh = torchRef.current;
    if (torchMesh) {
      const lastSat =
        state.phase === "day" &&
        state.surprise?.kind === "last_saturday" &&
        state.clockMin >= 15 * 60 + 15;
      const openTrails = state.trails.filter((t) => t.open && t.path.length >= 2);
      if (!lastSat || openTrails.length === 0) {
        torchMesh.visible = false;
      } else {
        torchMesh.visible = true;
        const primary = pathSampler(openTrails[0].path);
        const phaseShift = reduced.current ? 0.35 : (clock.elapsedTime * 0.08) % 1;
        for (let i = 0; i < MAX_TORCHES; i++) {
          const u = (i / MAX_TORCHES + phaseShift) % 1;
          const pt = primary(u);
          const sway = Math.sin(u * Math.PI * 10) * 0.14;
          dummy.position.set(pt.x + sway, pt.y + 0.18, pt.z);
          const pulse = reduced.current ? 1 : 0.85 + 0.25 * Math.sin(clock.elapsedTime * 6 + i);
          dummy.scale.setScalar(pulse);
          dummy.updateMatrix();
          torchMesh.setMatrixAt(i, dummy.matrix);
        }
        torchMesh.count = MAX_TORCHES;
        torchMesh.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      <instancedMesh ref={puffRef} args={[puffGeo, undefined, MAX_PUFFS]} frustumCulled={false} visible={false} renderOrder={4}>
        <meshBasicMaterial color={PALETTE.snow} transparent opacity={0.62} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={torchRef} args={[torchGeo, undefined, MAX_TORCHES]} frustumCulled={false} visible={false}>
        <meshBasicMaterial color="#ffb347" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
