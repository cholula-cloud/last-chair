import { describe, expect, it } from "vitest";
import { onLease } from "@/game/lease";
import { TERRAIN } from "@/game/terrain";
import { buildLeaseMask } from "./overlayMask";

describe("lease mask", () => {
  const mask = buildLeaseMask(TERRAIN, 64);
  const at = (x: number, z: number) => {
    const i = Math.floor(((x - mask.x0) / mask.spanX) * mask.size);
    const j = Math.floor(((z - mask.z0) / mask.spanZ) * mask.size);
    return mask.data[j * mask.size + i];
  };
  it("is set on the lease and clear off it", () => {
    expect(onLease(TERRAIN.base)).toBe(true);
    expect(at(TERRAIN.base.x, TERRAIN.base.z)).toBe(255);
    expect(at(mask.x0 + 0.1, mask.z0 + 0.1)).toBe(0);
  });
  it("has clear border texels so edge sampling stays off the lease", () => {
    for (let k = 0; k < mask.size; k++) {
      expect(mask.data[k]).toBe(0);
      expect(mask.data[(mask.size - 1) * mask.size + k]).toBe(0);
      expect(mask.data[k * mask.size]).toBe(0);
      expect(mask.data[k * mask.size + mask.size - 1]).toBe(0);
    }
  });
});
