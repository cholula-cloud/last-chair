import { describe, expect, it } from "vitest";
import type { LodgeTier } from "@/game/base";
import { KIT_ASSETS } from "./kit";
import { LODGE_KIT_BY_TIER, VILLAGE_SCENE_KITS, lodgeKitName, villagePlacements } from "./Lodge";

describe("village lodge rendering", () => {
  it("maps each lodge tier to a registered village kit", () => {
    for (const tier of [1, 2, 3] as const satisfies LodgeTier[]) {
      const name = lodgeKitName(tier);
      expect(name).toBe(LODGE_KIT_BY_TIER[tier - 1]);
      expect(KIT_ASSETS).toContain(name);
      expect(VILLAGE_SCENE_KITS).toContain(name);
    }
  });

  it("places a lodge mesh for tiers 2 and 3 that the scene map can resolve", () => {
    for (const tier of [2, 3] as const satisfies LodgeTier[]) {
      const placements = villagePlacements([], tier);
      const lodge = placements.find((p) => p.asset?.kind === "lodge");
      expect(lodge?.name).toBe(lodgeKitName(tier));
      expect(VILLAGE_SCENE_KITS).toContain(lodge!.name);
    }
  });

  it("uses only village scene kits for every placement", () => {
    for (const tier of [1, 2, 3] as const satisfies LodgeTier[]) {
      for (const p of villagePlacements([], tier)) {
        expect(VILLAGE_SCENE_KITS).toContain(p.name);
      }
    }
  });
});