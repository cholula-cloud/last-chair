import { apresRevenueFor } from "./founders";
import { footprintOnLease, OFF_LEASE_MESSAGE } from "./lease";
import { DUTCH_HILL_SITE } from "./mountains/dutchHill.site";
import type { LodgeTier, SiteDef } from "./site";
import { TERRAIN, type Terrain, type XZ } from "./terrain";
import { BUILDING_COSTS, BUILDING_LABELS } from "./types";

export type { LodgeTier } from "./site";
export type LodgeUpgrade = { toTier: 2 | 3; nightsRemaining: number };
export type AssetId =
  | "warming_hut"
  | "cafe"
  | "shop"
  | "snow_guns"
  | "rentals"
  | "ski_school"
  | "tubing_hill"
  | "ice_rink"
  | "apres_bar"
  | "fire_pit"
  | "string_lights";
export type PlacedAsset = { id: AssetId; at: XZ; styleId: string; name?: string; attachPad?: number; purchase?: { day: number; minute: number; price: number } };

type Footprint = { width: number; depth: number };
type Asset = {
  label: string;
  category: "hospitality" | "services" | "infrastructure" | "activity" | "decor";
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
export type BuildingStyleId = "1950s-timber" | "chalet70s";
export const DEFAULT_STYLE: BuildingStyleId = "1950s-timber";
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
    cost: 250, upkeep: 60, effect: {},
    revenuePerUse: 0, visitMinutes: 0, opensAtTier: 2, placementZone: "slope", attachable: false, styleId: DEFAULT_STYLE,
  },
  tubing_hill: {
    label: "Tubing hill", category: "activity", footprint: { width: 1.4, depth: 1.1 },
    cost: 2800, upkeep: 35, effect: { hillValue: 4, arrivalMood: 0.03 },
    revenuePerUse: 12, visitMinutes: 0, opensAtTier: 2, placementZone: "slope", attachable: false, styleId: DEFAULT_STYLE,
  },
  ice_rink: {
    label: "Ice rink", category: "activity", footprint: { width: 2.2, depth: 1.4 },
    cost: 4500, upkeep: 80, effect: { hillValue: 5, arrivalMood: 0.04 },
    revenuePerUse: 9, visitMinutes: 0, opensAtTier: 3, placementZone: "base", attachable: false, styleId: DEFAULT_STYLE,
  },
  apres_bar: {
    label: "Après bar", category: "hospitality", footprint: { width: 1.5, depth: 1.2 },
    cost: 6200, upkeep: 55, effect: { seats: 24, arrivalMood: 0.05, hillValue: 6 },
    revenuePerUse: 14, visitMinutes: 25, opensAtTier: 3, placementZone: "base", attachable: true, styleId: DEFAULT_STYLE,
  },
  fire_pit: {
    label: "Fire pit", category: "decor", footprint: { width: 0.7, depth: 0.7 },
    cost: 450, upkeep: 5, effect: { arrivalMood: 0.02 },
    revenuePerUse: 0, visitMinutes: 0, opensAtTier: 2, placementZone: "base", attachable: false, styleId: DEFAULT_STYLE,
  },
  string_lights: {
    label: "String lights", category: "decor", footprint: { width: 2.4, depth: 0.35 },
    cost: 320, upkeep: 8, effect: { arrivalMood: 0.015 },
    revenuePerUse: 0, visitMinutes: 0, opensAtTier: 2, placementZone: "base", attachable: false, styleId: DEFAULT_STYLE,
  },
};

export const LODGE_FOOTPRINT: Footprint = DUTCH_HILL_SITE.buildings.lodge.footprint;
const TERMINAL_FOOTPRINT: Footprint = { width: 0.9, depth: 0.9 };
const TERMINAL_CLEARANCE = 0.08;
export const LODGE_TIERS = {
  1: { label: "Base Lodge", cost: 0, stalls: 30, pads: 0 },
  2: { label: "Village Lodge", cost: 3500, stalls: 50, pads: 1 },
  3: { label: "Grand Lodge", cost: 9000, stalls: 80, pads: 2 },
} as const;

export function nextLodgeTier(tier: LodgeTier): 2 | 3 | null {
  if (tier === 1) return 2;
  if (tier === 2) return 3;
  return null;
}

