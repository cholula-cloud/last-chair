import { describe, expect, it } from "vitest";
import {
  CAFE_POS,
  HOUSES,
  LODGE,
  PARKING,
  SHOP_POS,
  WARMING_HUT_POS,
} from "@/render/layout";
import { DUTCH_HILL } from "./mountains/dutchHill";
import { TERRAIN, createTerrain, fbm, type TerrainDef } from "./terrain";

const { xMin: X_MIN, xMax: X_MAX, zMin: Z_MIN, zMax: Z_MAX } = TERRAIN.bounds;

describe("TERRAIN.height", () => {
  it("is finite everywhere on the map", () => {
    for (let x = X_MIN; x <= X_MAX; x += 0.25) {
      for (let z = Z_MIN; z <= Z_MAX; z += 0.25) {
        expect(Number.isFinite(TERRAIN.height(x, z)), `(${x}, ${z})`).toBe(true);
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
        const h = TERRAIN.height(x, z);
        const sx = Math.abs(TERRAIN.height(x + step, z) - h) / step;
        const sz = Math.abs(TERRAIN.height(x, z + step) - h) / step;
        expect(sx, `x (${x}, ${z})`).toBeLessThan(MAX_SLOPE);
        expect(sz, `z (${x}, ${z})`).toBeLessThan(MAX_SLOPE);
      }
    }
  });

  it("is deterministic: two terrains from the same data agree exactly", () => {
    const other = createTerrain(DUTCH_HILL);
    for (let i = 0; i < 500; i++) {
      const x = X_MIN + ((i * 0.6180339887) % 1) * (X_MAX - X_MIN);
      const z = Z_MIN + ((i * 0.7548776662) % 1) * (Z_MAX - Z_MIN);
      expect(other.height(x, z) === TERRAIN.height(x, z), `(${x}, ${z})`).toBe(true);
    }
  });

  it("keeps the noise unchanged from the render-era fbm (golden values)", () => {
    expect(fbm(1.3, -2.7)).toBeCloseTo(0.0038446515143208, 12);
    expect(fbm(0.6, 0.2)).toBeCloseTo(-0.219838091321921, 12);
    expect(fbm(-4.1, 7.9)).toBeCloseTo(-0.518179788220944, 12);
  });
});

describe("Dutch Hill silhouette", () => {
  const baseH = TERRAIN.height(TERRAIN.base.x, TERRAIN.base.z);

  it("puts every village building on the flat apron", () => {
    const spots = [
      ["lodge", LODGE],
      ["parking", PARKING],
      ["cafe", CAFE_POS],
      ["shop", SHOP_POS],
      ["warming hut", WARMING_HUT_POS],
      ...HOUSES.map((h, i) => [`house ${i}`, h] as const),
    ] as const;
    for (const [name, p] of spots) {
      expect(Math.abs(TERRAIN.height(p.x, p.z) - baseH), name).toBeLessThan(0.05);
    }
  });

  it("has its summit as the highest point of the play area behind the base", () => {
    const { summit } = DUTCH_HILL;
    const top = TERRAIN.height(summit.x, summit.z);
    for (let x = -2.5; x <= 3.5; x += 0.05) {
      for (let z = -4; z < 0; z += 0.05) {
        expect(TERRAIN.height(x, z), `(${x.toFixed(2)}, ${z.toFixed(2)})`).toBeLessThanOrEqual(top + 0.005);
      }
    }
  });

  it("rises monotonically along the fall line from base to summit", () => {
    const { summit } = DUTCH_HILL;
    const n = 400;
    let prev = -Infinity;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const h = TERRAIN.height(
        TERRAIN.base.x + (summit.x - TERRAIN.base.x) * t,
        TERRAIN.base.z + (summit.z - TERRAIN.base.z) * t,
      );
      expect(h, `t=${t}`).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = h;
    }
  });

  it("keeps the first 0.8 units above the base gentle (meadow grade < 0.25)", () => {
    for (let dz = 0; dz <= 0.8; dz += 0.02) {
      expect(TERRAIN.grade(TERRAIN.base.x, TERRAIN.base.z - dz), `dz=${dz.toFixed(2)}`).toBeLessThan(0.25);
    }
  });

  it("has a 570 ft vertical through feetPerUnit", () => {
    const { summit } = DUTCH_HILL;
    const units = TERRAIN.height(summit.x, summit.z) - baseH;
    expect(TERRAIN.feetPerUnit * units).toBeCloseTo(570, 6);
  });
});

