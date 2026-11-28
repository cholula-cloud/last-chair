import raw from "../../public/audio/audio-manifest.json";
import type { BedMood, SoundId } from "./synth";

export type ManifestEntry = {
  id: string;
  file?: string;
  /** Encoded file size. Zero reserves a filename for a clip that has yet to be shipped. */
  bytes: number;
  loop?: boolean;
  loopStart?: number;
  loopEnd?: number;
  license: string;
  source: string;
  author?: string;
};

export type AudioManifest = {
  version: number;
  provider?: string;
  sounds: ManifestEntry[];
};

export const AUDIO_MANIFEST = raw as AudioManifest;

export const EFFECT_MANIFEST_ID: Partial<Record<SoundId, string>> = {
  tap: "ui-tap",
  thunk: "build-place",
  sting: "radio-sting",
  chime: "cash-in",
  dial: "radio-dial",
};

export const BED_MANIFEST_ID: Record<BedMood, string> = {
  day: "bed-day",
  night: "bed-night",
};

export const MAX_AUDIO_BYTES = 2_200_000;

const byId = new Map(AUDIO_MANIFEST.sounds.map((entry) => [entry.id, entry]));

export function manifestEntry(id: string): ManifestEntry | undefined {
  return byId.get(id);
}

export function validateManifest(manifest: AudioManifest = AUDIO_MANIFEST): void {
  const ids = new Set<string>();
  for (const entry of manifest.sounds) {
    if (ids.has(entry.id)) throw new Error(`duplicate manifest id ${entry.id}`);
    ids.add(entry.id);
    if (!entry.license?.trim()) throw new Error(`manifest ${entry.id} missing license`);
    if (!entry.source?.trim()) throw new Error(`manifest ${entry.id} missing source`);
    if (!Number.isFinite(entry.bytes) || entry.bytes < 0) throw new Error(`manifest ${entry.id} invalid bytes`);
  }
  for (const id of Object.values(EFFECT_MANIFEST_ID)) {
    if (!ids.has(id)) throw new Error(`manifest missing effect ${id}`);
  }
  for (const id of Object.values(BED_MANIFEST_ID)) {
    if (!ids.has(id)) throw new Error(`manifest missing bed ${id}`);
  }
  const total = manifest.sounds.reduce((sum, entry) => sum + entry.bytes, 0);
  if (total > MAX_AUDIO_BYTES) throw new Error(`manifest total ${total} exceeds ${MAX_AUDIO_BYTES}`);
}
