import { describe, expect, it } from "vitest";
import { DEFAULT_STYLE, type LodgeTier } from "@/game/base";
import { KIT_ASSETS } from "./kit";
import {
  LODGE_BASE_KIT,
  LODGE_TIER_SHELL_KITS,
  VILLAGE_SCENE_KITS,
  lodgeStructureKits,
  villagePlacements,
} from "./Lodge";

describe("village lodge rendering", () => {
  it("registers base lodge and tier shell kits", () => {
    for (const name of [LODGE_BASE_KIT, ...LODGE_TIER_SHELL_KITS]) {
      expect(KIT_ASSETS).toContain(name);
      expect(VILLAGE_SCENE_KITS).toContain(name);
    }
  });

  it("uses one full-shell GLB per lodge tier", () => {
    expect(lodgeStructureKits(1, DEFAULT_STYLE)).toEqual([LODGE_BASE_KIT]);
    expect(lodgeStructureKits(2, DEFAULT_STYLE)).toEqual(["lodge-tier-2"]);
    expect(lodgeStructureKits(3, DEFAULT_STYLE)).toEqual(["lodge-tier-3"]);
  });

  it("resolves chalet tier shells for alternate styles", () => {
    expect(lodgeStructureKits(3, "chalet70s")).toEqual(["lodge-tier-3-chalet70s"]);
    expect(lodgeStructureKits(2, "chalet70s")).toEqual(["lodge-tier-2-chalet70s"]);
  });

  it("places structural lodge only on the main lodge anchor", () => {
    for (const tier of [1, 2, 3] as const satisfies LodgeTier[]) {
      const placements = villagePlacements([], tier, DEFAULT_STYLE);
      const lodges = placements.filter((p) => lodgeStructureKits(tier, DEFAULT_STYLE).includes(p.name));
      expect(lodges).toHaveLength(1);
      const main = lodges.find((p) => p.asset?.kind === "lodge");
      expect(main?.name).toBe(lodgeStructureKits(tier, DEFAULT_STYLE)[0]);
    }
  });

  it("uses only village scene kits for every placement", () => {
    for (const tier of [1, 2, 3] as const satisfies LodgeTier[]) {
      for (const p of villagePlacements([], tier, DEFAULT_STYLE)) {
        expect(VILLAGE_SCENE_KITS).toContain(p.name);
      }
    }
  });
});