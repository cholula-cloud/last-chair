"use client";

import { Html, Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import {
  liftUnloadAt,
  openTrailRuns,
  TRAIL_LAYER_COLOR,
  trailMidpoint,
} from "@/game/trailsOverlay";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";

/** Centerlines and name labels for the Trails map layer (row O5). */
export function TrailsMapOverlay() {
  const state = useGameStore();
  const trails = useMemo(() => openTrailRuns(state), [state]);
  const liftTops = useMemo(() => {
    const tops = new Map<number, { x: number; z: number; names: string[] }>();
    trails.forEach((t) => {
      const top = liftUnloadAt(state, t.liftIndex);
      const row = tops.get(t.liftIndex) ?? { ...top, names: [] };
      row.names.push(t.name);
      tops.set(t.liftIndex, row);
    });
    return [...tops.entries()];
  }, [state, trails]);

  return (
    <>
      {trails.map((trail, i) => {
        const points = trail.path.map((p) => {
          const y = TERRAIN.height(p.x, p.z) + 0.12;
          return new THREE.Vector3(p.x, y, p.z);
        });
        return (
          <group key={`trail-layer-${i}-${trail.name}`}>
            <Line points={points} color={TRAIL_LAYER_COLOR[trail.difficulty]} lineWidth={3} />
            <Html
              position={[
                trailMidpoint(trail).x,
                TERRAIN.height(trailMidpoint(trail).x, trailMidpoint(trail).z) + 0.35,
                trailMidpoint(trail).z,
              ]}
              center
              distanceFactor={14}
              className="pointer-events-none select-none"
            >
              <span className="whitespace-nowrap rounded bg-white/90 px-1.5 py-0.5 text-[0.65rem] font-extrabold text-ink shadow">
                {trail.name}
              </span>
            </Html>
          </group>
        );
      })}
      {liftTops.map(([liftIndex, top]) => (
        <Html
          key={`lift-map-${liftIndex}`}
          position={[top.x, TERRAIN.height(top.x, top.z) + 0.55, top.z]}
          center
          distanceFactor={12}
          className="pointer-events-none max-w-[10rem] select-none"
        >
          <div className="rounded border-2 border-ink bg-snow-1/95 px-2 py-1 text-[0.62rem] font-bold leading-snug text-ink shadow">
            <p className="font-extrabold">Trail map</p>
            <ul>
              {top.names.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        </Html>
      ))}
    </>
  );
}