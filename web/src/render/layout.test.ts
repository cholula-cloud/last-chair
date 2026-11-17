import { describe, expect, it } from "vitest";
import { TERRAIN } from "@/game/terrain";
import { CAFE_POS, HOUSES, LODGE, PARKING, SHOP_POS, WARMING_HUT_POS } from "./layout";

describe("village layout on the terrain", () => {
  it("puts every village building on the flat apron", () => {
    const baseH = TERRAIN.height(TERRAIN.base.x, TERRAIN.base.z);
    const spots = [
      ["lodge", LODGE],
      ["parking", PARKING],
      ["cafe", CAFE_POS],
      ["shop", SHOP_POS],
      ["warming hut", WARMING_HUT_POS],
      ...HOUSES.map((h, i) => [`house ${i}`, h] as const),
    ] as const;
    for (const [name, p] of spots) {
      expect(Math.abs(TERRAIN.height(p.x, p.z) - baseH), name).toBeLessThan(0.05);
    }
  });
});
