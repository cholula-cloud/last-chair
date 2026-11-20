import { describe, expect, it } from "vitest";
import { BoxGeometry, Mesh, Raycaster, Scene, Vector3 } from "three";
import { createBuiltHill } from "@/game/__fixtures__/built-hill";
import { TERRAIN } from "@/game/terrain";
import { pickSceneAsset, trailAt } from "./assetPick";

describe("asset picking", () => {
  it("selects the nearest marked hitbox, including an invisible one for a batched model", () => {
    const state = createBuiltHill();
    const scene = new Scene();
    const ground = { x: 0, z: 0 };
    const height = TERRAIN.height(ground.x, ground.z);
    const ray = new Raycaster(new Vector3(0, height + 5, 0), new Vector3(0, -1, 0));
    const lodge = new Mesh(new BoxGeometry(1, 1, 1));
    lodge.position.y = height + 1;
    lodge.visible = false;
    lodge.userData.asset = { kind: "lodge" };
    const buried = new Mesh(new BoxGeometry(1, 1, 1));
    buried.position.y = height - 1;
    buried.userData.asset = { kind: "snowcat" };
    scene.add(lodge, buried);
    scene.updateMatrixWorld();
    expect(pickSceneAsset(scene, ray, ground, state, false)).toEqual({ kind: "lodge" });
    scene.remove(lodge);
    expect(pickSceneAsset(scene, ray, ground, state, false)).toBeNull();
  });

  it("uses visible trail width and picks the closer trail when painted surfaces overlap", () => {
    const state = createBuiltHill();
    const first = { ...state.trails[0], path: [{ x: 0, z: 0 }, { x: 10, z: 0 }], widths: [60, 60] };
    const second = { ...first, path: first.path.map(({ x, z }) => ({ x, z: z + 0.2 })) };
    const hill = { ...state, trails: [first, second] };
    expect(trailAt(hill, { x: 5, z: 0.2 })).toBe(1);
    expect(trailAt({ ...hill, trails: [first, { ...second, open: false }] }, { x: 5, z: 0.2 })).toBe(0);
    expect(trailAt(hill, { x: 5, z: 7 })).toBe(-1);
  });
});
