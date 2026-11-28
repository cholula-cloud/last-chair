import { describe, expect, it } from "vitest";
import { activeLeasePolygon, NORTH_RIDGE_COST, terrainWithActiveLease } from "./parcels";
import { onLease } from "./lease";
import { buyNorthRidgeParcel, pickFounder } from "./rules";
import { createInitialState } from "./state";
import { TERRAIN, terrainForMountain } from "./terrain";

describe("Expandable hill parcels", () => {
  it("expands Dutch Hill northward when North Ridge parcel is purchased", () => {
    const northSpot = { x: 0, z: -44 };
    expect(onLease(northSpot, TERRAIN)).toBe(false);

    const start = pickFounder(createInitialState(1, "dutch_hill"), "elena");
    // Requires Lodge Tier 2.
    expect(buyNorthRidgeParcel(start)).toBe(start);

    const tier2 = { ...start, lodgeTier: 2 as const, cash: 10_000 };
    const bought = buyNorthRidgeParcel(tier2);
    expect(bought.northRidgeParcel).toBe(true);
    expect(bought.cash).toBe(10_000 - NORTH_RIDGE_COST);
    expect(bought.reputation).toBe(tier2.reputation + 4);

    const expanded = terrainWithActiveLease(TERRAIN, bought);
    expect(activeLeasePolygon(TERRAIN, bought)).not.toBe(TERRAIN.lease);
    expect(onLease(northSpot, expanded)).toBe(true);
  });

  it("expands Maple Valley base eastward when Orchard parcel is owned", () => {
    const mvTerrain = terrainForMountain("maple_valley");
    const orchardSpot = { x: 52, z: 12 };
    expect(onLease(orchardSpot, mvTerrain)).toBe(false);

    const expanded = terrainWithActiveLease(mvTerrain, {
      mountainId: "maple_valley",
      orchardParcel: "owned",
    });
    expect(onLease(orchardSpot, expanded)).toBe(true);
  });
});
