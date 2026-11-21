import { describe, expect, it } from "vitest";
import { lodgeParkingLots } from "@/game/base";
import { TERRAIN } from "@/game/terrain";
import { SITE } from "./layout";
import { buildParkingSurface } from "./parkingSurface";

describe("parking surface", () => {
  it("drapes the colored batch and markings over the local terrain", () => {
    const terrain = { ...TERRAIN, height: (x: number, z: number) => x * 0.2 + z * 0.1 };
    const mesh = buildParkingSurface(SITE, 3, terrain);
    const position = mesh.getAttribute("position");
    expect(mesh.index!.count).toBeGreaterThan(position.count);
    expect(mesh.getAttribute("color").count).toBe(position.count);
    expect(mesh.groups).toEqual([]);
    expect(position.count).toBeLessThan(3_000);
    for (let i = 0; i < position.count; i++) {
      const height = terrain.height(position.getX(i), position.getZ(i));
      expect(position.getY(i) - height).toBeGreaterThan(0.02);
      expect(position.getY(i) - height).toBeLessThan(0.13);
    }
    mesh.dispose();
  });

  it("extends south with lodge capacity while keeping its road entrance fixed", () => {
    const original = buildParkingSurface(SITE, 1);
    const expanded = buildParkingSurface(SITE, 3);
    original.computeBoundingBox();
    expanded.computeBoundingBox();
    expect(expanded.boundingBox!.min.x).toBeCloseTo(original.boundingBox!.min.x, 1);
    expect(expanded.boundingBox!.max.x).toBeCloseTo(original.boundingBox!.max.x, 1);

    expect(expanded.boundingBox!.max.z).toBeGreaterThan(original.boundingBox!.max.z + 0.5);
    original.dispose();
    expanded.dispose();
  });
});
