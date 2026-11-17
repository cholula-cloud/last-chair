"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { LiftAnchor } from "@/game/descent";
import { sceneMood } from "./Atmosphere";
import { smoothstep } from "./math";
import { PALETTE } from "./palette";
import { terrainHeight } from "./terrainShape";
import { trailPoint } from "./trail";

const TRAIL_WIDTH = 0.86;
const PREVIEW_WIDTH = TRAIL_WIDTH + 0.08;

/** Ribbon that hugs the terrain; u runs across the trail, v along it. */
function ribbonGeometry(anchor: LiftAnchor, width: number, segments: number) {
  const across = 6;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let travelled = 0;
  let prev = trailPoint(0, anchor);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const c = trailPoint(t, anchor);
    const a = trailPoint(Math.max(0, t - 0.01), anchor);
    const b = trailPoint(Math.min(1, t + 0.01), anchor);
    travelled += Math.hypot(c.x - prev.x, c.z - prev.z);
    prev = c;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    // Narrower at the very top and where it runs into the base area.
    const w = width * (0.75 + 0.25 * Math.sin(Math.min(1, t * 1.15) * Math.PI));
    const nx = -dz / len;
    const nz = dx / len;
    for (let k = 0; k <= across; k++) {
      const s = k / across - 0.5;
      const x = c.x + nx * w * s;
      const z = c.z + nz * w * s;
      positions.push(x, terrainHeight(x, z) + 0.05, z);
      uvs.push(k / across, travelled / 0.9);
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
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Procedural corduroy: fine, crisp grooves running down the fall line,
 * white-on-white (neutral, no blue tint), alpha feathered into the snow at
 * both edges. `crisp` = freshly groomed: deeper grooves.
 */
function corduroyTexture(crisp: boolean): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const w = 256;
  const h = 32;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const img = ctx.createImageData(w, h);
  const stripes = 16;
  const depth = crisp ? 30 : 14;
  for (let x = 0; x < w; x++) {
    const u = (x + 0.5) / w;
    const edge = Math.min(u, 1 - u);
    // Feather: transparent at the rim, fully opaque 14% in.
    const alpha = smoothstep(0.0, 0.14, edge);
    const f = (u * stripes) % 1;
    // Thin groove at each stripe boundary, flat bright ridge between.
    const groove = 1 - smoothstep(0.04, 0.2, Math.min(f, 1 - f));
    // Grooves fade out toward the feathered edge.
    const g = groove * smoothstep(0.05, 0.16, edge);
    for (let y = 0; y < h; y++) {
      const grain = ((x * 7 + y * 13) % 11) / 11;
      const v = 255 - g * depth - grain * 2.5;
      const i = (y * w + x) * 4;
      img.data[i] = v - g * 2;
      img.data[i + 1] = v - g * 1;
      img.data[i + 2] = v;
      img.data[i + 3] = alpha * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

type TrailRibbonProps = { anchor: LiftAnchor } & (
  | { kind: "built"; groomed: boolean }
  | { kind: "preview"; valid: boolean }
);

/** The corduroy ribbon of a built run, or the green / red ghost while placing a lift. */
export function TrailRibbon(props: TrailRibbonProps) {
  const { x, z } = props.anchor;
  const built = props.kind === "built";
  const groomed = props.kind === "built" && props.groomed;

  const geometry = useMemo(
    () =>
      built
        ? ribbonGeometry({ x, z }, TRAIL_WIDTH, 56)
        : ribbonGeometry({ x, z }, PREVIEW_WIDTH, 40),
    [x, z, built],
  );
  const map = useMemo(() => (built ? corduroyTexture(groomed) : null), [built, groomed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => map?.dispose(), [map]);
  const mat = useRef<THREE.MeshLambertMaterial>(null);
  // Self-lit so the groomed corridor reads brighter than the snow by day; fades at night.
  const glow = groomed ? 0.42 : 0.3;
  useFrame(() => {
    if (mat.current) mat.current.emissiveIntensity = glow * (1 - 0.85 * sceneMood.night);
  });

  if (props.kind === "preview") {
    return (
      <mesh geometry={geometry} renderOrder={2}>
        <meshBasicMaterial
          color={props.valid ? PALETTE.valid : PALETTE.invalid}
          transparent
          opacity={0.5}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-4}
        />
      </mesh>
    );
  }
  return (
    <mesh geometry={geometry} receiveShadow renderOrder={1}>
      <meshLambertMaterial
        ref={mat}
        map={map}
        color={PALETTE.white}
        emissive={PALETTE.white}
        emissiveIntensity={glow}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-3}
      />
    </mesh>
  );
}
