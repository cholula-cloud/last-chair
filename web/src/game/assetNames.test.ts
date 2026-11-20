import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { cleanAssetName, placedAssetTarget, renameAsset } from "./assetNames";
import { migrate } from "./migrations";
import { newReplay, playReplay } from "./replay";
import { pickFounder } from "./rules";
import { hydrate, SAVE_VERSION, toPersisted } from "./state";

function hill() {
  return pickFounder(createBuiltHill(10), "elena");
}

describe("asset names", () => {
  it("renames the trail itself and preserves the same selection across edits and save hydration", () => {
    const state = hill();
    const target = placedAssetTarget(state, "trail", 0)!;
    const renamed = renameAsset(state, target, "  Timber   Bend  ");
    expect(renamed.trails[0]).toEqual({ ...state.trails[0], name: "Timber Bend" });
    expect(placedAssetTarget(renamed, "trail", 0)).toEqual(target);
    expect(renameAsset(renamed, target, " \t ")).toBe(renamed);

    const result = migrate(JSON.parse(JSON.stringify(toPersisted(renamed))), SAVE_VERSION);
    expect(result.reset).toBe(false);
    expect(hydrate(result.state, state).trails[0].name).toBe("Timber Bend");

    const replay = newReplay(state);
    replay.actions.push({ rule: "renameAsset", args: [target, "Ridge Run"] });
    expect(playReplay(replay).trails[0].name).toBe("Ridge Run");
  });

  it("persists optional names without leaking a previous slot's lodge name into an older save", () => {
    const state = hill();
    const venue = placedAssetTarget(state, "venue", 0)!;
    const lift = placedAssetTarget(state, "lift", 0)!;
    const renamed = renameAsset(renameAsset(renameAsset(state, { kind: "lodge" }, "Dutch Lodge"), venue, "Timber Hut"), lift, "Rope 1");
    const saved = migrate(JSON.parse(JSON.stringify(toPersisted(renamed))), SAVE_VERSION);
    expect(saved.reset).toBe(false);
    expect(saved.state).toMatchObject({ lodgeName: "Dutch Lodge", assets: [{ name: "Timber Hut" }], lifts: [{ name: "Rope 1" }] });
    expect(hydrate(toPersisted(state), renamed).lodgeName).toBeUndefined();
  });

  it("rejects a stale selection when another venue now occupies the same array slot", () => {
    const state = hill();
    const target = placedAssetTarget(state, "venue", 0)!;
    const updated = { ...state, assets: [{ ...state.assets[0], at: { x: 0, z: 0 } }] };
    expect(renameAsset(updated, target, "Wrong venue")).toBe(updated);
  });

  it("keeps Unicode names intact at the 32-character limit", () => {
    expect(cleanAssetName(` ${"🏔".repeat(40)} `)).toBe("🏔".repeat(32));
  });
});
