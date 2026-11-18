import { DUTCH_HILL_SITE } from "./mountains/dutchHill.site";
import type { LodgeTier, SiteDef } from "./site";
import { TERRAIN, type Terrain, type XZ } from "./terrain";
import { BUILDING_COSTS, BUILDING_LABELS } from "./types";

export type { LodgeTier } from "./site";
export type LodgeUpgrade = { toTier: 2 | 3; nightsRemaining: number };
export type AssetId = "warming_hut" | "cafe" | "shop" | "snow_guns" | "rentals" | "ski_school";
export type PlacedAsset = { id: AssetId; at: XZ; styleId: string; attachPad?: number };

type Footprint = { width: number; depth: number };
type Asset = {
  label: string;
  category: "hospitality" | "services" | "infrastructure";
  footprint: Footprint;
  cost: number;
  upkeep: number;
  effect: { seats?: number; arrivalMood?: number; hillValue?: number };
  revenuePerUse: number;
  visitMinutes: number;
  opensAtTier: LodgeTier;
  placementZone: "base" | "slope";
  attachable: boolean;
  styleId: string;
};

export const ATTACH_BONUS = 0.05;
export const MAX_BASE_ASSETS = 12;
export const DEFAULT_STYLE = "1950s-timber";
export const CHAIR_TIER = 2;
export const ASSET_CATALOG: Record<AssetId, Asset> = {
  warming_hut: {
    label: BUILDING_LABELS.warming_hut, category: "hospitality", footprint: { width: 0.65, depth: 0.55 },
    cost: 350, upkeep: 0, effect: { seats: 12, arrivalMood: 0.05 },
    revenuePerUse: 2, visitMinutes: 20, opensAtTier: 1, placementZone: "base", attachable: true, styleId: DEFAULT_STYLE,
  },
  cafe: {
    label: BUILDING_LABELS.cafe, category: "hospitality", footprint: { width: 0.9, depth: 0.65 },
    cost: BUILDING_COSTS.cafe, upkeep: 40, effect: { seats: 12, arrivalMood: 0.04, hillValue: 3 },
    revenuePerUse: 9, visitMinutes: 20, opensAtTier: 1, placementZone: "base", attachable: true, styleId: DEFAULT_STYLE,
  },
  shop: {
    label: BUILDING_LABELS.shop, category: "services", footprint: { width: 0.8, depth: 0.6 },
    cost: BUILDING_COSTS.shop, upkeep: 25, effect: {},
    revenuePerUse: 5, visitMinutes: 0, opensAtTier: 1, placementZone: "base", attachable: true, styleId: DEFAULT_STYLE,
  },
  rentals: {
    label: "Rentals", category: "services", footprint: { width: 0.8, depth: 0.6 },
    cost: 1000, upkeep: 20, effect: { seats: 6, hillValue: 1 },
    revenuePerUse: 12, visitMinutes: 5, opensAtTier: 2, placementZone: "base", attachable: true, styleId: DEFAULT_STYLE,
  },
  ski_school: {
    label: "Ski school desk", category: "services", footprint: { width: 0.7, depth: 0.6 },
    cost: 1400, upkeep: 25, effect: { seats: 8, hillValue: 2 },
    revenuePerUse: 18, visitMinutes: 25, opensAtTier: 2, placementZone: "base", attachable: true, styleId: DEFAULT_STYLE,
  },
  snow_guns: {
    label: "Snow gun", category: "infrastructure", footprint: { width: 0.25, depth: 0.25 },
    cost: 400, upkeep: 40, effect: {},
    revenuePerUse: 0, visitMinutes: 0, opensAtTier: 2, placementZone: "slope", attachable: false, styleId: DEFAULT_STYLE,
  },
};

export const LODGE_FOOTPRINT: Footprint = DUTCH_HILL_SITE.buildings.lodge.footprint;
const TERMINAL_FOOTPRINT: Footprint = { width: 0.9, depth: 0.9 };
const TERMINAL_CLEARANCE = 0.08;
export const LODGE_TIERS = {
  1: { label: "Base Lodge", cost: 0, stalls: 30, pads: 2 },
  2: { label: "Village Lodge", cost: 3500, stalls: 50, pads: 4 },
  3: { label: "Grand Lodge", cost: 9000, stalls: 80, pads: 6 },
} as const;

export function nextLodgeTier(tier: LodgeTier): 2 | 3 | null {
  if (tier === 1) return 2;
  if (tier === 2) return 3;
  return null;
}

