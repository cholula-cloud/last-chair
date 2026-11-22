import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { ASSET_CATALOG, lodgeAttachPads } from "./base";
import { assetRemovalQuote, buyBuilding, moveAsset, pickFounder, placeAsset, removeAsset } from "./rules";
import { migrate } from "./migrations";
import { SAVE_VERSION, toPersisted } from "./state";

const started = () => ({ ...pickFounder(createBuiltHill(99), "elena"), lodgeTier: 2 as const });
const pad = lodgeAttachPads(2)[0];

describe("venue forgiveness", () => {
  it("undoes only one of two identical upfront purchases", () => {
    const first = buyBuilding(started(), "cafe");
    const both = placeAsset(first, "cafe", pad);
    expect(both.assets).toHaveLength(first.assets.length + 1);
    expect(assetRemovalQuote(both, 1)).toEqual({ undo: true, refund: 1200, reason: null });
    const undone = removeAsset(both, 1);
    expect(undone.cash).toBe(first.cash);
    expect(undone.payables).toEqual(first.payables);
    expect(undone.constructionSpent).toBe(first.constructionSpent);
    expect(undone.buildings).toContain("cafe");
    expect(undone.assets[1].at).toEqual(pad);
  });

  it("preserves purchase records on save and move, even when no cash remains", () => {
    const state = buyBuilding(started(), "cafe");
    const restored = migrate(JSON.parse(JSON.stringify(toPersisted(state))), SAVE_VERSION);
    expect(restored.reset).toBe(false);
    const moved = moveAsset({ ...state, ...restored.state, cash: 0 }, 1, pad);
    expect(moved.cash).toBe(0);
    expect(moved.assets[1]).toMatchObject({ at: pad, attachPad: 0, purchase: state.assets[1].purchase });
    expect(moved.payables).toEqual(state.payables);
    const invalid = moveAsset(moved, 1, { x: Infinity, z: 0 });
    expect(invalid).toBe(moved);
  });

  it("protects guests, booked lessons and Elena’s hut", () => {
    const state = started();
    expect(removeAsset(state, 0)).toBe(state);
    const tom = { ...state, founderId: "tom" as const };
    expect(removeAsset(tom, 0).cash).toBe(tom.cash);
    expect(removeAsset(tom, 0).assets).toHaveLength(0);
    const running = { ...tom, clockMin: tom.clockMin + 10 };
    expect(removeAsset(running, 0)).toBe(running);
    expect(moveAsset(running, 0, pad)).toBe(running);
    const school = placeAsset({ ...state, lodgeTier: 2 }, "ski_school", pad);
    const booked = { ...school, schoolContract: { decision: "accepted" as const, day: 7, pupilsTaught: null } };
    expect(removeAsset(booked, 1)).toBe(booked);
  });

  it("permits resale right away once paid upfront, and returns half the original price", () => {
    const built = buyBuilding(started(), "cafe");
    const nextDay = { ...built, dayIndex: 2 };
    expect(assetRemovalQuote(nextDay, 1)).toEqual({ undo: false, refund: ASSET_CATALOG.cafe.cost / 2, reason: null });
    const sold = removeAsset(nextDay, 1);
    expect(sold.buildings).not.toContain("cafe");
    expect(sold.cash - nextDay.cash).toBe(600);
    expect(removeAsset(sold, 1)).toBe(sold);
  });
});
