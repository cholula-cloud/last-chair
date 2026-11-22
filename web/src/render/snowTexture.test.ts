import { describe, expect, it } from "vitest";
import { freshTrail } from "@/game/snow";
import {
  SNOW_TEX_SEGMENTS,
  SNOW_TEX_TRAILS,
  bakeSnowAttributes,
  groomedForTrail,
  snowTextureData,
} from "./snowTexture";
import { pathInfluence } from "./trail";

describe("snowTextureData", () => {
  it("fills texels from segment values in trail order", () => {
    const a = freshTrail(0.5, 0.8);
    const b = freshTrail(0.3, 0.4);
    b[2] = { depth: 0.2, quality: 0.35, coverage: 0.6 };
    const data = snowTextureData([a, b], [[], undefined], "mid");
    const i = (1 * SNOW_TEX_SEGMENTS + 2) * 4;
    expect(data[i]).toBeCloseTo(0.2);
    expect(data[i + 1]).toBeCloseTo(0.35);
    expect(data[i + 2]).toBeCloseTo(0.6);
    expect(data[0]).toBeCloseTo(0.5);
    expect(data.length).toBe(SNOW_TEX_SEGMENTS * SNOW_TEX_TRAILS * 4);
  });

  it("encodes gun-only segments in alpha", () => {
    const trail = [{ depth: 0.5, quality: 0.5, coverage: 0.8 }];
    const data = snowTextureData([trail], [[false]], "mid", [[true]]);
    expect(data[3]).toBeCloseTo(0.42, 2);
    const groomed = snowTextureData([trail], [[true]], "mid", [[true]]);
    expect(groomed[3]).toBe(1);
  });

  it("derives groomed from preset when absent", () => {
    expect(groomedForTrail(undefined, "minimal", 6).every((g) => !g)).toBe(true);
    expect(groomedForTrail(undefined, "high", 6).every((g) => g)).toBe(true);
    expect(groomedForTrail([true, false], "minimal", 2)).toEqual([true, false]);
  });
});

describe("bakeSnowAttributes", () => {
  it("keeps aT monotone along a short path", () => {
    const path = [{ x: 0, z: 0 }, { x: 0, z: 12 }];
    const positions = new Float32Array([
      0, 0, 0,
      0, 0, 6,
      0, 0, 12,
    ]);
    const inf = pathInfluence(path, positions, 1, 4, 8);
    const { aT, aTrail, aW } = bakeSnowAttributes([inf], 3);
    expect(aTrail[1]).toBe(0);
    expect(aT[0]).toBeLessThan(aT[1]);
    expect(aT[1]).toBeLessThan(aT[2]);
    expect(aW[0]).toBeGreaterThan(0);
  });

  it("zeros weight outside the corridor fade", () => {
    const path = [{ x: 0, z: 0 }, { x: 0, z: 12 }];
    const positions = new Float32Array([20, 0, 6]);
    const inf = pathInfluence(path, positions, 1, 4, 8);
    const { aTrail, aW } = bakeSnowAttributes([inf], 1);
    expect(aTrail[0]).toBe(-1);
    expect(aW[0]).toBe(0);
  });
});