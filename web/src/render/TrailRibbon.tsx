"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { LiftAnchor } from "@/game/descent";
import { PALETTE } from "./palette";
import { terrainHeight } from "./terrainShape";
import { trailPoint } from "./trail";

const TRAIL_WIDTH = 0.78;
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

/** Procedural corduroy: stripes along the fall line, soft banked edges. */
function corduroyTexture(crisp: boolean): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const w = 128;
  const h = 64;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const img = ctx.createImageData(w, h);
  const stripes = 7;
  for (let x = 0; x < w; x++) {
    const u = x / (w - 1);
    const edge = Math.min(u, 1 - u);
    const alpha = Math.min(1, edge / 0.07);
    // Inner groomed band: soft-edged corduroy stripes running downhill.
    const inner = Math.max(0, Math.min(1, (u - 0.12) / 0.76));
    const wave = 0.5 + 0.5 * Math.cos(inner * stripes * Math.PI * 2);
    const depth = crisp ? 16 : 9;
    // Banked, slightly shaded lip of ungroomed snow along each edge.
    const lip = Math.max(0, 1 - Math.abs(edge - 0.07) / 0.06);
    for (let y = 0; y < h; y++) {
      const grain = (((x * 7 + y * 13) % 11) / 11) * 4;
      const v = 255 - wave * depth - grain - lip * 28;
      const i = (y * w + x) * 4;
      img.data[i] = Math.max(0, v - 5 * (wave + lip));
      img.data[i + 1] = Math.max(0, v - 6 * (wave + lip));
      img.data[i + 2] = 255;
      img.data[i + 3] = alpha * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
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
        map={map}
        color={PALETTE.white}
        emissive={PALETTE.white}
        emissiveIntensity={groomed ? 0.08 : 0.04}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-3}
      />
    </mesh>
  );
}
