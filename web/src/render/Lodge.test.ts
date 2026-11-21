import { describe, expect, it } from "vitest";
import type { LodgeTier } from "@/game/base";
import { KIT_ASSETS } from "./kit";
import {
  LODGE_ANNEX_KITS,
  LODGE_BASE_KIT,
  VILLAGE_SCENE_KITS,
  lodgeStructureKits,
  villagePlacements,
} from "./Lodge";

describe("village lodge rendering", () => {
  it("registers base lodge and annex kits", () => {
    for (const name of [LODGE_BASE_KIT, ...LODGE_ANNEX_KITS]) {
      expect(KIT_ASSETS).toContain(name);
      expect(VILLAGE_SCENE_KITS).toContain(name);
    }
  });

  it("composes one annex per lodge tier", () => {
    expect(lodgeStructureKits(1)).toEqual([LODGE_BASE_KIT]);
    expect(lodgeStructureKits(2)).toEqual([LODGE_BASE_KIT, LODGE_ANNEX_KITS[0]]);
    expect(lodgeStructureKits(3)).toEqual([LODGE_BASE_KIT, ...LODGE_ANNEX_KITS]);
  });

  it("places structural lodge pieces only on the main lodge anchor", () => {
    for (const tier of [1, 2, 3] as const satisfies LodgeTier[]) {
      const placements = villagePlacements([], tier);
      const lodges = placements.filter((p) => lodgeStructureKits(tier).includes(p.name));
      expect(lodges).toHaveLength(tier);
      const main = lodges.find((p) => p.asset?.kind === "lodge");
      expect(main?.name).toBe(LODGE_BASE_KIT);
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