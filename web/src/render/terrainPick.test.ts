import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { TERRAIN } from "@/game/terrain";
import { marchToTerrain, pickTerrain } from "./terrainPick";

describe("marchToTerrain", () => {
  it("hits the ground on a downward ray", () => {
    const hit = marchToTerrain(
      { x: 5, y: 50, z: 5 },
      { x: 0, y: -1, z: 0 },
      TERRAIN.height,
      200,
      0.001,
    );
    expect(hit).not.toBeNull();
    expect(hit!.x).toBeCloseTo(5, 1e-6);
    expect(hit!.z).toBeCloseTo(5, 1e-6);
  });
});

describe("pickTerrain", () => {
  it("returns a point under the camera center ray", () => {
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    cam.position.set(2.7, 40, 45);
    cam.lookAt(2.7, 0, 15.3);
    cam.updateMatrixWorld();
    const hit = pickTerrain({ x: 0, y: 0 }, cam, TERRAIN.height);
    expect(hit).not.toBeNull();
    const ref = marchToTerrain(
      cam.position,
      new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion),
      TERRAIN.height,
      1000,
      0.001,
    );
    expect(hit!.x).toBeCloseTo(ref!.x, 2);
    expect(hit!.z).toBeCloseTo(ref!.z, 2);
  });

  it("returns null for a ray pointing up", () => {
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    cam.position.set(0, 5, 0);
    cam.lookAt(0, 50, 0);
    cam.updateMatrixWorld();
    expect(pickTerrain({ x: 0, y: 0 }, cam, TERRAIN.height)).toBeNull();
  });
});