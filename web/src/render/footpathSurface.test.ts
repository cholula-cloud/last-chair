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
    expect(pathLength(poly)).toBeGreaterThan(pathLength(lot));
    const mesh = buildFootpathSurface(SITE, TERRAIN);
    expect(mesh.getAttribute("position").count).toBeGreaterThan(8);
    expect(mesh.index!.count).toBeGreaterThan(6);
    mesh.dispose();
  });

  it("lifts a wider ribbon above the terrain with a darker track than snow berms", () => {
    const mesh = buildFootpathSurface(SITE, TERRAIN);
    const position = mesh.getAttribute("position");
    const color = mesh.getAttribute("color");
    expect(color.count).toBe(position.count);
    expect(position.count % 4).toBe(0);
    let maxSpan = 0;
    let minLift = Infinity;
    let trackLuma = 0;
    let bermLuma = 0;
    let rows = 0;
    for (let i = 0; i < position.count; i += 4) {
      const dx = position.getX(i) - position.getX(i + 3);
      const dz = position.getZ(i) - position.getZ(i + 3);
      maxSpan = Math.max(maxSpan, Math.hypot(dx, dz));
      for (let c = 0; c < 4; c++) {
        const lift = position.getY(i + c) - TERRAIN.height(position.getX(i + c), position.getZ(i + c));
        minLift = Math.min(minLift, lift);
        const luma = 0.3 * color.getX(i + c) + 0.59 * color.getY(i + c) + 0.11 * color.getZ(i + c);
        if (c === 0 || c === 3) bermLuma += luma;
        else trackLuma += luma;
      }
      rows++;
    }
    expect(maxSpan).toBeGreaterThan(0.65);
    expect(maxSpan).toBeLessThan(0.72);
    expect(minLift).toBeGreaterThan(0.05);
    expect(trackLuma / (rows * 2)).toBeLessThan(bermLuma / (rows * 2) - 0.05);
    mesh.dispose();
  });
});