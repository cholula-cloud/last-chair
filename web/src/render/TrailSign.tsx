"use client";

import { Billboard } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { TERRAIN } from "@/game/terrain";
import { MARKS, segmentCondition } from "@/game/mapLayers";
import { useGameStore } from "@/game/store";
import { weatherForDay, isWindHeld } from "@/game/weather";
import type { TrailRun } from "@/game/trails";
import { OVERLAY_DIM } from "./terrainOverlay";

const BOARD_WIDTH = 2.55;
const BOARD_HEIGHT = 0.72;

function signTexture(name: string, difficulty: TrailRun["difficulty"], glyph: string): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 144;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#2f4053";
  ctx.roundRect(0, 0, 512, 144, 14);
  ctx.fill();
  ctx.fillStyle = "#faf8ed";
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 128, 10);
  ctx.fill();
  ctx.fillStyle = difficulty === "green" ? "#197641" : difficulty === "blue" ? "#195dc4" : "#222233";
  ctx.beginPath();
  if (difficulty === "green") ctx.arc(58, 72, 27, 0, 2 * Math.PI);
  else if (difficulty === "blue") ctx.rect(32, 46, 52, 52);
  else {
    ctx.moveTo(58, 38);
    ctx.lineTo(92, 72);
    ctx.lineTo(58, 106);
    ctx.lineTo(24, 72);
    ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle = "#25374a";
  ctx.font = "bold 43px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 108, 72, 295);
  ctx.font = "bold 62px sans-serif";
  ctx.fillText(glyph, 420, 72, 75);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function TrailSign({ run, lane, index }: { run: TrailRun; lane: number; index: number }) {
  const glyph = useGameStore(state => {
    const lift = state.lifts[run.liftIndex];
    if (lift && isWindHeld(lift.type, weatherForDay(state).wind, state.clockMin, state.talentsOwned)) return MARKS.hold.glyph;
    if (!run.snow.length) return "";
    const i = run.snow.reduce((worst, segment, index) =>
      Math.min(segment.quality, segment.coverage) < Math.min(run.snow[worst].quality, run.snow[worst].coverage) ? index : worst, 0);
    return MARKS[segmentCondition(run.snow[i], !!run.groomed?.[i], state.weather, state.clockMin,
      run.elevations[i], state.dayStats.runsByTrail[index] ?? 0)].glyph;
  });
  const texture = useMemo(() => signTexture(run.name, run.difficulty, glyph), [run.name, run.difficulty, glyph]);
  useEffect(() => () => texture?.dispose(), [texture]);
  const start = run.path[0];
  if (!start || !texture) return null;
  const next = run.path.find((point) => Math.hypot(point.x - start.x, point.z - start.z) > 0.7);
  if (!next) return null;
  const length = Math.hypot(next.x - start.x, next.z - start.z);
  const dx = (next.x - start.x) / length;
  const dz = (next.z - start.z) / length;
  const side = (lane % 2 === 0 ? 1 : -1) * (0.96 + lane * 0.28);
  const x = start.x + dx * (0.8 + 0.5 * lane) + dz * side;
  const z = start.z + dz * (0.8 + 0.5 * lane) - dx * side;
  return (
    <group position={[x, TERRAIN.height(x, z), z]} name={`${run.name} trail sign`} userData={{ asset: { kind: "trail", index } }}>
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[0.11, 1.04, 0.11]} />
        <meshStandardMaterial color="#72523a" {...OVERLAY_DIM} />
      </mesh>
      <Billboard position={[0, 1.08, 0]}>
        <mesh>
          <planeGeometry args={[BOARD_WIDTH, BOARD_HEIGHT]} />
          <meshBasicMaterial map={texture} transparent alphaTest={0.15} toneMapped={false} {...OVERLAY_DIM} />
        </mesh>
      </Billboard>
    </group>
  );
}
