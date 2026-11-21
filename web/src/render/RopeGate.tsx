"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import type { TrailRun } from "@/game/trails";
import { TERRAIN } from "@/game/terrain";
import { bakeKit, METERS_TO_WORLD, placeKit, useKit } from "./kit";
import { OVERLAY_DIM } from "./terrainOverlay";

const FACE = "closed-face";
const SCALE = METERS_TO_WORLD;

function closedTexture(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#faf8ed";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = "#b91c1c";
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 244, 116);
  ctx.fillStyle = "#b91c1c";
  ctx.font = "bold 42px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CLOSED", 128, 64);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function entrancePlacement(path: readonly { x: number; z: number }[]) {
  const start = path[0];
  if (!start) return null;
  const next = path.find((point) => Math.hypot(point.x - start.x, point.z - start.z) > 0.7);
  if (!next) return null;
  const length = Math.hypot(next.x - start.x, next.z - start.z);
  const dx = (next.x - start.x) / length;
  const dz = (next.z - start.z) / length;
  const yaw = Math.atan2(dx, dz);
  const x = start.x + dx * 0.75;
  const z = start.z + dz * 0.75;
  return { x, z, y: TERRAIN.height(x, z), yaw };
}

export function RopeGate({ run, index }: { run: TrailRun; index: number }) {
  const texture = useMemo(() => closedTexture(), []);
  useEffect(() => () => texture?.dispose(), [texture]);
  const kit = bakeKit(useKit("rope-gate"), [FACE]);
  const placement = useMemo(() => entrancePlacement(run.path), [run.path]);
  const body = useMemo(
    () => (placement ? placeKit(kit.body, 0, 0, 0, placement.yaw, SCALE) : null),
    [kit, placement],
  );
  const face = useMemo(
    () => (placement && kit.split[FACE] ? placeKit(kit.split[FACE], 0, 0, 0, placement.yaw, SCALE) : null),
    [kit, placement],
  );

  if (!texture || !placement || !body || !face) return null;

  return (
    <group position={[placement.x, placement.y, placement.z]} name={`${run.name} rope gate`} userData={{ asset: { kind: "trail", index } }}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshLambertMaterial vertexColors {...OVERLAY_DIM} />
      </mesh>
      <mesh geometry={face} castShadow>
        <meshStandardMaterial map={texture} {...OVERLAY_DIM} />
      </mesh>
    </group>
  );
}