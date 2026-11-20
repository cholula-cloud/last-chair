import { describe, expect, it } from "vitest";
import { TERRAIN } from "./terrain";
import {
  remoteTrailEndThreshold,
  walkDurationMin,
  walkToBasePath,
  walkToLiftPath,
} from "./walkPaths";

describe("walkPaths", () => {
  it("scales the remote trail-end threshold with terrain horizontal scale", () => {
    expect(remoteTrailEndThreshold(TERRAIN)).toBe(0.5 * TERRAIN.scale.horizontal);
  });

  it("walks to the lift along the trail polyline then down to the bottom", () => {
    const path = [
      { x: 0, z: 0 },
      { x: 2, z: 2 },
      { x: 4, z: 5 },
    ];
    const liftBottom = { x: 0.2, z: -1 };
    const walk = walkToLiftPath(path, liftBottom);
    expect(walk[0]).toEqual(path[2]);
    expect(walk[1]).toEqual(path[1]);
    expect(walk[2]).toEqual(path[0]);
    expect(walk.at(-1)).toEqual(liftBottom);
    expect(walkDurationMin(walk, TERRAIN)).toBeGreaterThan(
      walkDurationMin([path[2]!, liftBottom], TERRAIN),
    );
  });

  it("walks home along the reversed trail toward base", () => {
    const path = [{ x: 1, z: 1 }, { x: 3, z: 4 }];
    const base = TERRAIN.base;
    const walk = walkToBasePath(path, base);
    expect(walk[0]).toEqual(path[1]);
    expect(walk.at(-1)).toEqual(base);
  });
});