export function lodgeTierUnlocks(tier: LodgeTier): string[] {
  const assets = Object.values(ASSET_CATALOG).filter((asset) => asset.opensAtTier === tier);
  const labels = assets.map((asset) => asset.label);
  if (tier === CHAIR_TIER) labels.unshift("Double chair");
  return labels;
}

export function advanceLodgeUpgrade(upgrade: LodgeUpgrade): LodgeUpgrade | null {
  if (upgrade.nightsRemaining <= 1) return null;
  return { ...upgrade, nightsRemaining: upgrade.nightsRemaining - 1 };
}

export function lodgeAttachPads(tier: LodgeTier, site: SiteDef = DUTCH_HILL_SITE): XZ[] {
  const { x, z } = site.buildings.lodge;
  return [
    { x: x - 1.12, z: z - 0.63 },
    { x: x + 1.12, z: z - 0.20 },
    { x: x - 1.12, z: z + 0.65 },
    { x: x + 1.12, z: z + 0.85 },
    { x: x - 0.55, z: z - 1.5 },
    { x: x + 0.55, z: z - 1.5 },
  ].slice(0, LODGE_TIERS[tier].pads);
}

/** Parking grows east of the original lot without moving the existing stalls or spur. */
export function lodgeParkingLots(tier: LodgeTier, site: SiteDef = DUTCH_HILL_SITE) {
  const arrival = site.arrival;
  const pitch = arrival.size.w / (arrival.stalls / arrival.rows);
  const lots = [{ center: arrival.center, size: arrival.size, stalls: arrival.stalls }];
  let edge = arrival.center.x + arrival.size.w / 2;
  for (const next of [2, 3] as const) {
    if (next > tier) break;
    const previous = next === 2 ? arrival.stalls : LODGE_TIERS[2].stalls;
    const stalls = LODGE_TIERS[next].stalls - previous;
    if (stalls <= 0) continue;
    const w = pitch * Math.ceil(stalls / arrival.rows);
    const x = edge + 0.2 + w / 2;
    lots.push({ center: { x, z: arrival.center.z }, size: { w, d: arrival.size.d }, stalls });
    edge = x + w / 2;
  }
  return lots;
}

function overlaps(at: XZ, size: Footprint, other: XZ, otherSize: Footprint, margin = 0): boolean {
  return Math.abs(at.x - other.x) < (size.width + otherSize.width) / 2 + margin
    && Math.abs(at.z - other.z) < (size.depth + otherSize.depth) / 2 + margin;
}

function overlapsTerminal(at: XZ, size: Footprint, terminal: XZ): boolean {
  return overlaps(at, size, terminal, TERMINAL_FOOTPRINT, TERMINAL_CLEARANCE);
}

/** A lift and a base building require the same clearance in either build order. */
export function terminalOverlapsBuilding(
  terminal: XZ,
  assets: readonly PlacedAsset[],
  site: SiteDef = DUTCH_HILL_SITE,
): boolean {
  return overlapsTerminal(site.buildings.lodge, site.buildings.lodge.footprint, terminal)
    || assets.some((asset) => overlapsTerminal(asset.at, ASSET_CATALOG[asset.id].footprint, terminal));
}

function segmentDistance(point: XZ, from: XZ, to: XZ): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const lengthSquared = dx * dx + dz * dz;
  const fraction = lengthSquared === 0 ? 0
    : Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.z - from.z) * dz) / lengthSquared));
  return Math.hypot(point.x - from.x - fraction * dx, point.z - from.z - fraction * dz);
}

function inBaseZone(at: XZ, size: Footprint, site: SiteDef, terrain: Terrain): boolean {
  const { lodge } = site.buildings;
  return Math.abs(at.x - lodge.x) + size.width / 2 <= 9
    && lodge.z - at.z + size.depth / 2 <= 2.1
    && at.z + size.depth / 2 <= site.road.z - 0.8
    && terrain.grade(at.x, at.z) <= 0.3;
}

type AssetPreview =
  | { ok: true; placement: PlacedAsset; cost: number; acres: number; attached: boolean }
  | { ok: false; reason: string };

