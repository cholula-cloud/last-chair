import { describe, expect, it } from "vitest";
import { defaultTrails } from "@/game/trails";
import { pathInfluence, pathPoint, smoothPath } from "./trail";

type XZ = { x: number; z: number };

const WIDTH = 5.2;
const ROWS = 56;

/** Ribbon cross-sections built the way `TrailRibbon` builds them; counts quads that fold over. */
function foldedQuads(centre: readonly XZ[]): number {
  const left: XZ[] = [];
  const right: XZ[] = [];
  for (let i = 0; i <= ROWS; i++) {
    const t = i / ROWS;
    const c = pathPoint(centre, t);
    const a = pathPoint(centre, Math.max(0, t - 0.01));
    const b = pathPoint(centre, Math.min(1, t + 0.01));
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const nx = -(b.z - a.z) / len;
    const nz = (b.x - a.x) / len;
    left.push({ x: c.x - nx * WIDTH * 0.5, z: c.z - nz * WIDTH * 0.5 });
    right.push({ x: c.x + nx * WIDTH * 0.5, z: c.z + nz * WIDTH * 0.5 });
  }
  const cross = (o: XZ, p: XZ, q: XZ) => (p.x - o.x) * (q.z - o.z) - (p.z - o.z) * (q.x - o.x);
  let folded = 0;
  for (let i = 0; i < ROWS; i++) {
    // Both triangles of a healthy quad wind the same way as each other and as their neighbours.
    const s1 = Math.sign(cross(left[i], right[i], left[i + 1]));
    const s2 = Math.sign(cross(right[i], right[i + 1], left[i + 1]));
    if (s1 !== s2 || s1 === 0) folded++;
  }
  return folded;
}

describe("smoothPath", () => {
  const path = defaultTrails()[0].path;

  it("keeps the trail's top and bottom", () => {
    const s = smoothPath(path, WIDTH * 0.6);
    expect(s[0].x).toBeCloseTo(path[0].x, 5);
    expect(s[0].z).toBeCloseTo(path[0].z, 5);
    expect(s[s.length - 1].x).toBeCloseTo(path[path.length - 1].x, 5);
    expect(s[s.length - 1].z).toBeCloseTo(path[path.length - 1].z, 5);
  });

  it("stays close to the routed path", () => {
    const s = smoothPath(path, WIDTH * 0.6);
    for (let i = 0; i <= 20; i++) {
      const a = pathPoint(path, i / 20);
      let best = Infinity;
      for (const p of s) best = Math.min(best, Math.hypot(p.x - a.x, p.z - a.z));
      expect(best).toBeLessThan(WIDTH * 0.5);
    }
  });

  it("gives a ribbon with no folded quads where the raw route has them", () => {
    expect(foldedQuads(path)).toBeGreaterThan(0);
    expect(foldedQuads(smoothPath(path, WIDTH * 0.6))).toBe(0);
  });
});

it("keeps terrain snow tint near the brush width at each end of a painted trail", () => {
  const path = [{ x: 0, z: 0 }, { x: 0, z: 5 }, { x: 0, z: 10 }];
  const positions = [1, 0, 0.1, 1, 0, 9.9];
  const influence = pathInfluence(path, positions, undefined, undefined, undefined, [30, 60, 150]);
  expect(influence.w[0]).toBe(0);
  expect(influence.w[1]).toBeGreaterThan(0);
});
