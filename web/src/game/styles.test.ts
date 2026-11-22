import { describe, expect, it } from "vitest";
import { DEFAULT_STYLE } from "./base";
import {
  manifestStyleFor,
  normalizeStyleId,
  resolveLodgeCoreKit,
  resolveStyledKit,
  unlockedBuildingStyles,
} from "./styles";

describe("building styles", () => {
  it("normalizes legacy timber ids to the catalog default", () => {
    expect(normalizeStyleId("timber50s")).toBe(DEFAULT_STYLE);
    expect(manifestStyleFor("timber50s")).toBeNull();
  });

  it("resolves chalet70s lodge and venue kits from the manifest", () => {
    expect(resolveLodgeCoreKit("chalet70s")).toBe("lodge-tier-1-chalet70s");
    expect(resolveStyledKit("lodge-annex-2", "chalet70s")).toBe("lodge-annex-2-chalet70s");
    expect(resolveStyledKit("cafe", "chalet70s")).toBe("cafe-chalet70s");
  });

  it("keeps default style kits unchanged", () => {
    expect(resolveLodgeCoreKit(DEFAULT_STYLE)).toBe("base-lodge");
    expect(resolveStyledKit("cafe", DEFAULT_STYLE)).toBe("cafe");
  });

  it("unlocks chalet70s at tier 2 and extra packs at tier 3", () => {
    expect(unlockedBuildingStyles({ lodgeTier: 1, completedBeats: [] })).toEqual([DEFAULT_STYLE]);
    expect(unlockedBuildingStyles({ lodgeTier: 2, completedBeats: [] })).toContain("chalet70s");
    expect(unlockedBuildingStyles({ lodgeTier: 2, completedBeats: [] })).not.toContain("aframe60s");
    const t3 = unlockedBuildingStyles({ lodgeTier: 3, completedBeats: [] });
    expect(t3).toEqual(
      expect.arrayContaining(["chalet70s", "aframe60s", "adirondack", "sugarhouse"]),
    );
  });

  it("resolves rental-shop and waffle-haus style kits", () => {
    expect(resolveStyledKit("rental-shop", "chalet70s")).toBe("rental-shop-chalet70s");
    expect(resolveStyledKit("waffle-haus", "aframe60s")).toBe("waffle-haus-aframe60s");
    expect(resolveLodgeCoreKit("adirondack")).toBe("lodge-tier-1-adirondack");
  });
});