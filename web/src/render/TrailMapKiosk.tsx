"use client";

import { useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import type { LiftLine } from "@/game/descent";
import type { TrailRun } from "@/game/trails";
import { TERRAIN } from "@/game/terrain";
import { liftFrame } from "./liftLine";
import { bakeKit, METERS_TO_WORLD, placeKit, useKit } from "./kit";
import { OVERLAY_DIM } from "./terrainOverlay";

const MAP_FACE = "map-face";
const SCALE = METERS_TO_WORLD;

function mapTexture(trails: readonly TrailRun[]): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 500;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#f4f0e6";
  ctx.fillRect(0, 0, 800, 500);
  ctx.fillStyle = "#25374a";
  ctx.font = "bold 34px system-ui";
  ctx.fillText("Trail map", 24, 46);
  ctx.font = "bold 28px system-ui";
  let y = 92;
  for (const run of trails) {
    if (!run.open) continue;
    const color = run.difficulty === "green" ? "#197641" : run.difficulty === "blue" ? "#195dc4" : "#222233";
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(36, y - 8, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#25374a";
    ctx.fillText(run.name, 64, y);
    y += 44;
    if (y > 470) break;
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function TrailMapKiosk({
  line,
  trails,
  liftIndex,
}: {
  line: LiftLine;
  trails: readonly TrailRun[];
  liftIndex: number;
}) {
  const unloadTrails = useMemo(
    () => trails.filter((t) => t.open && t.liftIndex === liftIndex),
    [trails, liftIndex],
  );
  const texture = useMemo(() => mapTexture(unloadTrails), [unloadTrails]);
  const kit = bakeKit(useKit("trail-map-kiosk"), [MAP_FACE]);
  const placement = useMemo(() => {
    const { yaw } = liftFrame(line);
    const x = line.top.x;
    const z = line.top.z;
    return { x, z, y: TERRAIN.height(x, z), yaw: yaw + Math.PI };
  }, [line]);
  const body = useMemo(() => placeKit(kit.body, 0, 0, 0, placement.yaw, SCALE), [kit, placement.yaw]);
  const face = useMemo(
    () => (kit.split[MAP_FACE] ? placeKit(kit.split[MAP_FACE], 0, 0, 0, placement.yaw, SCALE) : null),
    [kit, placement.yaw],
  );
  if (!texture || unloadTrails.length === 0) return null;
  return (
    <group position={[placement.x, placement.y, placement.z]} name="trail map kiosk">
      <mesh geometry={body} castShadow receiveShadow>
        <meshLambertMaterial vertexColors {...OVERLAY_DIM} />
      </mesh>
      {face && (
        <mesh geometry={face} castShadow>
          <meshStandardMaterial map={texture} {...OVERLAY_DIM} />
        </mesh>
      )}
    </group>
  );
}