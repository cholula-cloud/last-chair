import { createBuiltHill } from "./__fixtures__/built-hill";
import { describe, expect, it } from "vitest";
import {
  advanceLodgeUpgrade,
  assetEffect,
  assetRevenue,
  ASSET_CATALOG,
  freshBaseAssets,
  lodgeAttachPads,
  lodgeTierUnlocks,
  MAX_BASE_ASSETS,
  nextLodgeTier,
  placedAssetsFromLegacy,
  previewAssetPlacement,
  type PlacedAsset,
} from "./base";
import { DUTCH_HILL_SITE } from "./mountains/dutchHill.site";
import { REFERENCE_TOPS } from "./descent";
import { checkAssetPlacement, checkPlacement, closeLift, pickFounder, placeAsset, placeLift } from "./rules";
import { TERRAIN } from "./terrain";

describe("lodge progression", () => {
  it("unlocks a new lift and revenue sources at Tier 2 after two sleeps", () => {
    const toTier = nextLodgeTier(1);
    expect(toTier).toBe(2);
    const firstSleep = advanceLodgeUpgrade({ toTier: 2, nightsRemaining: 2 });
    expect(firstSleep).toEqual({ toTier: 2, nightsRemaining: 1 });
    expect(advanceLodgeUpgrade(firstSleep!)).toBeNull();
    expect(lodgeTierUnlocks(2)).toEqual(expect.arrayContaining(["Double chair", "Rentals", "Ski school desk"]));
  });

  it("migrates existing venues in place and folds old lodge purchases into the fixed site", () => {
    const migrated = placedAssetsFromLegacy(["warming_hut", "lodge", "cafe", "cafe", "shop", "snow_guns"]);
    expect(migrated.map(({ id }) => id)).toEqual(["warming_hut", "cafe", "shop"]);
    expect(migrated[1].at).toEqual(DUTCH_HILL_SITE.buildings.cafe);
    expect(migrated[1].styleId).toBe(ASSET_CATALOG.cafe.styleId);
    expect(migrated.every(({ attachPad }) => attachPad === undefined)).toBe(true);
  });
});

describe("venue placement", () => {
  const assets = freshBaseAssets();

  it("gates services by lodge tier and keeps snow guns out of the base placement system", () => {
    const at = { x: 11.5, z: 15.5 };
    expect(previewAssetPlacement("rentals", at, 1, assets)).toEqual({ ok: false, reason: "Opens at Lodge Tier 2." });
    expect(previewAssetPlacement("rentals", at, 2, assets)).toMatchObject({ ok: true, attached: false });
    expect(previewAssetPlacement("snow_guns", at, 2, assets).ok).toBe(false);
  });

  it("snaps to a free pad and gives exactly a five percent bonus to effects and per-use revenue", () => {
    const pad = lodgeAttachPads(1)[1];
    const preview = previewAssetPlacement("cafe", { ...pad, x: pad.x + 0.1 }, 1, assets);
    expect(preview).toMatchObject({ ok: true, attached: true, placement: { at: pad, attachPad: 1 } });
    if (!preview.ok) throw new Error(preview.reason);
    expect(assetRevenue(preview.placement)).toBeCloseTo(9.45, 8);
    expect(assetEffect(preview.placement, "hillValue")).toBeCloseTo(3.15, 8);
    expect(previewAssetPlacement("shop", pad, 1, [...assets, preview.placement])).toEqual({
      ok: false,
      reason: "That lodge pad is occupied.",
    });
  });

  it("provides six distinct usable pads at Tier 3", () => {
    const wings: PlacedAsset[] = [];
    for (const [index, pad] of lodgeAttachPads(3).entries()) {
      const preview = previewAssetPlacement("cafe", pad, 3, wings);
      expect(preview).toMatchObject({
        ok: true, attached: true, placement: { attachPad: index },
      });
      if (!preview.ok) throw new Error(preview.reason);
      wings.push(preview.placement);
    }
    expect(lodgeAttachPads(3)).toHaveLength(6);
  });

  it("protects the lodge, parking lot and approach path from detached buildings", () => {
    const site = DUTCH_HILL_SITE;
    for (const at of [site.buildings.lodge, site.arrival.center, site.paths[0].points[1]]) {
      expect(previewAssetPlacement("cafe", at, 1, assets).ok).toBe(false);
    }
  });

  it("refuses a thirteenth placed asset without replacing anything already built", () => {
    const full: PlacedAsset[] = Array.from({ length: MAX_BASE_ASSETS }, () => assets[0]);
    expect(previewAssetPlacement("cafe", { x: 11.5, z: 15.5 }, 1, full)).toEqual({
      ok: false,
      reason: "The base area is full.",
    });
  });
});

describe("lift and venue clearance", () => {
  const started = () => ({ ...pickFounder(createBuiltHill(7), "elena"), lodgeTier: 2 as const, cash: 20000 });
  const top = REFERENCE_TOPS[1];

  it("protects the fixed lodge without blocking the canonical shared lift base", () => {
    const state = started();
    expect(checkPlacement(state, "chair", { bottom: DUTCH_HILL_SITE.buildings.lodge, top }))
      .toEqual({ ok: false, reason: "base_occupied" });
    expect(checkPlacement(state, "chair", { bottom: TERRAIN.base, top }).ok).toBe(true);
  });

  it("reserves the same footprint whether the venue or the moved terminal is built first", () => {
    const state = started();
    const at = { x: 3.5, z: 17.7 };
    const line = { bottom: { ...at, x: 3.2 }, top };
    const withCafe = placeAsset(state, "cafe", at);
    expect(withCafe).not.toBe(state);
    expect(checkPlacement(withCafe, "chair", line)).toEqual({ ok: false, reason: "base_occupied" });
    expect(placeLift(withCafe, { type: "chair", ...line })).toBe(withCafe);

    const withLift = placeLift(state, { type: "chair", ...line });
    expect(withLift).not.toBe(state);
    expect(checkAssetPlacement(withLift, "cafe", at)).toEqual({
      ok: false, reason: "Leave room around the lift terminal.",
    });
    expect(placeAsset(withLift, "cafe", at)).toBe(withLift);
    expect(checkAssetPlacement(closeLift(withLift, 1), "cafe", at).ok).toBe(true);
  });
});
