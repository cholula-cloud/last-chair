"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import type { PlacedAsset } from "@/game/base";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { bakeKit, METERS_TO_WORLD, placeKit, useKit } from "./kit";
import { OVERLAY_DIM } from "./terrainOverlay";

const FACE = "arrow-face";
const SCALE = METERS_TO_WORLD;

function arrowTexture(label: string): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#2e4a62";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#faf8ed";
  ctx.font = "bold 36px system-ui";
  ctx.textBaseline = "middle";
  ctx.fillText(label.slice(0, 28), 24, 64, 460);
  ctx.beginPath();
  ctx.moveTo(8, 64);
  ctx.lineTo(28, 44);
  ctx.lineTo(28, 84);
  ctx.closePath();
  ctx.fill();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function DirectionSign({ asset, index }: { asset: PlacedAsset; index: number }) {
  const label = asset.name?.trim() || "Base area";
  const texture = useMemo(() => arrowTexture(label), [label]);
  useEffect(() => () => texture?.dispose(), [texture]);

  const kit = bakeKit(useKit("direction-sign"), [FACE]);
  const y = TERRAIN.height(asset.at.x, asset.at.z);
  const body = useMemo(
    () => placeKit(kit.body, 0, 0, 0, 0, SCALE),
    [kit],
  );
  const face = useMemo(
    () => (kit.split[FACE] ? placeKit(kit.split[FACE], 0, 0, 0, 0, SCALE) : null),
    [kit],
  );

  if (!texture || !face) return null;

  return (
    <group
      position={[asset.at.x, y, asset.at.z]}
      rotation-y={0}
      name="direction sign"
      userData={{ asset: { kind: "venue", index } }}
    >
      <mesh geometry={body} castShadow receiveShadow>
        <meshLambertMaterial vertexColors {...OVERLAY_DIM} />
      </mesh>
      <mesh geometry={face} castShadow>
        <meshStandardMaterial map={texture} {...OVERLAY_DIM} />
      </mesh>
    </group>
  );
}

export function DirectionSigns() {
  const assets = useGameStore((s) => s.assets);
  const signs = useMemo(
    () => assets.map((asset, index) => ({ asset, index })).filter((row) => row.asset.id === "direction_sign"),
    [assets],
  );
  if (signs.length === 0) return null;
  return (
    <>
      {signs.map(({ asset, index }) => (
        <DirectionSign key={`dir-${index}`} asset={asset} index={index} />
      ))}
    </>
  );
}