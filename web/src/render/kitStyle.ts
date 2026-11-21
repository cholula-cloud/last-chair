import type { BuildingStyleId } from "@/game/base";
import type { KitAsset } from "./kit";

/** Playable building look families shipped in `web/public/models`. */
export const BUILDING_STYLES = {
  "1950s-timber": { label: "1950s timber", suffix: null },
  chalet70s: { label: "1970s chalet", suffix: "chalet70s" },
} as const satisfies Record<BuildingStyleId, { label: string; suffix: string | null }>;

const LEGACY_STYLE: Record<string, BuildingStyleId> = {
  timber50s: "1950s-timber",
  "1950s-timber": "1950s-timber",
  chalet70s: "chalet70s",
};

export function normalizeStyleId(styleId: string | undefined | null): BuildingStyleId {
  if (!styleId) return "1950s-timber";
  return LEGACY_STYLE[styleId] ?? "1950s-timber";
}

/** GLB stems that exist for the chalet pack (manifest-verified). */
const CHALET_MONOLITH: Record<1 | 2 | 3, KitAsset> = {
  1: "lodge-tier-1-chalet70s",
  2: "lodge-tier-2-chalet70s",
  3: "lodge-tier-3-chalet70s",
};

/** Structural lodge pieces for the active tier and mountain style. */
export function lodgeStructureModelNames(tier: 1 | 2 | 3, styleId: string): KitAsset[] {
  const style = normalizeStyleId(styleId);
  if (style === "chalet70s") return [CHALET_MONOLITH[tier]];
  const kits: KitAsset[] = ["base-lodge"];
  if (tier >= 2) kits.push("lodge-annex-2");
  if (tier >= 3) kits.push("lodge-annex-3");
  return kits;
}

/** Venue / annex kit file stem (falls back to base when no variant file). */
export function resolveStyledModel(base: KitAsset, styleId: string): KitAsset {
  const style = normalizeStyleId(styleId);
  if (!BUILDING_STYLES[style].suffix) return base;
  const candidate = `${base}-${BUILDING_STYLES[style].suffix}` as KitAsset;
  return STYLED_KIT_SET.has(candidate) ? candidate : base;
}

const STYLED_KIT_SET = new Set<string>([
  "lodge-tier-1-chalet70s",
  "lodge-tier-2-chalet70s",
  "lodge-tier-3-chalet70s",
  "lodge-annex-2-chalet70s",
  "lodge-annex-3-chalet70s",
  "cafe-chalet70s",
  "ski-shop-chalet70s",
  "warming-hut-chalet70s",
]);