export function lodgeTierUnlocks(tier: LodgeTier): string[] {
  const assets = (Object.entries(ASSET_CATALOG) as [AssetId, Asset][])
    .filter(([id, asset]) => asset.opensAtTier === tier && id !== "snow_guns");
  const labels = assets.map(([, asset]) => asset.label);
  if (tier === CHAIR_TIER) labels.unshift("Double chair");
  if (tier === 2) labels.push("Snow guns");
  return labels;
}

export function advanceLodgeUpgrade(upgrade: LodgeUpgrade): LodgeUpgrade | null {
  if (upgrade.nightsRemaining <= 1) return null;
  return { ...upgrade, nightsRemaining: upgrade.nightsRemaining - 1 };
}

/** Full annex ring around the lodge; not every slot clears the warming hut or east wing. */
const LODGE_PAD_SITES: XZ[] = (() => {
  const { x, z } = DUTCH_HILL_SITE.buildings.lodge;
  return [
    { x: x - 1.12, z: z - 0.63 },
    { x: x + 1.12, z: z - 0.20 },
    { x: x - 1.12, z: z + 0.65 },
    { x: x + 1.12, z: z + 0.85 },
    { x: x - 0.55, z: z - 1.5 },
    { x: x + 0.55, z: z - 1.5 },
  ];
})();

/** One attach pad unlocks at Tier 2, a second at Tier 3 (east front, then west side). */
const LODGE_PAD_SLOTS_BY_TIER: Record<LodgeTier, number[]> = {
  1: [],
  2: [1],
  3: [1, 2],
};

export function lodgeAttachPads(tier: LodgeTier, site: SiteDef = DUTCH_HILL_SITE): XZ[] {
  if (site === DUTCH_HILL_SITE) {
    return LODGE_PAD_SLOTS_BY_TIER[tier].map((index) => LODGE_PAD_SITES[index]);
  }
  const { x, z } = site.buildings.lodge;
  const sites = [
    { x: x - 1.12, z: z - 0.63 },
    { x: x + 1.12, z: z - 0.20 },
    { x: x - 1.12, z: z + 0.65 },
    { x: x + 1.12, z: z + 0.85 },
    { x: x - 0.55, z: z - 1.5 },
    { x: x + 0.55, z: z - 1.5 },
  ];
  return LODGE_PAD_SLOTS_BY_TIER[tier].map((index) => sites[index]);
}

