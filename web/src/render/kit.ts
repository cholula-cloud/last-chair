"use client";

import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { KIT_GRIP_Y as MANIFEST_GRIP, KIT_MANIFEST, KIT_ROPE_Y as MANIFEST_ROPE } from "@/game/kitManifest";
import { PALETTE } from "./palette";

/**
 * Blender asset kit v1 (web/public/models, built by tools/blender). Assets are
 * authored in metres, +Y up, origin at base centre. The scene uses toy units:
 * METERS_TO_WORLD sizes buildings so the base lodge matches the Art pass 1
 * lodge footprint; the toy scales enlarge small things so they read on a phone.
 */
export const METERS_TO_WORLD = 0.075;
/** Skiers and lift carriers. */
export const TOY_SCALE = 2;
/** Towers, terminals, guns and lamps: sized so the 1.6 m rope gauge lands on LIFT_CABLE_OFFSET. */
export const LIFT_TOY_SCALE = 0.2 / (1.6 * METERS_TO_WORLD);
/** Site base path: empty locally, "/last-chair" on GitHub Pages (set by next.config.ts). */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const DRACO_PATH = `${BASE}/draco/`;

/** Rope heights in the kit, metres above the asset origin (from manifest v2). */
export const KIT_ROPE_Y = {
  tower: MANIFEST_ROPE.tower,
  terminal: MANIFEST_ROPE.chairTerminal,
  chairTerminal: MANIFEST_ROPE.chairTerminal,
  surfaceTerminal: MANIFEST_ROPE.surfaceTerminal,
} as const;
export const KIT_GRIP_Y = MANIFEST_GRIP;
/** T-bar crossbar height above the asset origin. */
export const KIT_TBAR_BAR_Y = 0.32;

const _kitNames = KIT_MANIFEST.assets.map((e) => e.name);
export const KIT_ASSETS = _kitNames as readonly KitAsset[];
export type KitAsset = (typeof _kitNames)[number];

const REQUIRED_GAME_ASSETS = [
  "base-lodge",
  "lift-tower",
  "lift-terminal-bottom",
  "lift-terminal-top",
  "surface-terminal-bottom",
  "surface-terminal-top",
  "t-bar",
  "chair-double",
  "platter",
  "skier",
  "trail-sign",
  "cafe",
  "cafe-chalet70s",
] as const satisfies readonly KitAsset[];
for (const name of REQUIRED_GAME_ASSETS) {
  if (!_kitNames.includes(name)) throw new Error(`manifest missing required kit: ${name}`);
}

/** Assets fetched at startup; the rest load when first used. */
const PRELOAD_COUNT = KIT_ASSETS.indexOf("lodge-tier-2") + 1;

const url = (name: KitAsset) => `${BASE}/models/${name}.glb`;

if (typeof window !== "undefined") {
  for (const a of KIT_ASSETS.slice(0, PRELOAD_COUNT)) useGLTF.preload(url(a), DRACO_PATH);
}

/** Loaded kit asset scene (suspends while loading). */
export function useKit(name: KitAsset): THREE.Object3D {
  return useGLTF(url(name), DRACO_PATH).scene;
}

/**
 * A kit asset flattened for cheap drawing:
 * - `body`: all non-glow/non-glass geometry (kept for backward compatibility & picking)
 * - `matte`: matte architectural / wood / snow / stone parts (roughness ~0.82)
 * - `semiGloss`: roofs, painted metal, skis, helmets, awnings (roughness ~0.36, metalness ~0.25)
 * - `glass`: window glazing (`window-glow`, `glass-dark`), warm reflective by day → hearth glow at dusk/night
 * - `glow`: unlit lamps/fire (`lamp-glow`)
 * - `split`: materials kept separate (white) for per-instance tinting
 */
export type BakedKit = {
  body: THREE.BufferGeometry;
  matte: THREE.BufferGeometry;
  semiGloss: THREE.BufferGeometry | null;
  glass: THREE.BufferGeometry | null;
  glow: THREE.BufferGeometry | null;
  split: Record<string, THREE.BufferGeometry>;
};

/** Kit material colours remapped to the scene palette for consistency. */
const COLOR_OVERRIDES: Record<string, string> = {
  snow: PALETTE.snow,
};

const SEMI_GLOSS_MATS = new Set([
  "slate-roof",
  "shutter-green",
  "shutter-black",
  "steel",
  "steel-dark",
  "ski",
  "helmet",
  "goggles",
  "awning-red",
  "amber-accent",
  "ochre-trim",
  "burnt-orange",
  "navy",
  "cedar-shake",
  "shop-blue",
  "umbrella-yellow",
]);

const GLASS_MATS = new Set(["window-glow", "glass-dark"]);
const DAY_GLASS_COLOR = new THREE.Color("#a8865c");
const DARK_GLASS_COLOR = new THREE.Color("#25374a");

