"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { manifestEntry } from "@/game/kitManifest";
import { bakeKit, DRACO_PATH, METERS_TO_WORLD, type KitAsset, useKit } from "./kit";
import { PALETTE } from "./palette";

/** Trees read larger than raw metres so crowns match the toy diorama on phone. */
export const TREE_TOY_SCALE = 1.45;

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/** Variant index 0–3 maps to these kit names. */
export const PINE_KITS = ["pine-a", "pine-b", "pine-c", "pine-d"] as const satisfies readonly KitAsset[];
export const PINE_VARIANTS = PINE_KITS.length;

export function pineKitName(variant: number): (typeof PINE_KITS)[number] {
  return PINE_KITS[variant] ?? PINE_KITS[0];
}

const TREE_PRELOAD = PINE_KITS;

if (typeof window !== "undefined") {
  for (const name of TREE_PRELOAD) {
    useGLTF.preload(`${BASE}/models/${name}.glb`, DRACO_PATH);
  }
}

/** Unit-height geometry with base at y = 0 (preserves kit silhouette). */
export function normalizeTreeGeo(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.clone();
  g.computeBoundingBox();
  const box = g.boundingBox;
  if (!box) return g;
  const h = box.max.y - box.min.y;
  const s = h > 1e-6 ? 1 / h : 1;
  g.applyMatrix4(new THREE.Matrix4().makeScale(s, s, s));
  g.translate(0, -box.min.y * s, 0);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

export function treeWorldHeight(name: string): number {
  const m = manifestEntry(name)?.heightMeters ?? 7;
  return m * METERS_TO_WORLD * TREE_TOY_SCALE;
}

/** Average footprint width in world units (for non-uniform instance scale). */
export function treeWorldWidth(name: string): number {
  const fp = manifestEntry(name)?.footprintMeters;
  const m = fp ? (fp[0] + fp[1]) / 2 : 4.5;
  return m * METERS_TO_WORLD * TREE_TOY_SCALE;
}

/** Average pine height for far billboards (unit-height impostor × this). */
export function farTreeWorldSize(): readonly [number, number] {
  const names = PINE_KITS;
  let h = 0;
  let w = 0;
  for (const n of names) {
    h += treeWorldHeight(n);
    w += treeWorldWidth(n);
  }
  return [w / names.length, h / names.length];
}

export type TreeKitGeometries = {
  pines: readonly THREE.BufferGeometry[];
  proxy: THREE.BufferGeometry;
};

const _snow = new THREE.Color(PALETTE.snow);
const _pine = new THREE.Color(PALETTE.pine);
const _pineTip = new THREE.Color(PALETTE.pineTip);
const _vc = new THREE.Color();

/** Kit pines ship with heavy snow caps; nudge baked vertex colours greener at runtime. */
export function greenerKitTreeColors(geo: THREE.BufferGeometry): void {
  const attr = geo.getAttribute("color");
  if (!attr || attr.itemSize !== 3) return;
  for (let i = 0; i < attr.count; i++) {
    _vc.fromBufferAttribute(attr, i);
    const lum = _vc.r * 0.299 + _vc.g * 0.587 + _vc.b * 0.114;
    if (_vc.distanceTo(_snow) < 0.42 || lum > 0.82) {
      _vc.lerp(_pineTip, 0.72).lerp(_snow, 0.1);
    } else {
      _vc.lerp(_pine, 0.22);
    }
    attr.setXYZ(i, _vc.r, _vc.g, _vc.b);
  }
}

function bakeTree(scene: THREE.Object3D): THREE.BufferGeometry {
  const { body } = bakeKit(scene);
  const g = normalizeTreeGeo(body);
  greenerKitTreeColors(g);
  return g;
}

/** Baked, normalized kit meshes for forest instancing (must run under Suspense). */
export function useTreeKit(): TreeKitGeometries {
  // Fixed kit list — one hook call per asset (rules of hooks).
  const pineA = useKit("pine-a");
  const pineB = useKit("pine-b");
  const pineC = useKit("pine-c");
  const pineD = useKit("pine-d");

  return useMemo(() => {
    const pines = [pineA, pineB, pineC, pineD].map((scene) => bakeTree(scene));
    const wide = pines[2] ?? pines[0];
    const proxy = wide.clone();
    proxy.computeBoundingSphere();
    return { pines, proxy };
  }, [pineA, pineB, pineC, pineD]);
}