/** Parking grows south of the original lot (across the road side) without moving the road crossing. */
export function lodgeParkingLots(tier: LodgeTier, site: SiteDef = DUTCH_HILL_SITE) {
  const arrival = site.arrival;
  const lots = [{ center: arrival.center, size: arrival.size, stalls: arrival.stalls }];
  let southEdge = arrival.center.z + arrival.size.d / 2;
  for (const next of [2, 3] as const) {
    if (next > tier) break;
    const previous = next === 2 ? arrival.stalls : LODGE_TIERS[2].stalls;
    const stalls = LODGE_TIERS[next].stalls - previous;
    if (stalls <= 0) continue;
    const z = southEdge + 0.2 + arrival.size.d / 2;
    lots.push({
      center: { x: arrival.center.x, z },
      size: { w: arrival.size.w, d: arrival.size.d },
      stalls,
    });
    southEdge = z + arrival.size.d / 2;
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

export function previewSlopeAssetPlacement(
  id: AssetId,
  at: XZ,
  tier: LodgeTier,
  assets: readonly PlacedAsset[],
  options: { terrain?: Terrain } = {},
): AssetPreview {
  const terrain = options.terrain ?? TERRAIN;
  const asset = ASSET_CATALOG[id];
  if (!asset || asset.placementZone !== "slope") return { ok: false, reason: "That asset belongs in the base area." };
  if (tier < asset.opensAtTier) return { ok: false, reason: `Needs Lodge Tier ${asset.opensAtTier} first.` };
  if (assets.length >= MAX_BASE_ASSETS) return { ok: false, reason: "The base area’s full. Move or remove something first." };
  if (!Number.isFinite(at.x) || !Number.isFinite(at.z)) return { ok: false, reason: "Pick a spot on the hill." };
  const position = at;
  const size = asset.footprint;
  if (!footprintOnLease(position, size.width, size.depth, terrain)) return { ok: false, reason: OFF_LEASE_MESSAGE };
  if (terrain.grade(position.x, position.z) > 0.42) {
    return { ok: false, reason: "Tubing needs a gentle slope. Try a mellower pitch." };
  }
  if (assets.some((placed) => overlaps(position, size, placed.at, ASSET_CATALOG[placed.id].footprint, 0.12))) {
    return { ok: false, reason: "Too close to another building. Leave some elbow room." };
  }
  const placement: PlacedAsset = { id, at: { ...position }, styleId: asset.styleId };
  const acres = size.width * size.depth * terrain.horizontalFeetPerUnit ** 2 / 43560;
  return { ok: true, placement, cost: asset.cost, acres, attached: false };
}

export function previewAssetPlacement(
  id: AssetId,
  at: XZ,
  tier: LodgeTier,
  assets: readonly PlacedAsset[],
  options: { site?: SiteDef; terrain?: Terrain; terminals?: readonly XZ[]; defaultStyleId?: string } = {},
): AssetPreview {
  if (id === "snow_guns") return { ok: false, reason: "Place snow guns from the Snow section." };
  const asset = ASSET_CATALOG[id];
  if (asset?.placementZone === "slope") return previewSlopeAssetPlacement(id, at, tier, assets, options);
  const { site = DUTCH_HILL_SITE, terrain = TERRAIN, terminals = [terrain.base] } = options;
  if (!asset || asset.placementZone !== "base") return { ok: false, reason: "That one goes up on the hill, not at the base." };
  if (tier < asset.opensAtTier) return { ok: false, reason: `Needs Lodge Tier ${asset.opensAtTier} first.` };
  if (assets.length >= MAX_BASE_ASSETS) return { ok: false, reason: "The base area’s full. Move or remove something first." };
  if (!Number.isFinite(at.x) || !Number.isFinite(at.z)) return { ok: false, reason: "Pick a spot in the base area." };

  const padLocations = lodgeAttachPads(tier, site).map((point, index) => ({
    point, index, distance: Math.hypot(at.x - point.x, at.z - point.z),
  }));
  const snap = asset.attachable
    ? padLocations.filter(({ distance }) => distance <= 0.32).sort((a, b) => a.distance - b.distance)[0]
    : undefined;
  const position = snap?.point ?? at;
  const size = asset.footprint;
  if (!footprintOnLease(position, size.width, size.depth, terrain)) return { ok: false, reason: OFF_LEASE_MESSAGE };
  if (snap && assets.some((placed) => placed.attachPad === snap.index)) {
    return { ok: false, reason: "Another venue already has that lodge pad. Try a different pad." };
  }
  if (!inBaseZone(position, size, site, terrain)) {
    return { ok: false, reason: "Venues need flat ground. Try a flatter spot near the lodge." };
  }
  if (!snap) {
    if (overlaps(position, size, site.buildings.lodge, site.buildings.lodge.footprint, 0.1)
      || assets.some((placed) => overlaps(position, size, placed.at, ASSET_CATALOG[placed.id].footprint, 0.08))) {
      return { ok: false, reason: "Too close to another building. Leave some elbow room." };
    }
  }
  if (lodgeParkingLots(3, site).some((lot) =>
    overlaps(position, size, lot.center, { width: lot.size.w, depth: lot.size.d }, 0.3))
      || overlaps(position, size, site.buildings.snowcat, { width: 0.6, depth: 0.45 }, 0.1)) {
    return { ok: false, reason: "That’s the parking lot and snowcat’s turf. Pick another spot." };
  }
  if (terminals.some((terminal) => overlapsTerminal(position, size, terminal))) {
    return { ok: false, reason: "Too close to the lift terminal. Give it some room." };
  }
  const walkingClearance = Math.max(size.width, size.depth) / 2 + 0.12;
  const paths = [...site.paths.map((path) => path.points), site.road.spur];
  if (paths.some((points) => points.slice(1).some((point, i) =>
    segmentDistance(position, points[i], point) < walkingClearance))) {
    return { ok: false, reason: "That blocks the path. Pick a spot beside it." };
  }

  const acres = size.width * size.depth * terrain.horizontalFeetPerUnit ** 2 / 43560;
  const placement: PlacedAsset = { id, at: { ...position }, styleId: options.defaultStyleId ?? asset.styleId };
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

export function assetRevenue(asset: PlacedAsset, founder?: import("./types").FounderId | null): number {
  return apresRevenueFor(founder ?? null, ASSET_CATALOG[asset.id].revenuePerUse * assetMultiplier(asset));
}
