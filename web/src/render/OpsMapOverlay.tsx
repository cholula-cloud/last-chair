"use client";

import { Html } from "@react-three/drei";
import { useMemo } from "react";
import { formatMoney } from "@/game/format";
import {
  crowdMarkers,
  demandPin,
  revenueMarkers,
  type OpsLayer,
} from "@/game/opsOverlay";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";

const CROWD_COLOR = { light: "#8fd4a0", busy: "#f0c15a", packed: "#d45a5a" } as const;
const REV_COLOR = (n: number) => (n >= 40 ? "#55b07a" : n > 0 ? "#c9b46a" : "#b8b3a8");

/** Rings and labels for crowds, revenue, and guest-demand overlays (row O4). */
export function OpsMapOverlay({ layer }: { layer: OpsLayer }) {
  const state = useGameStore();
  const crowds = useMemo(() => (layer === "crowds" ? crowdMarkers(state) : []), [layer, state]);
  const revenue = useMemo(() => (layer === "revenue" ? revenueMarkers(state) : []), [layer, state]);
  const demand = useMemo(() => (layer === "demand" ? demandPin(state) : null), [layer, state]);

  return (
  <>
      {crowds.map((c) => (
        <group key={`crowd-${c.liftIndex}`} position={[c.at.x, TERRAIN.height(c.at.x, c.at.z) + 0.2, c.at.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.35 + c.queue * 0.08, 0.55 + c.queue * 0.08, 32]} />
            <meshBasicMaterial color={CROWD_COLOR[c.band]} transparent opacity={0.75} depthWrite={false} />
          </mesh>
          <Html center distanceFactor={12} className="pointer-events-none select-none">
            <span className="rounded bg-ink/80 px-1.5 py-0.5 text-[0.65rem] font-extrabold text-white">
              {c.queue} · {c.waitMin.toFixed(1)}m
            </span>
          </Html>
        </group>
      ))}
      {revenue.map((r) => (
        <group key={r.assetId + r.at.x} position={[r.at.x, TERRAIN.height(r.at.x, r.at.z) + 0.45, r.at.z]}>
          <mesh>
            <sphereGeometry args={[0.22, 12, 12]} />
            <meshBasicMaterial color={REV_COLOR(r.today)} depthWrite={false} />
          </mesh>
          <Html center distanceFactor={14} className="pointer-events-none select-none">
            <span className="rounded bg-gold px-1.5 py-0.5 text-[0.65rem] font-extrabold text-ink">
              {formatMoney(r.today)}
            </span>
          </Html>
        </group>
      ))}
      {demand && (
        <group position={[demand.at.x, TERRAIN.height(demand.at.x, demand.at.z) + 0.6, demand.at.z]}>
          <mesh>
            <coneGeometry args={[0.28, 0.65, 4]} />
            <meshBasicMaterial color="#7a6ed4" depthWrite={false} />
          </mesh>
          <Html center distanceFactor={10} className="pointer-events-none max-w-[11rem] select-none text-center">
            <span className="rounded bg-[#7a6ed4] px-2 py-1 text-[0.68rem] font-extrabold leading-snug text-white">
              {demand.line}
            </span>
          </Html>
        </group>
      )}
  </>
  );
}