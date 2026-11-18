import { describe, expect, it } from "vitest";
import { TERRAIN } from "@/game/terrain";
import { pathLength, lotFarCorner } from "../site";
import { DUTCH_HILL_SITE } from "./dutchHill.site";

describe("Dutch Hill site", () => {
  it("keeps buildings on the village apron", () => {
    const baseH = TERRAIN.height(TERRAIN.base.x, TERRAIN.base.z);
    const b = DUTCH_HILL_SITE.buildings;
    const spots = [
      b.lodge,
      b.warmingHut,
      b.cafe,
      b.shop,
      ...b.houses.map((h) => h.at),
      b.snowcat,
      DUTCH_HILL_SITE.arrival.center,
      DUTCH_HILL_SITE.arrival.overflow.from,
    ];
    for (const p of spots) {
      expect(Math.abs(TERRAIN.height(p.x, p.z) - baseH)).toBeLessThan(0.05);
    }
  });

  it("path lengths match the handoff targets", () => {
    const lotLodge = DUTCH_HILL_SITE.paths.find((p) => p.id === "lot_lodge")!;
    const lodgeLift = DUTCH_HILL_SITE.paths.find((p) => p.id === "lodge_lift")!;
    expect(pathLength(lotLodge.points)).toBeGreaterThan(3.0);
    expect(pathLength(lotLodge.points)).toBeLessThan(3.6);
    expect(pathLength(lodgeLift.points)).toBeGreaterThan(2.3);
    expect(pathLength(lodgeLift.points)).toBeLessThan(2.9);
  });

  it("exposes the lot far corner for home framing", () => {
    const c = lotFarCorner(DUTCH_HILL_SITE);
    expect(c.x).toBeCloseTo(4.7, 1);
    expect(c.z).toBeCloseTo(18.8, 1);
  });
});