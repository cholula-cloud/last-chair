import { describe, expect, it } from "vitest";
import { mountainTheme } from "./mountainThemes";

describe("mountainTheme", () => {
  it("returns distinct visual themes for Dutch Hill, Mount Tom, and Maple Valley", () => {
    const dh = mountainTheme("dutch_hill");
    const mt = mountainTheme("mount_tom");
    const mv = mountainTheme("maple_valley");

    expect(dh.archTitle).toBe("DUTCH HILL");
    expect(mt.archTitle).toBe("MOUNT TOM");
    expect(mv.archTitle).toBe("MAPLE VALLEY");

    // Mount Tom features dark basalt traprock and more exposed ledges.
    expect(mt.rock).not.toBe(dh.rock);
    expect(mt.rockThreshold).toBeLessThan(dh.rockThreshold);

    // Maple Valley mixes sugarbush maples into the hillside forest.
    expect(mv.mapleRatio).toBeGreaterThan(0);
    expect(dh.mapleRatio).toBe(0);
  });

  it("falls back safely to Dutch Hill for unknown ids", () => {
    expect(mountainTheme(undefined).id).toBe("dutch_hill");
    expect(mountainTheme("unknown_hill").id).toBe("dutch_hill");
  });

  it("provides distinct horizon silhouettes and evening valley light counts", () => {
    const dh = mountainTheme("dutch_hill").horizon;
    const mt = mountainTheme("mount_tom").horizon;
    const mv = mountainTheme("maple_valley").horizon;

    expect(mt.valleyNotchDepth).toBeGreaterThan(dh.valleyNotchDepth);
    expect(mt.bluffSharpness).toBeGreaterThan(dh.bluffSharpness);
    expect(mt.valleyLightCount).toBeGreaterThan(mv.valleyLightCount);
    for (const h of [dh, mt, mv]) {
      expect(h.valleyLightCount).toBeGreaterThanOrEqual(10);
      expect(h.valleyLightCount).toBeLessThanOrEqual(30);
      expect(h.bluffSharpness).toBeGreaterThanOrEqual(1);
    }
  });
});
