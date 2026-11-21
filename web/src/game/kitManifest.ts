import manifest from "../../public/models/manifest.json";

export type ModelManifestEntry = {
  name: string;
  file: string;
  style?: string;
  styleOf?: string;
};

type ManifestFile = { assets: ModelManifestEntry[] };

const entries = (manifest as ManifestFile).assets;

/** `manifestStyle:styleOf` → variant asset name (e.g. `chalet70s:lodge-tier-1`). */
const STYLE_LOOKUP = new Map<string, string>();
for (const entry of entries) {
  if (entry.style && entry.styleOf) STYLE_LOOKUP.set(`${entry.style}:${entry.styleOf}`, entry.name);
}

/** Resolve a base kit name plus manifest style slug to the on-disk GLB stem. */
export function styledKitName(styleOf: string, manifestStyle: string | null): string {
  if (!manifestStyle) return styleOf;
  return STYLE_LOOKUP.get(`${manifestStyle}:${styleOf}`) ?? styleOf;
}