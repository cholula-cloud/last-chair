"use client";

import type * as THREE from "three";
import type { KitAsset } from "./kit";
import { useKit } from "./kit";

const STYLES = ["chalet70s", "aframe60s", "adirondack", "sugarhouse"] as const;
const STYLE_OFS = [
  "lodge-tier-1",
  "lodge-tier-2",
  "lodge-tier-3",
  "cafe",
  "ski-shop",
  "rental-shop",
  "warming-hut",
  "waffle-haus",
  "ski-school-desk",
] as const;

function styled(styleOf: string, style: string): KitAsset {
  return `${styleOf}-${style}` as KitAsset;
}

/** Every GLB the village merge loop may resolve at runtime. */
export const VILLAGE_KIT_POOL = [
  "base-lodge",
  "lodge-tier-2",
  "lodge-tier-3",
  "clapboard-house",
  "cafe",
  "ski-shop",
  "rental-shop",
  "warming-hut",
  "waffle-haus",
  "ski-school-desk",
  "ticket-booth",
  "patrol-hut",
  "maintenance-garage",
  "lamp-post",
  "tubing-hut",
  "ice-rink",
  "apres-bar",
  "fire-pit",
  "string-lights",
  "bench",
  "ski-rack",
  "picnic-table",
  ...STYLES.flatMap((style) => STYLE_OFS.map((base) => styled(base, style))),
] as const satisfies readonly KitAsset[];

export type VillageKitName = (typeof VILLAGE_KIT_POOL)[number];

/**
 * Loads the full village kit pool. Hooks are listed explicitly (fixed length) so React
 * hook order stays stable.
 */
export function useVillageKitScenes(): Record<VillageKitName, THREE.Object3D> {
  // Default timber + ops
  const scenes: Partial<Record<VillageKitName, THREE.Object3D>> = {
    "base-lodge": useKit("base-lodge"),
    "lodge-tier-2": useKit("lodge-tier-2"),
    "lodge-tier-3": useKit("lodge-tier-3"),
    "clapboard-house": useKit("clapboard-house"),
    cafe: useKit("cafe"),
    "ski-shop": useKit("ski-shop"),
    "rental-shop": useKit("rental-shop"),
    "warming-hut": useKit("warming-hut"),
    "waffle-haus": useKit("waffle-haus"),
    "ski-school-desk": useKit("ski-school-desk"),
    "ticket-booth": useKit("ticket-booth"),
    "patrol-hut": useKit("patrol-hut"),
    "maintenance-garage": useKit("maintenance-garage"),
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

  // Style packs (hooks must stay in this fixed order)
  scenes["lodge-tier-1-chalet70s"] = useKit("lodge-tier-1-chalet70s");
  scenes["lodge-tier-2-chalet70s"] = useKit("lodge-tier-2-chalet70s");
  scenes["lodge-tier-3-chalet70s"] = useKit("lodge-tier-3-chalet70s");
  scenes["cafe-chalet70s"] = useKit("cafe-chalet70s");
  scenes["ski-shop-chalet70s"] = useKit("ski-shop-chalet70s");
  scenes["rental-shop-chalet70s"] = useKit("rental-shop-chalet70s");
  scenes["warming-hut-chalet70s"] = useKit("warming-hut-chalet70s");
  scenes["waffle-haus-chalet70s"] = useKit("waffle-haus-chalet70s");
  scenes["ski-school-desk-chalet70s"] = useKit("ski-school-desk-chalet70s");

  scenes["lodge-tier-1-aframe60s"] = useKit("lodge-tier-1-aframe60s");
  scenes["lodge-tier-2-aframe60s"] = useKit("lodge-tier-2-aframe60s");
  scenes["lodge-tier-3-aframe60s"] = useKit("lodge-tier-3-aframe60s");
  scenes["cafe-aframe60s"] = useKit("cafe-aframe60s");
  scenes["ski-shop-aframe60s"] = useKit("ski-shop-aframe60s");
  scenes["rental-shop-aframe60s"] = useKit("rental-shop-aframe60s");
  scenes["warming-hut-aframe60s"] = useKit("warming-hut-aframe60s");
  scenes["waffle-haus-aframe60s"] = useKit("waffle-haus-aframe60s");
  scenes["ski-school-desk-aframe60s"] = useKit("ski-school-desk-aframe60s");

  scenes["lodge-tier-1-adirondack"] = useKit("lodge-tier-1-adirondack");
  scenes["lodge-tier-2-adirondack"] = useKit("lodge-tier-2-adirondack");
  scenes["lodge-tier-3-adirondack"] = useKit("lodge-tier-3-adirondack");
  scenes["cafe-adirondack"] = useKit("cafe-adirondack");
  scenes["ski-shop-adirondack"] = useKit("ski-shop-adirondack");
  scenes["rental-shop-adirondack"] = useKit("rental-shop-adirondack");
  scenes["warming-hut-adirondack"] = useKit("warming-hut-adirondack");
  scenes["waffle-haus-adirondack"] = useKit("waffle-haus-adirondack");
  scenes["ski-school-desk-adirondack"] = useKit("ski-school-desk-adirondack");

  scenes["lodge-tier-1-sugarhouse"] = useKit("lodge-tier-1-sugarhouse");
  scenes["lodge-tier-2-sugarhouse"] = useKit("lodge-tier-2-sugarhouse");
  scenes["lodge-tier-3-sugarhouse"] = useKit("lodge-tier-3-sugarhouse");
  scenes["cafe-sugarhouse"] = useKit("cafe-sugarhouse");
  scenes["ski-shop-sugarhouse"] = useKit("ski-shop-sugarhouse");
  scenes["rental-shop-sugarhouse"] = useKit("rental-shop-sugarhouse");
  scenes["warming-hut-sugarhouse"] = useKit("warming-hut-sugarhouse");
  scenes["waffle-haus-sugarhouse"] = useKit("waffle-haus-sugarhouse");
  scenes["ski-school-desk-sugarhouse"] = useKit("ski-school-desk-sugarhouse");

  return scenes as Record<VillageKitName, THREE.Object3D>;
}
