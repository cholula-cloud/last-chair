import type { AssetId } from "@/game/base";

export function kitForAsset(id: AssetId): string | undefined {
  const map: Partial<Record<AssetId, string>> = {
    tubing_hill: "tubing-hut",
    ice_rink: "ice-rink",
    apres_bar: "apres-bar",
    waffle_haus: "waffle-haus",
    fire_pit: "fire-pit",
    string_lights: "string-lights",
    bench: "bench",
    ski_rack: "ski-rack",
    picnic_table: "picnic-table",
    direction_sign: "direction-sign",
    cafe: "cafe",
    shop: "ski-shop",
    rentals: "rental-shop",
    warming_hut: "warming-hut",
    ski_school: "ski-school-desk",
    ticket_booth: "ticket-booth",
    patrol_hut: "patrol-hut",
    maintenance_garage: "maintenance-garage",
  };
  return map[id];
}
