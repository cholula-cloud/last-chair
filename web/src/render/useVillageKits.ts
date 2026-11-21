"use client";

import type * as THREE from "three";
import type { KitAsset } from "./kit";
import { useKit } from "./kit";

/** Every GLB the village merge loop may resolve at runtime (default + chalet70s). */
export const VILLAGE_KIT_POOL = [
  "base-lodge",
  "lodge-annex-2",
  "lodge-annex-3",
  "lodge-tier-1-chalet70s",
  "lodge-annex-2-chalet70s",
  "lodge-annex-3-chalet70s",
  "clapboard-house",
  "cafe",
  "cafe-chalet70s",
  "ski-shop",
  "ski-shop-chalet70s",
  "warming-hut",
  "warming-hut-chalet70s",
  "lamp-post",
  "tubing-hut",
  "ice-rink",
  "apres-bar",
  "fire-pit",
  "string-lights",
  "bench",
  "ski-rack",
  "picnic-table",
] as const satisfies readonly KitAsset[];

export type VillageKitName = (typeof VILLAGE_KIT_POOL)[number];

/** Loads the full village kit pool; hooks must be unconditional. */
export function useVillageKitScenes(): Record<VillageKitName, THREE.Object3D> {
  return {
    "base-lodge": useKit("base-lodge"),
    "lodge-annex-2": useKit("lodge-annex-2"),
    "lodge-annex-3": useKit("lodge-annex-3"),
    "lodge-tier-1-chalet70s": useKit("lodge-tier-1-chalet70s"),
    "lodge-annex-2-chalet70s": useKit("lodge-annex-2-chalet70s"),
    "lodge-annex-3-chalet70s": useKit("lodge-annex-3-chalet70s"),
    "clapboard-house": useKit("clapboard-house"),
    cafe: useKit("cafe"),
    "cafe-chalet70s": useKit("cafe-chalet70s"),
    "ski-shop": useKit("ski-shop"),
    "ski-shop-chalet70s": useKit("ski-shop-chalet70s"),
    "warming-hut": useKit("warming-hut"),
    "warming-hut-chalet70s": useKit("warming-hut-chalet70s"),
    "lamp-post": useKit("lamp-post"),
    "tubing-hut": useKit("tubing-hut"),
    "ice-rink": useKit("ice-rink"),
    "apres-bar": useKit("apres-bar"),
    "fire-pit": useKit("fire-pit"),
    "string-lights": useKit("string-lights"),
    bench: useKit("bench"),
    "ski-rack": useKit("ski-rack"),
    "picnic-table": useKit("picnic-table"),
  };
}