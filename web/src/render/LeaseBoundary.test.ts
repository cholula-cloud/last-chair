import { describe, expect, it } from "vitest";
import { TERRAIN } from "@/game/terrain";
import { leaseDashGeometry } from "./LeaseBoundary";

describe("lease survey line", () => {
  const geometry = leaseDashGeometry(TERRAIN.lease!, TERRAIN.height);
  const pos = geometry.attributes.position;

  it("drapes dashes over the ground without sinking into it", () => {
    expect(pos.count).toBeGreaterThan(200);
    for (let i = 0; i < pos.count; i++) {
      const ground = TERRAIN.height(pos.getX(i), pos.getZ(i));
      expect(pos.getY(i)).toBeGreaterThan(ground + 0.05);
      expect(pos.getY(i)).toBeLessThan(ground + 0.2);
    }
  });

  it("lies along the lease polygon", () => {
    const poly = TERRAIN.lease!;
    const bounds = {
      xMin: Math.min(...poly.map((p) => p.x)) - 0.5, xMax: Math.max(...poly.map((p) => p.x)) + 0.5,
      zMin: Math.min(...poly.map((p) => p.z)) - 0.5, zMax: Math.max(...poly.map((p) => p.z)) + 0.5,
    };
    for (let i = 0; i < pos.count; i++) {
      expect(pos.getX(i)).toBeGreaterThanOrEqual(bounds.xMin);
      expect(pos.getX(i)).toBeLessThanOrEqual(bounds.xMax);
      expect(pos.getZ(i)).toBeGreaterThanOrEqual(bounds.zMin);
      expect(pos.getZ(i)).toBeLessThanOrEqual(bounds.zMax);
    }
  });

  it("leaves gaps between dashes", () => {
    const index = geometry.index!;
    // Fewer quads than a solid ribbon along the same perimeter would need.
    const perimeter = TERRAIN.lease!.reduce((sum, p, i, a) => {
      const q = a[(i + 1) % a.length];
      return sum + Math.hypot(q.x - p.x, q.z - p.z);
    }, 0);
    expect(index.count / 6).toBeLessThan((perimeter / 0.4) * 0.75);
  });
});
