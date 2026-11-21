"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { TERRAIN } from "@/game/terrain";
import { MARKS } from "@/game/mapLayers";
import { useGameStore } from "@/game/store";
import { weatherForDay, isWindHeld } from "@/game/weather";
import type { TrailRun } from "@/game/trails";
import { bakeKit, METERS_TO_WORLD, placeKit, useKit } from "./kit";
import { OVERLAY_DIM } from "./terrainOverlay";

const SIGN_SCALE = METERS_TO_WORLD;
const SIGN_FACE = "sign-face";

function signTexture(name: string, difficulty: TrailRun["difficulty"], glyph: string): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#faf8ed";
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = "#25374a";
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, 500, 180);
  ctx.fillStyle = difficulty === "green" ? "#197641" : difficulty === "blue" ? "#195dc4" : "#222233";
  ctx.beginPath();
  if (difficulty === "green") ctx.arc(64, 96, 32, 0, 2 * Math.PI);
  else if (difficulty === "blue") ctx.rect(34, 64, 60, 64);
  else {
    ctx.moveTo(64, 48);
    ctx.lineTo(100, 96);
    ctx.lineTo(64, 144);
    ctx.lineTo(28, 96);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = "#25374a";
  ctx.font = "bold 40px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 118, 96, 290);
  if (glyph) {
    ctx.font = "bold 54px sans-serif";
    ctx.fillText(glyph, 430, 96, 70);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function TrailSign({ run, index }: { run: TrailRun; lane?: number; index: number }) {
  const glyph = useGameStore((state) => {
    const lift = state.lifts[run.liftIndex];
    if (lift && isWindHeld(lift.type, weatherForDay(state).wind, state.clockMin, state.talentsOwned)) {
      return MARKS.hold.glyph;
    }
    return "";
  });
  const texture = useMemo(() => signTexture(run.name, run.difficulty, glyph), [run.name, run.difficulty, glyph]);
  useEffect(() => () => texture?.dispose(), [texture]);

  const kit = bakeKit(useKit("trail-sign"), [SIGN_FACE]);
  const bodyGeo = useMemo(() => kit.body, [kit]);
  const faceGeo = useMemo(() => kit.split[SIGN_FACE], [kit]);

  const placement = useMemo(() => {
    const start = run.path[0];
    if (!start) return null;
    const next = run.path.find((point) => Math.hypot(point.x - start.x, point.z - start.z) > 0.7);
    if (!next) return null;
    const length = Math.hypot(next.x - start.x, next.z - start.z);
    const dx = (next.x - start.x) / length;
    const dz = (next.z - start.z) / length;
    const yaw = Math.atan2(dx, dz);
    const x = start.x + dx * 0.9;
    const z = start.z + dz * 0.9;
    return { x, z, y: TERRAIN.height(x, z), yaw };
  }, [run.path]);

  const placedBody = useMemo(
    () => (placement ? placeKit(bodyGeo, 0, 0, 0, placement.yaw, SIGN_SCALE) : null),
    [bodyGeo, placement],
  );
  const placedFace = useMemo(
    () => (placement && faceGeo ? placeKit(faceGeo, 0, 0, 0, placement.yaw, SIGN_SCALE) : null),
    [faceGeo, placement],
  );

  if (!texture || !placement || !placedBody || !placedFace) return null;

  return (
    <group position={[placement.x, placement.y, placement.z]} name={`${run.name} trail sign`} userData={{ asset: { kind: "trail", index } }}>
      <mesh geometry={placedBody} castShadow receiveShadow>
        <meshLambertMaterial vertexColors {...OVERLAY_DIM} />
      </mesh>
      <mesh geometry={placedFace} castShadow>
        <meshStandardMaterial map={texture} {...OVERLAY_DIM} />
      </mesh>
    </group>
  );
}