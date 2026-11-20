import { ASSET_CATALOG, LODGE_TIERS, type PlacedAsset } from "./base";
import type { GameState, LiftSlot } from "./state";
import type { XZ } from "./terrain";
import { LIFT_LABELS } from "./types";

export const MAX_ASSET_NAME_LENGTH = 32;

export function cleanAssetName(value: string): string {
  return Array.from(value.trim().replace(/\s+/g, " ")).slice(0, MAX_ASSET_NAME_LENGTH).join("").trimEnd();
}

type IndexedAssetKind = "venue" | "lift" | "trail" | "gun";
export type AssetTarget =
  | { kind: "lodge" | "parking" | "snowcat" }
  | { kind: IndexedAssetKind; index: number; identity: string };

const locationKey = (at: XZ | undefined) => at && `${at.x},${at.z}`;

/** Use the underlying placement, so shifting an array cannot make a stale tap rename its neighbor. */
function placementIdentity(state: GameState, kind: IndexedAssetKind, index: number): string | undefined {
  switch (kind) {
    case "venue": {
      const venue = state.assets[index];
      return venue && JSON.stringify([venue.id, locationKey(venue.at), venue.purchase?.day, venue.purchase?.minute]);
    }
    case "lift": {
      const lift = state.lifts[index];
      return lift?.confirmed ? JSON.stringify([lift.type, locationKey(lift.bottom), locationKey(lift.anchor), lift.builtDay, lift.builtAtMin]) : undefined;
    }
    case "trail": {
      const trail = state.trails[index];
      return trail?.open ? JSON.stringify([trail.liftIndex, trail.builtDay, trail.builtAtMin, trail.path]) : undefined;
    }
    case "gun": {
      const gun = state.guns[index];
      return gun && JSON.stringify([locationKey(gun.at), gun.builtDay]);
    }
  }
}

export function placedAssetTarget(state: GameState, kind: IndexedAssetKind, index: number): AssetTarget | null {
  const identity = placementIdentity(state, kind, index);
  return identity === undefined ? null : { kind, index, identity };
}

export function assetIsPresent(state: GameState, target: AssetTarget): boolean {
  return !("index" in target) || (typeof target.identity === "string" && target.identity === placementIdentity(state, target.kind, target.index));
}

export function liftName(lift: LiftSlot, index: number): string {
  return lift.name ?? `${LIFT_LABELS[lift.type]} ${index + 1}`;
}

export function venueName(venue: PlacedAsset): string {
  return venue.name ?? ASSET_CATALOG[venue.id].label;
}

export function lodgeName(state: Pick<GameState, "lodgeTier" | "lodgeName">): string {
  return state.lodgeName ?? LODGE_TIERS[state.lodgeTier].label;
}

export function renameAsset(state: GameState, target: AssetTarget, input: string): GameState {
  if (state.phase !== "day" || typeof input !== "string" || !assetIsPresent(state, target)) return state;
  const name = cleanAssetName(input);
  if (!name) return state;
  if (!("index" in target)) {
    return target.kind === "lodge" && name !== lodgeName(state) ? { ...state, lodgeName: name } : state;
  }
  const { index } = target;
  switch (target.kind) {
    case "venue":
      if (name === venueName(state.assets[index])) return state;
      return { ...state, assets: state.assets.map((venue, i) => i === index ? { ...venue, name } : venue) };
    case "lift":
      if (name === liftName(state.lifts[index], index)) return state;
      return { ...state, lifts: state.lifts.map((lift, i) => i === index ? { ...lift, name } : lift) };
    case "trail":
      if (name === state.trails[index].name) return state;
      return { ...state, trails: state.trails.map((trail, i) => i === index ? { ...trail, name } : trail) };
    case "gun":
      if (name === (state.guns[index].name ?? `Snow gun ${index + 1}`)) return state;
      return { ...state, guns: state.guns.map((gun, i) => i === index ? { ...gun, name } : gun) };
  }
}
