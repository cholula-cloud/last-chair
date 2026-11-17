import { describe, expect, it } from "vitest";
import { terrainHeight } from "./terrainShape";

// The rendered grid (Terrain.tsx) spans roughly x in [-22, 23], z in [-18, 17.6].
const X_MIN = -24;
const X_MAX = 24;
const Z_MIN = -20;
const Z_MAX = 20;

describe("terrainHeight", () => {
  it("is finite everywhere on the map", () => {
    for (let x = X_MIN; x <= X_MAX; x += 0.25) {
      for (let z = Z_MIN; z <= Z_MAX; z += 0.25) {
        expect(Number.isFinite(terrainHeight(x, z)), `(${x}, ${z})`).toBe(true);
      }
    }
  });

  it("is continuous: height changes at most MAX_SLOPE per unit between neighbours", () => {
    // The steepest real slope is the back side of the summit (about 6 per unit
    // at the far corner); a seam or noise discontinuity would show hundreds.
    const step = 0.01;
    const MAX_SLOPE = 10;
    for (let x = X_MIN; x <= X_MAX; x += 0.37) {
      for (let z = Z_MIN; z <= Z_MAX; z += 0.37) {
        const h = terrainHeight(x, z);
        const sx = Math.abs(terrainHeight(x + step, z) - h) / step;
        const sz = Math.abs(terrainHeight(x, z + step) - h) / step;
        expect(sx, `x (${x}, ${z})`).toBeLessThan(MAX_SLOPE);
        expect(sz, `z (${x}, ${z})`).toBeLessThan(MAX_SLOPE);
      }
    }
  });
});
