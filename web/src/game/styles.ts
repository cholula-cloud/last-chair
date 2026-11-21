import { DEFAULT_STYLE } from "./base";
import { styledKitName } from "@/render/modelManifest";

export type BuildingStyleId = typeof BUILDING_STYLES[number]["id"];

export const BUILDING_STYLES = [
  { id: "1950s-timber", label: "1950s timber", manifestStyle: null as string | null },
  { id: "chalet70s", label: "1970s chalet", manifestStyle: "chalet70s" },
] as const;

const STYLE_BY_ID = Object.fromEntries(BUILDING_STYLES.map((style) => [style.id, style])) as Record<
  BuildingStyleId,
  (typeof BUILDING_STYLES)[number]
>;

/** Dutch Hill default; later mountains can diverge. */
export const MOUNTAIN_DEFAULT_STYLE: Record<string, BuildingStyleId> = {
  dutch_hill: DEFAULT_STYLE,
};

export function mountainDefaultStyle(mountainId: string): BuildingStyleId {
  return MOUNTAIN_DEFAULT_STYLE[mountainId] ?? DEFAULT_STYLE;
}

/** Legacy saves and tests may use `timber50s`; treat it as the default kit style. */
export function normalizeStyleId(styleId: string): BuildingStyleId {
  if (styleId === "timber50s" || styleId === DEFAULT_STYLE) return DEFAULT_STYLE;
  if (styleId in STYLE_BY_ID) return styleId as BuildingStyleId;
  return DEFAULT_STYLE;
}

export function styleOptions(): readonly (typeof BUILDING_STYLES)[number][] {
  return BUILDING_STYLES;
}

export function manifestStyleFor(styleId: string): string | null {
  return STYLE_BY_ID[normalizeStyleId(styleId)]?.manifestStyle ?? null;
}

export function isKnownStyleId(styleId: string): boolean {
  return styleId === "timber50s" || styleId in STYLE_BY_ID;
}

/** Lodge core uses `lodge-tier-1` as the manifest style-of key (same footprint as `base-lodge`). */
export const LODGE_CORE_STYLE_OF = "lodge-tier-1";

export function resolveStyledKit(styleOf: string, styleId: string): string {
  return styledKitName(styleOf, manifestStyleFor(styleId));
}

export function resolveLodgeCoreKit(styleId: string): string {
  return normalizeStyleId(styleId) === DEFAULT_STYLE
    ? "base-lodge"
    : resolveStyledKit(LODGE_CORE_STYLE_OF, styleId);
}

export function resolveVenueKit(baseKit: string, styleId: string): string {
  return resolveStyledKit(baseKit, styleId);
}