export function previewAssetPlacement(
  id: AssetId,
  at: XZ,
  tier: LodgeTier,
  assets: readonly PlacedAsset[],
  options: { site?: SiteDef; terrain?: Terrain; terminals?: readonly XZ[] } = {},
): AssetPreview {
  const { site = DUTCH_HILL_SITE, terrain = TERRAIN, terminals = [terrain.base] } = options;
  const asset = ASSET_CATALOG[id];
  if (!asset || asset.placementZone !== "base") return { ok: false, reason: "This item is placed on the hill." };
  if (tier < asset.opensAtTier) return { ok: false, reason: `Opens at Lodge Tier ${asset.opensAtTier}.` };
  if (assets.length >= MAX_BASE_ASSETS) return { ok: false, reason: "The base area is full." };
  if (!Number.isFinite(at.x) || !Number.isFinite(at.z)) return { ok: false, reason: "Pick a spot in the base area." };

  const padLocations = lodgeAttachPads(tier, site).map((point, index) => ({
    point, index, distance: Math.hypot(at.x - point.x, at.z - point.z),
  }));
  const snap = asset.attachable
    ? padLocations.filter(({ distance }) => distance <= 0.32).sort((a, b) => a.distance - b.distance)[0]
    : undefined;
  const position = snap?.point ?? at;
  const size = asset.footprint;
  if (snap && assets.some((placed) => placed.attachPad === snap.index)) {
    return { ok: false, reason: "That lodge pad is occupied." };
  }
  if (!inBaseZone(position, size, site, terrain)) {
    return { ok: false, reason: "Pick flat ground in the base area." };
  }
  if ((!snap && overlaps(position, size, site.buildings.lodge, site.buildings.lodge.footprint, 0.1))
    || assets.some((placed) => overlaps(position, size, placed.at, ASSET_CATALOG[placed.id].footprint, 0.08))) {
    return { ok: false, reason: "Leave room around other buildings." };
  }
  if (lodgeParkingLots(3, site).some((lot) =>
    overlaps(position, size, lot.center, { width: lot.size.w, depth: lot.size.d }, 0.3))
      || overlaps(position, size, site.buildings.snowcat, { width: 0.6, depth: 0.45 }, 0.1)) {
    return { ok: false, reason: "Leave the parking lot and snowcat clear." };
  }
  if (terminals.some((terminal) => overlapsTerminal(position, size, terminal))) {
    return { ok: false, reason: "Leave room around the lift terminal." };
  }
  const walkingClearance = Math.max(size.width, size.depth) / 2 + 0.12;
  const paths = [...site.paths.map((path) => path.points), site.road.spur];
  if (paths.some((points) => points.slice(1).some((point, i) =>
    segmentDistance(position, points[i], point) < walkingClearance))) {
    return { ok: false, reason: "Leave room on the path." };
  }

  const acres = size.width * size.depth * terrain.horizontalFeetPerUnit ** 2 / 43560;
  const placement: PlacedAsset = { id, at: { ...position }, styleId: asset.styleId };
  if (snap) placement.attachPad = snap.index;
  return { ok: true, placement, cost: asset.cost, acres, attached: snap !== undefined };
}

const LEGACY_LOCATIONS = {
  warming_hut: "warmingHut",
  cafe: "cafe",
  shop: "shop",
} as const;

/** Old lodge purchases collapse into the fixed lodge. The snow gun migration is separate. */
export function placedAssetsFromLegacy(
  buildings: readonly string[],
  site: SiteDef = DUTCH_HILL_SITE,
): PlacedAsset[] {
  const placed: PlacedAsset[] = [];
  for (const id of buildings) {
    if (id !== "warming_hut" && id !== "cafe" && id !== "shop") continue;
    if (placed.some((asset) => asset.id === id)) continue;
    const at = site.buildings[LEGACY_LOCATIONS[id]];
    placed.push({ id, at: { ...at }, styleId: ASSET_CATALOG[id].styleId });
  }
  return placed;
}

export function freshBaseAssets(): PlacedAsset[] {
  return placedAssetsFromLegacy(["warming_hut"]);
}

export function assetMultiplier(asset: PlacedAsset): number {
  return asset.attachPad === undefined ? 1 : 1 + ATTACH_BONUS;
}

export function assetEffect(asset: PlacedAsset, key: keyof Asset["effect"]): number {
  return (ASSET_CATALOG[asset.id].effect[key] ?? 0) * assetMultiplier(asset);
}

export function assetRevenue(asset: PlacedAsset): number {
  return ASSET_CATALOG[asset.id].revenuePerUse * assetMultiplier(asset);
}
