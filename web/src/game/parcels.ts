import type { MountainId } from "./calendar";
import type { Terrain, XZ } from "./terrain";

export const NORTH_RIDGE_COST = 7500;
export const NORTH_RIDGE_REP_BONUS = 4;

export type ParcelLeaseState = {
  mountainId?: MountainId;
  northRidgeParcel?: boolean;
  orchardParcel?: "unbid" | "pending" | "owned" | "whiterock";
};

/**
 * Returns the active lease polygon for the mountain including any purchased
 * expansion parcels (Dutch Hill North Ridge or Maple Valley Orchard meadow).
 */
export function activeLeasePolygon(
  terrain: Terrain,
  state: ParcelLeaseState,
): readonly XZ[] | undefined {
  if (!terrain.lease) return undefined;
  if (state.mountainId === "dutch_hill" && state.northRidgeParcel) {
    return terrain.lease.map((p) => (p.z <= -26 ? { x: p.x, z: p.z - 10 } : p));
  }
  if (state.mountainId === "maple_valley" && state.orchardParcel === "owned") {
    return terrain.lease.map((p) => (p.x >= 40 && p.z >= 0 ? { x: p.x + 10, z: p.z } : p));
  }
  return terrain.lease;
}

/** Returns a Terrain view whose `.lease` reflects any purchased expansion parcels. */
export function terrainWithActiveLease(terrain: Terrain, state: ParcelLeaseState): Terrain {
  const lease = activeLeasePolygon(terrain, state);
  if (lease === terrain.lease) return terrain;
  return { ...terrain, lease };
}
