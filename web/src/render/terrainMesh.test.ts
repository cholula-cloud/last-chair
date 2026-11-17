import { describe, expect, it } from "vitest";
import { LIFT_PREVIEW_SLOTS } from "@/game/descent";
import { TERRAIN } from "@/game/terrain";
import { liftTowers } from "./liftLine";
import { NX, NZ, buildPositions } from "./terrainMesh";

describe("terrain mesh and sim share one heightfield", () => {
  it("every vertex y equals TERRAIN.height at independently computed grid coordinates", () => {
    // Grid per the terrainMesh docs: 150 x 124 cells, s runs -1..1 across each
    // axis, x = 0.6 + 8.5 s + 14 s^3, z = -0.4 + 7 s + 11 s^3 (literals, not
    // the module's gridX/gridZ), so the grid spans x -21.9..23.1, z -18.4..17.6.
    const cols = 150;
    const rows = 124;
    const pos = buildPositions();
    expect(NX).toBe(cols);
    expect(NZ).toBe(rows);
    expect(pos.length).toBe((cols + 1) * (rows + 1) * 3);
    const { xMin, xMax, zMin, zMax } = TERRAIN.bounds;
    expect(-21.9).toBeGreaterThanOrEqual(xMin);
    expect(23.1).toBeLessThanOrEqual(xMax);
    expect(-18.4).toBeGreaterThanOrEqual(zMin);
    expect(17.6).toBeLessThanOrEqual(zMax);
    for (let j = 0; j <= rows; j++) {
      const sz = (2 * j) / rows - 1;
      const z = -0.4 + 7 * sz + 11 * sz ** 3;
      for (let i = 0; i <= cols; i++) {
        const sx = (2 * i) / cols - 1;
        const x = 0.6 + 8.5 * sx + 14 * sx ** 3;
        const k = (j * (cols + 1) + i) * 3;
        expect(pos[k], `x (${i}, ${j})`).toBeCloseTo(x, 4);
        expect(pos[k + 1], `y (${i}, ${j})`).toBeCloseTo(TERRAIN.height(x, z), 4);
        expect(pos[k + 2], `z (${i}, ${j})`).toBeCloseTo(z, 4);
      }
    }
  });

  it("lift tower ground equals TERRAIN.height at the tower position", () => {
    for (const slot of LIFT_PREVIEW_SLOTS) {
      for (const t of liftTowers(slot)) {
        expect(t.ground).toBe(TERRAIN.height(t.x, t.z));
      }
    }
  });
});
