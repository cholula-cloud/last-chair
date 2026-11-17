import { describe, expect, it } from "vitest";
import { LIFT_PREVIEW_SLOTS } from "@/game/descent";
import { TERRAIN } from "@/game/terrain";
import { liftTowers } from "./liftLine";
import { NX, NZ, buildPositions, gridX, gridZ } from "./terrainMesh";

describe("terrain mesh and sim share one heightfield", () => {
  it("every vertex y equals TERRAIN.height at its x, z", () => {
    const pos = buildPositions();
    expect(pos.length).toBe((NX + 1) * (NZ + 1) * 3);
    let p = 0;
    for (let j = 0; j <= NZ; j++) {
      const z = gridZ((j / NZ) * 2 - 1);
      for (let i = 0; i <= NX; i++) {
        const x = gridX((i / NX) * 2 - 1);
        expect(pos[p]).toBe(Math.fround(x));
        expect(pos[p + 1], `(${i}, ${j})`).toBe(Math.fround(TERRAIN.height(x, z)));
        expect(pos[p + 2]).toBe(Math.fround(z));
        p += 3;
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
