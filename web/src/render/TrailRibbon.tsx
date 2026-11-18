"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { LiftLine } from "@/game/descent";
import { PALETTE } from "./palette";
import { TERRAIN } from "@/game/terrain";
import { pathSampler, pathWidthSampler, smoothPath, trailPoint } from "./trail";
import type { XZ } from "@/game/terrain";

const PREVIEW_WIDTH = 5.7;
const ACROSS = 6;

/** Ribbon that hugs the terrain. */
function ribbonGeometry(
  line: LiftLine,
  width: number,
  segments: number,
  path?: readonly XZ[],
  widths?: readonly number[],
  preview?: { color: string; problemSegments: readonly number[] },
) {
  const across = ACROSS;
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  // Routed paths are smoothed to about the trail's half-width so rows never cross.
  const smoothWidth = widths?.length ? Math.max(...widths) / TERRAIN.horizontalFeetPerUnit : width;
  const centre = path ? smoothPath(path, smoothWidth * 0.6) : null;
  const widthAt = path && widths?.length ? pathWidthSampler(path, widths) : null;
  const lengths = [0];
  if (path) {
    for (let i = 1; i < path.length; i++) {
      lengths.push(lengths[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
    }
  }
  const total = lengths.at(-1) ?? 0;
  let span = 0;
  const normalColor = new THREE.Color(preview?.color);
  const invalidColor = new THREE.Color(PALETTE.invalid);
  const problems = new Set(preview?.problemSegments);
  const sample = centre ? pathSampler(centre) : (t: number) => trailPoint(t, line);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    while (span < lengths.length - 2 && lengths[span + 1] < t * total) span++;
    const c = sample(t);
    const a = sample(Math.max(0, t - 0.01));
    const b = sample(Math.min(1, t + 0.01));
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    // Narrower at the very top and where it runs into the base area.
    const w = widthAt?.(t) ?? width * (0.75 + 0.25 * Math.sin(Math.min(1, t * 1.15) * Math.PI));
    const color = problems.has(span) ? invalidColor : normalColor;
    const nx = -dz / len;
    const nz = dx / len;
    for (let k = 0; k <= across; k++) {
      const s = k / across - 0.5;
      const x = c.x + nx * w * s;
      const z = c.z + nz * w * s;
      positions.push(x, TERRAIN.height(x, z) + 0.05, z);
      if (preview) colors.push(color.r, color.g, color.b);
    }
    if (i < segments) {
      const row = i * (across + 1);
      for (let k = 0; k < across; k++) {
        const p = row + k;
        const q = p + across + 1;
        indices.push(p, p + 1, q, p + 1, q + 1, q);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  if (preview) geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

type TrailRibbonProps = {
  line: LiftLine;
  path?: readonly XZ[];
  widths?: readonly number[];
  valid: boolean;
  color?: string;
  problemSegments?: readonly number[];
};

export function TrailRibbon({ line, path, widths, valid, color, problemSegments }: TrailRibbonProps) {
  const geometry = useMemo(
    () => ribbonGeometry(line, PREVIEW_WIDTH, 40, path, widths,
      color ? { color, problemSegments: problemSegments ?? [] } : undefined),
    [line, path, widths, color, problemSegments],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} renderOrder={2}>
      <meshBasicMaterial
        color={color ? "#fff" : valid ? PALETTE.valid : PALETTE.invalid}
        vertexColors={!!color}
        transparent
        opacity={0.5}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-4}
      />
    </mesh>
  );
}
