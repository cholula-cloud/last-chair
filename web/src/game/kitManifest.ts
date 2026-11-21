import manifest from "../../public/models/manifest.json";

export type KitManifestEntry = {
  name: string;
  file: string;
  tris?: number;
  sizeBytes?: number;
  heightMeters?: number;
  footprintMeters?: [number, number];
  split?: string[];
  style?: string;
  styleOf?: string;
  ropeYMeters?: number;
  ropeOffsetXMeters?: number;
  gripHeightMeters?: number;
  tags?: string[];
};

export type KitManifest = {
  version: number;
  units: string;
  upAxis: string;
  front: string;
  draco: boolean;
  assets: KitManifestEntry[];
};

export const KIT_MANIFEST = manifest as KitManifest;
const entries = KIT_MANIFEST.assets;

const BY_NAME = new Map<string, KitManifestEntry>();
for (const entry of entries) BY_NAME.set(entry.name, entry);

/** `manifestStyle:styleOf` → variant asset name (e.g. `chalet70s:lodge-tier-1`). */
const STYLE_LOOKUP = new Map<string, string>();
for (const entry of entries) {
  if (entry.style && entry.styleOf) STYLE_LOOKUP.set(`${entry.style}:${entry.styleOf}`, entry.name);
}

export function manifestEntry(name: string): KitManifestEntry | undefined {
  return BY_NAME.get(name);
}

export function styledKitName(styleOf: string, manifestStyle: string | null): string {
  if (!manifestStyle) return styleOf;
  return STYLE_LOOKUP.get(`${manifestStyle}:${styleOf}`) ?? styleOf;
}

export function kitRopeYMeters(name: string): number | undefined {
  return manifestEntry(name)?.ropeYMeters;
}

export function kitGripHeightMeters(name: string): number | undefined {
  return manifestEntry(name)?.gripHeightMeters;
}

export const KIT_ROPE_Y = {
  tower: kitRopeYMeters("lift-tower") ?? 7.1,
  chairTerminal: kitRopeYMeters("lift-terminal-bottom") ?? 4.3,
  surfaceTerminal: kitRopeYMeters("surface-terminal-bottom") ?? 2.5,
} as const;

export const KIT_GRIP_Y = {
  "t-bar": kitGripHeightMeters("t-bar") ?? 2.31,
  "chair-double": kitGripHeightMeters("chair-double") ?? 2.45,
  platter: kitGripHeightMeters("platter") ?? 2.31,
} as const;