const cache = new WeakMap<THREE.Object3D, Map<string, BakedKit>>();

function isGlow(m: THREE.MeshStandardMaterial): boolean {
  return (
    !!m.emissive &&
    (m.emissive.r + m.emissive.g + m.emissive.b > 0.05) &&
    (m.emissiveIntensity ?? 1) > 0
  );
}

function prepare(src: THREE.BufferGeometry, matrix: THREE.Matrix4, color: THREE.Color) {
  const g = new THREE.BufferGeometry();
  const nonIndexed = src.index ? src.toNonIndexed() : src;
  g.setAttribute("position", nonIndexed.attributes.position.clone());
  if (nonIndexed.attributes.normal) g.setAttribute("normal", nonIndexed.attributes.normal.clone());
  if (nonIndexed !== src) nonIndexed.dispose();
  g.applyMatrix4(matrix);
  if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

function mergeAll(list: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (list.length === 0) return null;
  const out = mergeGeometries(list, false);
  list.forEach((g) => g.dispose());
  return out;
}

/** Flatten a kit scene (cached per scene + split set). Do not dispose the result. */
export function bakeKit(scene: THREE.Object3D, split: readonly string[] = []): BakedKit {
  const key = split.join(",");
  let byKey = cache.get(scene);
  if (!byKey) cache.set(scene, (byKey = new Map()));
  const hit = byKey.get(key);
  if (hit) return hit;

  scene.updateMatrixWorld(true);
  const matteList: THREE.BufferGeometry[] = [];
  const semiGlossList: THREE.BufferGeometry[] = [];
  const glassList: THREE.BufferGeometry[] = [];
  const glowList: THREE.BufferGeometry[] = [];
  const parts: Record<string, THREE.BufferGeometry[]> = {};
  const white = new THREE.Color(1, 1, 1);
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const m = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
    const name = m.name ?? "";
    if (split.includes(name)) {
      (parts[name] ??= []).push(prepare(mesh.geometry, mesh.matrixWorld, white));
    } else if (GLASS_MATS.has(name)) {
      const glassCol = name === "glass-dark" ? DARK_GLASS_COLOR : DAY_GLASS_COLOR;
      glassList.push(prepare(mesh.geometry, mesh.matrixWorld, glassCol));
    } else if (isGlow(m)) {
      glowList.push(prepare(mesh.geometry, mesh.matrixWorld, m.emissive.clone()));
    } else {
      const c = COLOR_OVERRIDES[name] ? new THREE.Color(COLOR_OVERRIDES[name]) : m.color.clone();
      const target = SEMI_GLOSS_MATS.has(name) ? semiGlossList : matteList;
      target.push(prepare(mesh.geometry, mesh.matrixWorld, c));
    }
  });
  const matteMerged = mergeAll(matteList);
  const matte = matteMerged ?? new THREE.BufferGeometry();
  const semiGloss = mergeAll(semiGlossList);
  const bodyParts: THREE.BufferGeometry[] = [];
  if (matteMerged) bodyParts.push(matteMerged.clone());
  if (semiGloss) bodyParts.push(semiGloss.clone());
  const body = mergeAll(bodyParts) ?? new THREE.BufferGeometry();
  const baked: BakedKit = {
    body,
    matte,
    semiGloss,
    glass: mergeAll(glassList),
    glow: mergeAll(glowList),
    split: Object.fromEntries(
      Object.entries(parts).map(([k, v]) => [k, mergeAll(v) ?? new THREE.BufferGeometry()]),
    ),
  };
  byKey.set(key, baked);
  return baked;
}

const UP = new THREE.Vector3(0, 1, 0);
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();

/** Copy of `geo` scaled, yawed around +Y and moved to (x, y, z). Caller owns it. */
export function placeKit(
  geo: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  yaw: number,
  scale: number | [number, number, number],
): THREE.BufferGeometry {
  const s = typeof scale === "number" ? [scale, scale, scale] : scale;
  tmpQ.setFromAxisAngle(UP, yaw);
  tmpM.compose(new THREE.Vector3(x, y, z), tmpQ, new THREE.Vector3(s[0], s[1], s[2]));
  return geo.clone().applyMatrix4(tmpM);
}

/** Merge placed copies (consumes the inputs). */
export function mergePlaced(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return mergeAll(list) ?? new THREE.BufferGeometry();
}

/** Night-glow colour for kit window glass: amber #ffb347 drawn untonemapped so it stays warm. */
export const GLOW_DAY = 0.62;
export const GLOW_NIGHT = 1.15;

/**
 * Layer for shadow-only proxies: the sun's shadow camera renders it, the main
 * camera does not, so cheap stand-ins can cast shadows for detailed meshes.
 */
export const SHADOW_LAYER = 1;
const mask = new THREE.Layers();
mask.set(SHADOW_LAYER);
export const SHADOW_LAYER_MASK = mask;
