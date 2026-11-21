"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { PlacedAsset } from "@/game/base";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { JACKETS } from "./palette";
import { bakeKit, METERS_TO_WORLD, placeKit, useKit } from "./kit";
import { OVERLAY_DIM } from "./terrainOverlay";

const SCALE = METERS_TO_WORLD;
const LANE_STEP = 0.85 * SCALE;

function downhillYaw(x: number, z: number): number {
  const step = 0.3;
  let bestDx = 0;
  let bestDz = step;
  let bestDrop = TERRAIN.height(x, z) - TERRAIN.height(x, z + step);
  for (const [dx, dz] of [
    [step, 0],
    [-step, 0],
    [0, -step],
  ] as const) {
    const drop = TERRAIN.height(x, z) - TERRAIN.height(x + dx, z + dz);
    if (drop > bestDrop) {
      bestDrop = drop;
      bestDx = dx;
      bestDz = dz;
    }
  }
  return Math.atan2(bestDx, bestDz);
}

function TubingSite({ asset }: { asset: PlacedAsset }) {
  const laneKit = bakeKit(useKit("tubing-lane"));
  const carpetKit = bakeKit(useKit("magic-carpet"));
  const tubeKit = bakeKit(useKit("tube"), ["tube"]);

  const yaw = useMemo(() => downhillYaw(asset.at.x, asset.at.z), [asset.at]);
  const baseY = TERRAIN.height(asset.at.x, asset.at.z);

  const lanes = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      const along = (i + 0.6) * LANE_STEP;
      const x = asset.at.x - Math.sin(yaw) * along;
      const z = asset.at.z - Math.cos(yaw) * along;
      const y = TERRAIN.height(x, z);
      geos.push(placeKit(laneKit.body, x, y, z, yaw, SCALE));
    }
    return geos;
  }, [asset.at, laneKit, yaw]);

  const carpet = useMemo(() => {
    const uphill = yaw + Math.PI;
    const x = asset.at.x - Math.sin(uphill) * LANE_STEP * 0.5;
    const z = asset.at.z - Math.cos(uphill) * LANE_STEP * 0.5;
    const y = TERRAIN.height(x, z);
    return placeKit(carpetKit.body, x, y, z, uphill, SCALE);
  }, [asset.at, carpetKit, yaw]);

  const tubeRef = useRef<THREE.InstancedMesh>(null);
  const tubeGeo = tubeKit.split.tube ?? tubeKit.body;
  const tubeCount = 5;

  useEffect(() => {
    const mesh = tubeRef.current;
    if (!mesh) return;
    const d = new THREE.Object3D();
    for (let i = 0; i < tubeCount; i++) {
      const side = (i - 2) * 0.22;
      d.position.set(
        asset.at.x + Math.cos(yaw) * side + Math.sin(yaw) * 0.35,
        baseY + 0.04,
        asset.at.z - Math.cos(yaw) * side + Math.cos(yaw) * 0.35,
      );
      d.rotation.set(0, yaw, 0);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      mesh.setColorAt(i, new THREE.Color(JACKETS[i % JACKETS.length]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [asset.at, baseY, yaw]);

  useEffect(
    () => () => {
      lanes.forEach((g) => g.dispose());
      carpet.dispose();
    },
    [lanes, carpet],
  );

  return (
    <group name="tubing hill dressing">
      {lanes.map((geo, i) => (
        <mesh key={i} geometry={geo} castShadow receiveShadow>
          <meshLambertMaterial vertexColors {...OVERLAY_DIM} />
        </mesh>
      ))}
      <mesh geometry={carpet} castShadow receiveShadow>
        <meshLambertMaterial vertexColors {...OVERLAY_DIM} />
      </mesh>
      {tubeGeo && (
        <instancedMesh ref={tubeRef} args={[tubeGeo, undefined, tubeCount]} frustumCulled={false}>
          <meshLambertMaterial vertexColors {...OVERLAY_DIM} />
        </instancedMesh>
      )}
    </group>
  );
}

export function TubingHillDressing() {
  const assets = useGameStore((s) => s.assets);
  const hills = useMemo(() => assets.filter((a) => a.id === "tubing_hill"), [assets]);
  if (hills.length === 0) return null;
  return (
    <>
      {hills.map((asset, i) => (
        <TubingSite key={`tubing-dress-${i}`} asset={asset} />
      ))}
    </>
  );
}