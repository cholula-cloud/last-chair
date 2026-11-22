import { describe, expect, it } from "vitest";
import { pathLength } from "@/game/site";
import { TERRAIN } from "@/game/terrain";
import { DUTCH_HILL_SITE } from "@/game/mountains/dutchHill.site";
import { SITE } from "./layout";
import {
  buildFootpathSurface,
  decorativeFootpathPoints,
  footpathLampPosts,
  footpathPolyline,
  footpathWalkChain,
} from "./footpathSurface";

describe("footpath surface", () => {
  it("walk chain still includes the road spur", () => {
    const lot = SITE.paths.find((p) => p.id === "lot_lodge")!.points;
    const chain = footpathWalkChain(SITE);
    expect(pathLength(chain)).toBeGreaterThan(pathLength(lot));
  });

  it("decorative path skips the road crossing and stops on the lodge porch", () => {
    const decorative = decorativeFootpathPoints(SITE);
    const roadZ = SITE.road.z;
    const pathX = decorative[0]?.x ?? 7.2;
    expect(decorative.some((p) => Math.abs(p.z - roadZ) < 0.4 && Math.abs(p.x - pathX) < 0.4)).toBe(false);
    const last = decorative.at(-1)!;
    const { lodge } = DUTCH_HILL_SITE.buildings;
    expect(last.z).toBeLessThan(lodge.z + lodge.footprint.depth * 0.5);
    expect(last.z).toBeGreaterThan(lodge.z);
    const mesh = buildFootpathSurface(SITE, TERRAIN);
    expect(mesh.getAttribute("position").count).toBeGreaterThan(8);
    mesh.dispose();
  });

  it("fades width toward the lodge and leaves no mesh over Route 100", () => {
    const poly = footpathPolyline(SITE);
    const roadZ = SITE.road.z;
    const onRoad = poly.filter((p) => Math.abs(p.z - roadZ) < 0.5 && Math.abs(p.x - 7.2) < 0.55);
    expect(onRoad.length).toBeLessThan(poly.length * 0.15);
    const mesh = buildFootpathSurface(SITE, TERRAIN);
    const pos = mesh.getAttribute("position");
    let maxSpan = 0;
    for (let i = 0; i < pos.count; i += 4) {
      const dx = pos.getX(i) - pos.getX(i + 3);
      const dz = pos.getZ(i) - pos.getZ(i + 3);
      maxSpan = Math.max(maxSpan, Math.hypot(dx, dz));
      for (let v = 0; v < 4; v++) {
        const z = pos.getZ(i + v);
        expect(Math.abs(z - roadZ) > 0.48 || Math.abs(pos.getX(i + v) - 7.2) > 0.55).toBe(true);
      }
    }
    expect(maxSpan).toBeLessThan(0.42);
    expect(maxSpan).toBeGreaterThan(0.22);
    mesh.dispose();
  });

  it("places lamps along the walk at even spacing", () => {
    const posts = footpathLampPosts(SITE);
    expect(posts.length).toBeGreaterThanOrEqual(3);
    const path = footpathPolyline(SITE);
    const lens = [0];
    for (let i = 1; i < path.length; i++) {
      lens.push(lens[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
    }
    const total = lens.at(-1)!;
    const dists = posts.map((p) => {
      let best = Infinity;
      for (let i = 0; i < path.length - 1; i++) {
        const d = distPointToSeg(p, path[i], path[i + 1]);
        if (d < best) best = d;
      }
      return best;
    });
    expect(dists.every((d) => d < 0.55)).toBe(true);
    expect(total).toBeGreaterThan(8);
  });
});

function distPointToSeg(p: { x: number; z: number }, a: { x: number; z: number }, b: { x: number; z: number }) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = dx * dx + dz * dz || 1e-6;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len));
  const x = a.x + t * dx;
  const z = a.z + t * dz;
  return Math.hypot(p.x - x, p.z - z);
}