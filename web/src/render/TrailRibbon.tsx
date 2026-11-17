"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { LiftAnchor } from "@/game/descent";
import { sceneMood } from "./Atmosphere";
import { smoothstep } from "./math";
import { PALETTE } from "./palette";
import { TERRAIN } from "@/game/terrain";
import { sampleSegments, trailPoint } from "./trail";
import type { Trail } from "@/game/snow";

const TRAIL_WIDTH = 0.86;
const PREVIEW_WIDTH = TRAIL_WIDTH + 0.08;

/** Ribbon that hugs the terrain; u runs across the trail, v along it. */
function ribbonGeometry(anchor: LiftAnchor, width: number, segments: number) {
  const across = ACROSS;
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
      positions.push(x, TERRAIN.height(x, z) + 0.05, z);
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
 * both edges. `depth` is the groove strength (0 = a plain feathered ribbon).
 */
function corduroyTexture(depth: number): THREE.CanvasTexture | null {
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

const ICE = new THREE.Color(PALETTE.snowIce);
const SNOW = new THREE.Color(PALETTE.white);
const SEGMENTS = 56;
const ACROSS = 6;

function hash(a: number, b: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Per-vertex RGBA from the trail's snow. Base: worn snow is grey ice, groomed
 * snow is white, low coverage punches patchy holes. Stripes: corduroy shows
 * only where quality is high, so a fresh groom reads crisp and a scraped
 * segment reads flat.
 */
function paintRibbon(base: THREE.BufferGeometry, stripes: THREE.BufferGeometry, trail: Trail) {
  const rows = SEGMENTS + 1;
  const cols = ACROSS + 1;
  const bc = new Float32Array(rows * cols * 4);
  const sc = new Float32Array(rows * cols * 4);
  const c = new THREE.Color();
  for (let i = 0; i < rows; i++) {
    const t = i / SEGMENTS;
    const q = sampleSegments(trail, t, "quality");
    const cover = sampleSegments(trail, t, "coverage");
    c.copy(ICE).lerp(SNOW, smoothstep(0.3, 0.75, q));
    const crisp = smoothstep(0.55, 0.8, q);
    for (let k = 0; k < cols; k++) {
      const n = hash(i * 0.5, k);
      const alpha = smoothstep(0, 0.25, cover * 1.25 - n * 0.6);
      const v = (i * cols + k) * 4;
      bc[v] = c.r;
      bc[v + 1] = c.g;
      bc[v + 2] = c.b;
      bc[v + 3] = alpha;
      sc[v] = 1;
      sc[v + 1] = 1;
      sc[v + 2] = 1;
      sc[v + 3] = alpha * crisp;
    }
  }
  base.setAttribute("color", new THREE.BufferAttribute(bc, 4));
  stripes.setAttribute("color", new THREE.BufferAttribute(sc, 4));
}

type TrailRibbonProps = { anchor: LiftAnchor } & (
  | { kind: "built"; groomed: boolean; trail: Trail }
  | { kind: "preview"; valid: boolean }
);

/** The corduroy ribbon of a built run, or the green / red ghost while placing a lift. */
export function TrailRibbon(props: TrailRibbonProps) {
  const { x, z } = props.anchor;
  const built = props.kind === "built";
  const groomed = props.kind === "built" && props.groomed;
  const trail = props.kind === "built" ? props.trail : null;

  const geometry = useMemo(
    () =>
      built
        ? ribbonGeometry({ x, z }, TRAIL_WIDTH, SEGMENTS)
        : ribbonGeometry({ x, z }, PREVIEW_WIDTH, 40),
    [x, z, built],
  );
  const stripeGeo = useMemo(() => (built ? geometry.clone() : null), [built, geometry]);
  const stripeMap = useMemo(() => (built ? corduroyTexture(groomed ? 30 : 14) : null), [built, groomed]);
  const baseMap = useMemo(() => (built ? corduroyTexture(0) : null), [built]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => stripeGeo?.dispose(), [stripeGeo]);
  useEffect(() => () => stripeMap?.dispose(), [stripeMap]);
  useEffect(() => () => baseMap?.dispose(), [baseMap]);
  // Repaints only when the snapped trail snow changes (see `snowKey`).
  useLayoutEffect(() => {
    if (trail && stripeGeo) paintRibbon(geometry, stripeGeo, trail);
  }, [geometry, stripeGeo, trail]);
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
    <group>
      <mesh geometry={geometry} receiveShadow renderOrder={1}>
        <meshLambertMaterial
          map={baseMap}
          vertexColors
          transparent
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-3}
        />
      </mesh>
      {stripeGeo && (
        <mesh geometry={stripeGeo} receiveShadow renderOrder={2}>
          <meshLambertMaterial
            ref={mat}
            map={stripeMap}
            vertexColors
            color={PALETTE.white}
            emissive={PALETTE.white}
            emissiveIntensity={glow}
            transparent
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-4}
          />
        </mesh>
      )}
    </group>
  );
}
