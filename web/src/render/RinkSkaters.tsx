"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { PlacedAsset } from "@/game/base";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { HATS, JACKETS } from "./palette";
import { bakeKit, METERS_TO_WORLD, placeKit, useKit } from "./kit";
import { OVERLAY_DIM } from "./terrainOverlay";

const SCALE = METERS_TO_WORLD;
const OFFSETS: [number, number][] = [
  [-0.35, -0.2],
  [0.1, 0.15],
  [0.4, -0.25],
  [-0.15, 0.35],
];

function RinkSkater({ at, index }: { at: PlacedAsset["at"]; index: number }) {
  const kit = bakeKit(useKit("skater"), ["jacket", "helmet"]);
  const [ox, oz] = OFFSETS[index % OFFSETS.length];
  const x = at.x + ox;
  const z = at.z + oz;
  const y = TERRAIN.height(x, z);
  const yaw = index * 1.1;
  const matrix = useMemo(
    () => placeKit(kit.body, x, y, z, yaw, SCALE * 0.9),
    [kit, x, y, z, yaw],
  );
  const jacket = useMemo(
    () => (kit.split.jacket ? placeKit(kit.split.jacket, x, y, z, yaw, SCALE * 0.9) : null),
    [kit, x, y, z, yaw],
  );
  const helmet = useMemo(
    () => (kit.split.helmet ? placeKit(kit.split.helmet, x, y, z, yaw, SCALE * 0.9) : null),
    [kit, x, y, z, yaw],
  );

  return (
    <group name="rink skater">
      <mesh geometry={matrix} castShadow receiveShadow>
        <meshLambertMaterial vertexColors {...OVERLAY_DIM} />
      </mesh>
      {jacket && (
        <mesh geometry={jacket} castShadow>
          <meshLambertMaterial color={new THREE.Color(JACKETS[index % JACKETS.length])} {...OVERLAY_DIM} />
        </mesh>
      )}
      {helmet && (
        <mesh geometry={helmet} castShadow>
          <meshLambertMaterial color={new THREE.Color(HATS[index % HATS.length])} {...OVERLAY_DIM} />
        </mesh>
      )}
    </group>
  );
}

export function RinkSkaters() {
  const assets = useGameStore((s) => s.assets);
  const rinks = useMemo(() => assets.filter((a) => a.id === "ice_rink"), [assets]);
  if (rinks.length === 0) return null;
  return (
    <>
      {rinks.flatMap((rink, ri) =>
        OFFSETS.map((_, si) => <RinkSkater key={`rink-skater-${ri}-${si}`} at={rink.at} index={ri * 4 + si} />),
      )}
    </>
  );
}