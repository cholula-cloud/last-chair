import type { AssetId } from "@/game/base";

export function kitForAsset(id: AssetId): string | undefined {
  const map: Partial<Record<AssetId, string>> = {
    tubing_hill: "tubing-hut",
    ice_rink: "ice-rink",
    apres_bar: "apres-bar",
    fire_pit: "fire-pit",
    string_lights: "string-lights",
    bench: "bench",
    ski_rack: "ski-rack",
    picnic_table: "picnic-table",
    direction_sign: "direction-sign",
    cafe: "cafe",
    shop: "ski-shop",
    warming_hut: "warming-hut",
    rentals: "ski-shop",
    ski_school: "warming-hut",
  };
  return map[id];
}