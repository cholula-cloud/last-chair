"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "./palette";
import { TERRAIN } from "@/game/terrain";
import type { XZ } from "@/game/terrain";
import { darken, ribbonSegmentCount } from "./paintAssist";
import { pathSampler, pathWidthSampler, smoothPath } from "./trail";

/** Share of the ribbon width, per side, that is the darker edge band. */
const EDGE_BAND = 0.09;
/** Cross-sections across the fill between the two edge bands. */
const FILL_STEPS = 4;
const RIBBON_OPACITY = 0.85;

/** Columns across the ribbon: the edge band, a hard step, the fill, a hard step, the edge band. */
const COLUMNS: { s: number; edge: boolean }[] = (() => {
  const inner = Array.from({ length: FILL_STEPS + 1 }, (_, k) => -0.5 + EDGE_BAND + (1 - 2 * EDGE_BAND) * (k / FILL_STEPS));
  return [
    { s: -0.5, edge: true },
    { s: inner[0], edge: true },
    ...inner.map((s) => ({ s, edge: false })),
    { s: inner[inner.length - 1], edge: true },
    { s: 0.5, edge: true },
  ];
})();
/** Quads between a doubled column and its twin have no width, so they are skipped. */
const SKIP_QUAD = new Set([1, COLUMNS.length - 3]);

/** Ribbon that hugs the terrain, with a darker edge band, coloured per cross-section. */
export function ribbonGeometry(
  path: readonly XZ[],
  widths: readonly number[],
  segments: number,
  color: string,
  problemSegments: readonly number[],
) {
  const across = COLUMNS.length;
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const smoothWidth = widths.length ? Math.max(...widths) / TERRAIN.horizontalFeetPerUnit : 1;
  // Routed paths are smoothed to about the trail's half-width so rows never cross.
  const centre = smoothPath(path, smoothWidth * 0.6);
  const widthAt = pathWidthSampler(path, widths);
  const lengths = [0];
  for (let i = 1; i < path.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
  }
  const total = lengths.at(-1) ?? 0;
  let span = 0;
  const fill = new THREE.Color(color);
  const edge = new THREE.Color(darken(color));
  const invalidFill = new THREE.Color(PALETTE.invalid);
  const invalidEdge = new THREE.Color(darken(PALETTE.invalid));
  const problems = new Set(problemSegments);
  const sample = pathSampler(centre);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    while (span < lengths.length - 2 && lengths[span + 1] < t * total) span++;
    const c = sample(t);
    const a = sample(Math.max(0, t - 0.01));
    const b = sample(Math.min(1, t + 0.01));
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const w = widthAt(t);
    const bad = problems.has(span);
    const nx = -dz / len;
    const nz = dx / len;
    for (const column of COLUMNS) {
      const x = c.x + nx * w * column.s;
      const z = c.z + nz * w * column.s;
      positions.push(x, TERRAIN.height(x, z) + 0.05, z);
      const shade = bad ? (column.edge ? invalidEdge : invalidFill) : column.edge ? edge : fill;
      colors.push(shade.r, shade.g, shade.b);
    }
    if (i < segments) {
      const row = i * across;
      for (let k = 0; k < across - 1; k++) {
        if (SKIP_QUAD.has(k)) continue;
        const p = row + k;
        const q = p + across;
        indices.push(p, p + 1, q, p + 1, q + 1, q);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  return geo;
}

type TrailRibbonProps = {
  path: readonly XZ[];
  widths: readonly number[];
  color: string;
  problemSegments: readonly number[];
  /** A finger is still painting: build a lighter ribbon, full detail follows on release. */
  live?: boolean;
};

/** The painted trail on the snow. The geometry is rebuilt only when the stroke or its colour changes. */
export function TrailRibbon({ path, widths, color, problemSegments, live = false }: TrailRibbonProps) {
  const geometry = useMemo(
    () => ribbonGeometry(path, widths, ribbonSegmentCount(path.length, live), color, problemSegments),
    [path, widths, color, problemSegments, live],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} renderOrder={2} frustumCulled={false}>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={RIBBON_OPACITY}
        depthWrite={false}
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={-4}
      />
    </mesh>
  );
}
