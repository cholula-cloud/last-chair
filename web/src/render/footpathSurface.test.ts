import { describe, expect, it } from "vitest";
import { TERRAIN } from "@/game/terrain";
import { SITE } from "./layout";
import { buildFootpathSurface, footpathPolyline } from "./footpathSurface";
import { pathLength } from "@/game/site";

describe("footpath surface", () => {
  it("covers the lot_lodge chain longer than the path data alone", () => {
    const lot = SITE.paths.find((p) => p.id === "lot_lodge")!.points;
    const poly = footpathPolyline(SITE);
    expect(poly.length).toBeGreaterThan(3);
    expect(pathLength(poly)).toBeGreaterThan(pathLength(lot) + 0.8);
    const mesh = buildFootpathSurface(SITE, TERRAIN);
    expect(mesh.getAttribute("position").count).toBeGreaterThan(8);
    expect(mesh.index!.count).toBeGreaterThan(6);
    mesh.dispose();
  });
});