describe("grade helpers", () => {
  it("grade is rise over run: a unit-run ramp of height 0.5 has grade 0.5", () => {
    const ramp = createTerrain({
      bounds: DUTCH_HILL.bounds,
      base: { x: 0, z: 10 },
      verticalFeet: 100,
      summit: { x: 0, z: -10 },
      face: [
        [-20, -10],
        [20, 10],
      ],
      domes: [],
    });
    expect(ramp.grade(0, 0)).toBeCloseTo(0.5, 6);
    expect(ramp.grade(3, -4)).toBeCloseTo(0.5, 6);
  });

  it("gradeAlong is positive going downhill and negative going uphill", () => {
    const top = { x: 0.45, z: 0 };
    const bottom = { x: 0.45, z: 1.5 };
    expect(Math.min(...TERRAIN.gradeAlong(top, bottom))).toBeGreaterThan(0);
    expect(Math.max(...TERRAIN.gradeAlong(bottom, top))).toBeLessThan(0);
  });
});

describe("sustainedPitch", () => {
  const fallLine = (z0: number, z1: number, n = 120) =>
    Array.from({ length: n + 1 }, (_, i) => ({ x: 0.45, z: z0 + ((z1 - z0) * i) / n }));

  it("stays below the steepest single sample when the path crosses the rollover", () => {
    // Summit to apron straight down the fall line: crosses the steep band.
    const path = fallLine(-1.6, 1.6);
    const peak = Math.max(...TERRAIN.gradeAlong(path[0], path[path.length - 1], 0.01));
    const sustained = TERRAIN.sustainedPitch(path);
    expect(peak).toBeGreaterThan(1.5);
    expect(sustained).toBeLessThan(peak - 0.1);
    expect(sustained).toBeGreaterThan(0.5);
  });

  it("is not set by a short ledge", () => {
    const ledge = createTerrain({
      bounds: DUTCH_HILL.bounds,
      base: { x: 0, z: 10 },
      verticalFeet: 100,
      summit: { x: 0, z: -10 },
      // Flat, a 0.1-long climb of 0.2, flat again.
      face: [
        [-5, 0],
        [-0.05, 0],
        [0.05, 0.2],
        [5, 0.2],
      ],
      domes: [],
    } satisfies TerrainDef);
    const down = Array.from({ length: 81 }, (_, i) => ({ x: 0, z: -2 + i * 0.05 }));
    const peak = Math.max(...ledge.gradeAlong(down[0], down[80], 0.01));
    expect(peak).toBeGreaterThan(1.5);
    expect(ledge.sustainedPitch(down)).toBeCloseTo(0.2 / 0.6, 2);
  });

  it("equals the grade on constant-grade ground", () => {
    const g = 0.4;
    const ramp = createTerrain({
      bounds: DUTCH_HILL.bounds,
      base: { x: 0, z: 10 },
      verticalFeet: 100,
      summit: { x: 0, z: -10 },
      face: [
        [-20, -20 * g],
        [20, 20 * g],
      ],
      domes: [],
    } satisfies TerrainDef);
    // Height rises toward -z, so descending runs toward +z.
    const down = Array.from({ length: 61 }, (_, i) => ({ x: 0.3, z: -3 + i * 0.1 }));
    expect(ramp.sustainedPitch(down)).toBeCloseTo(g, 3);
    expect(ramp.sustainedPitch(down, 2)).toBeCloseTo(g, 3);
  });
});
