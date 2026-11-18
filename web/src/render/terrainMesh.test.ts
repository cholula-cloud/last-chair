import { describe, expect, it } from "vitest";
import { REFERENCE_TOPS } from "@/game/descent";
import { TERRAIN } from "@/game/terrain";
import { liftTowers } from "./liftLine";
import { NX, NZ, buildPositions, gridX, gridZ } from "./terrainMesh";

describe("terrain mesh and sim share one heightfield", () => {
  it("every vertex y equals TERRAIN.height at independently computed grid coordinates", { timeout: 20_000 }, () => {
    const cols = 192;
    const rows = 160;
    const pos = buildPositions();
    expect(NX).toBe(cols);
    expect(NZ).toBe(rows);
    expect(pos.length).toBe((cols + 1) * (rows + 1) * 3);
    const { xMin, xMax, zMin, zMax } = TERRAIN.bounds;
    const xLo = gridX(-1);
    const xHi = gridX(1);
    const zLo = gridZ(-1);
    const zHi = gridZ(1);
    expect(xLo).toBeGreaterThanOrEqual(xMin - 1);
    expect(xHi).toBeLessThanOrEqual(xMax + 5);
    expect(zLo).toBeGreaterThanOrEqual(zMin - 1);
    expect(zHi).toBeLessThanOrEqual(zMax + 1);
    for (let j = 0; j <= rows; j++) {
      const sz = (2 * j) / rows - 1;
      const z = gridZ(sz);
      for (let i = 0; i <= cols; i++) {
        const sx = (2 * i) / cols - 1;
        const x = gridX(sx);
        const k = (j * (cols + 1) + i) * 3;
        expect(pos[k], `x (${i}, ${j})`).toBeCloseTo(x, 3);
        expect(pos[k + 1], `y (${i}, ${j})`).toBeCloseTo(TERRAIN.height(x, z), 3);
        expect(pos[k + 2], `z (${i}, ${j})`).toBeCloseTo(z, 3);
      }
    }
  });

  it("lift tower ground equals TERRAIN.height at the tower position", () => {
    for (const slot of REFERENCE_TOPS) {
      for (const t of liftTowers({ bottom: TERRAIN.base, top: slot })) {
        expect(t.ground).toBe(TERRAIN.height(t.x, t.z));
      }
    }
  });
});