import { describe, expect, it } from "vitest";
import { checkLiftLine, checkSpacing, REFERENCE_TOPS, type LiftLine } from "./descent";
import { DUTCH_HILL, DUTCH_HILL_SHOULDERS } from "./mountains/dutchHill";
import { TERRAIN, createTerrain, fbm, type TerrainDef } from "./terrain";
import { defaultTrails, routeOptions } from "./trails";

const { xMin: X_MIN, xMax: X_MAX, zMin: Z_MIN, zMax: Z_MAX } = TERRAIN.bounds;

describe("TERRAIN.height", () => {
  it("is finite everywhere on the map", () => {
    for (let x = X_MIN; x <= X_MAX; x += 2) {
      for (let z = Z_MIN; z <= Z_MAX; z += 2) {
        expect(Number.isFinite(TERRAIN.height(x, z)), `(${x}, ${z})`).toBe(true);
      }
    }
  });

  it("is continuous: height changes at most MAX_SLOPE per unit between neighbours", () => {
    // The steepest real slope is the back side of the summit (about 6 per unit
    // at the far corner); a seam or noise discontinuity would show hundreds.
    const step = 0.05;
    const MAX_SLOPE = 40;
    for (let x = X_MIN; x <= X_MAX; x += 2) {
      for (let z = Z_MIN; z <= Z_MAX; z += 2) {
        const h = TERRAIN.height(x, z);
        const sx = Math.abs(TERRAIN.height(x + step, z) - h) / step;
        const sz = Math.abs(TERRAIN.height(x, z + step) - h) / step;
        expect(sx, `x (${x}, ${z})`).toBeLessThan(MAX_SLOPE);
        expect(sz, `z (${x}, ${z})`).toBeLessThan(MAX_SLOPE);
      }
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

  it("has its summit as the highest point of the play area behind the base", () => {
    const summit = TERRAIN.toWorld(DUTCH_HILL.summit);
    const top = TERRAIN.height(summit.x, summit.z);
    for (let x = summit.x - 15; x <= summit.x + 15; x += 0.3) {
      for (let z = summit.z - 15; z < summit.z + 5; z += 0.3) {
        expect(TERRAIN.height(x, z), `(${x.toFixed(2)}, ${z.toFixed(2)})`).toBeLessThanOrEqual(top + 0.02);
      }
    }
  });

  it("rises monotonically along the fall line from base to summit", () => {
    const summit = TERRAIN.toWorld(DUTCH_HILL.summit);
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

  it("keeps the first meadow above the base gentle (meadow grade < 0.25)", () => {
    for (let dz = 0; dz <= DUTCH_HILL.meadow!.length * TERRAIN.scale.horizontal; dz += 0.12) {
      expect(TERRAIN.grade(TERRAIN.base.x, TERRAIN.base.z - dz), `dz=${dz.toFixed(2)}`).toBeLessThan(0.25);
    }
  });

  describe("convex across the slope: the lift line runs up a crest", () => {
    const H = TERRAIN.scale.horizontal;
    const base = DUTCH_HILL.base;
    const summit = DUTCH_HILL.summit;
    const apronZ = DUTCH_HILL.apron!.z;
    /** Height at design x, design distance d uphill from the apron edge. */
    const hd = (x: number, d: number) => TERRAIN.height(x * H, (apronZ - d) * H);
    /** Design x of the base to summit line at distance d. */
    const lineX = (d: number) => base.x + ((apronZ - d - base.z) / (summit.z - base.z)) * (summit.x - base.x);
    const band: number[] = [];
    for (let i = 0; i <= 13; i++) band.push(0.8 + i * 0.2);

    it("keeps the lift line at least as high as the ground 1 to 4 units to either side", () => {
      for (const d of band) {
        const c = hd(lineX(d), d);
        for (let k = 1; k <= 4; k++) {
          expect(hd(lineX(d) - k, d), `d=${d.toFixed(1)} x-${k}`).toBeLessThanOrEqual(c);
          expect(hd(lineX(d) + k, d), `d=${d.toFixed(1)} x+${k}`).toBeLessThanOrEqual(c);
        }
      }
    });

    it("has no trough under the lift (lateral second difference is not positive)", () => {
      const EPS = 0.05; // world units
      for (const d of band) {
        const x = lineX(d);
        const second = hd(x - 0.5, d) + hd(x + 0.5, d) - 2 * hd(x, d);
        expect(second, `d=${d.toFixed(1)}`).toBeLessThanOrEqual(EPS);
      }
    });

    it("settles to a low valley floor at the map edges, not a pit", () => {
      const apron = DUTCH_HILL.apron!.height * TERRAIN.scale.vertical;
      for (const x of [TERRAIN.bounds.xMin, TERRAIN.bounds.xMax]) {
        // The back side behind the summit falls away by design (backFall), so check the front and sides.
        for (let z = -4 * H; z <= TERRAIN.bounds.zMax; z += 4) {
          const h = TERRAIN.height(x, z);
          expect(h, `(${x}, ${z})`).toBeGreaterThan(apron - 3);
          expect(h, `(${x}, ${z})`).toBeLessThan(apron + 3);
        }
      }
    });
  });

  it("has a 570 ft vertical through feetPerUnit", () => {
    const summit = TERRAIN.toWorld(DUTCH_HILL.summit);
    const units = TERRAIN.height(summit.x, summit.z) - baseH;
    expect(TERRAIN.feetPerUnit * units).toBeCloseTo(570, 6);
  });
});

describe("Dutch Hill builder terrain", () => {
  const crestOnly = createTerrain({
    ...DUTCH_HILL,
    flanks: { ...DUTCH_HILL.flanks!, outerShoulder: undefined },
  });
  const [ridge, mid] = REFERENCE_TOPS;
  const lineAt = (top: LiftLine["top"]): LiftLine => ({ bottom: TERRAIN.base, top });
  const existingLifts = [
    { type: "surface" as const, line: lineAt(ridge) },
    { type: "chair" as const, line: lineAt(mid) },
  ];

  it("keeps the base, starter route and reference terminal heights from older saves", () => {
    expect(TERRAIN.base).toEqual(crestOnly.base);
    expect(defaultTrails()).toEqual(defaultTrails(crestOnly));
    for (const { x, z } of REFERENCE_TOPS) {
      expect(TERRAIN.height(x, z)).toBe(crestOnly.height(x, z));
    }
  });

  it("allows terminal sites on both shoulders and six routes from a three-lift layout", () => {
    for (const site of DUTCH_HILL_SHOULDERS) {
      const line = lineAt(TERRAIN.toWorld(site));
      expect(checkLiftLine(line, crestOnly).ok).toBe(false);
      expect(checkLiftLine(line).ok).toBe(true);
      expect(checkSpacing(line, existingLifts)).toBeNull();
    }

    const east = TERRAIN.toWorld(DUTCH_HILL_SHOULDERS[1]);
    const runs = [ridge, mid, east].flatMap((top) => routeOptions(top));
    const skiable = runs.filter(({ difficulty, path }) => {
      const end = path.at(-1)!;
      return difficulty !== "black" && Math.hypot(end.x - TERRAIN.base.x, end.z - TERRAIN.base.z) < 0.5;
    });
    expect(skiable.length).toBeGreaterThanOrEqual(6);
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

  it("gradeAlong rejects a step that is zero, negative or NaN", () => {
    const a = { x: 0.45, z: 0 };
    const b = { x: 0.45, z: 1 };
    expect(() => TERRAIN.gradeAlong(a, b, 0)).toThrow(RangeError);
    expect(() => TERRAIN.gradeAlong(a, b, -0.05)).toThrow(RangeError);
    expect(() => TERRAIN.gradeAlong(a, b, Number.NaN)).toThrow(RangeError);
  });

  it("gradeAlong is positive going downhill and negative going uphill", () => {
    const top = TERRAIN.toWorld({ x: 0.45, z: 0 });
    const bottom = TERRAIN.toWorld({ x: 0.45, z: 1.5 });
    expect(Math.min(...TERRAIN.gradeAlong(top, bottom))).toBeGreaterThan(0);
    expect(Math.max(...TERRAIN.gradeAlong(bottom, top))).toBeLessThan(0);
  });
});

describe("sustainedPitch", () => {
  const fallLine = (z0: number, z1: number, n = 120) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const z = z0 + ((z1 - z0) * i) / n;
      return TERRAIN.toWorld({ x: 0.45, z });
    });

  it("stays below the steepest single sample when the path crosses the rollover", () => {
    // Summit to apron straight down the fall line: crosses the steep band.
    const path = fallLine(-1.6, 1.6);
    const peak = Math.max(...TERRAIN.gradeAlong(path[0], path[path.length - 1], 0.01));
    const sustained = TERRAIN.sustainedPitch(path);
    expect(peak).toBeGreaterThan(0.5);
    expect(sustained).toBeLessThan(peak - 0.05);
    expect(sustained).toBeGreaterThan(0.15);
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
