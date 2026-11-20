import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AUDIO_MANIFEST, BED_MANIFEST_ID, EFFECT_MANIFEST_ID, MAX_AUDIO_BYTES, validateManifest, type ManifestEntry } from "./manifest";

const PUBLIC_AUDIO = join(process.cwd(), "public/audio");

describe("audio manifest", () => {
  it("validates licence fields and mapped ids", () => {
    expect(() => validateManifest()).not.toThrow();
  });

  it("matches the checked-in JSON file", () => {
    const disk = JSON.parse(readFileSync(join(PUBLIC_AUDIO, "audio-manifest.json"), "utf8"));
    expect(disk.version).toBe(AUDIO_MANIFEST.version);
    expect(disk.sounds).toHaveLength(AUDIO_MANIFEST.sounds.length);
  });

  it("keeps total declared bytes under the PR 32 budget", () => {
    const total = AUDIO_MANIFEST.sounds.reduce((sum, entry) => sum + entry.bytes, 0);
    expect(total).toBeLessThanOrEqual(MAX_AUDIO_BYTES);
  });

  it("records on-disk size when a clip is present", () => {
    for (const entry of AUDIO_MANIFEST.sounds as ManifestEntry[]) {
      if (!entry.file) continue;
      const path = join(PUBLIC_AUDIO, entry.file);
      try {
        const bytes = statSync(path).size;
        if (entry.bytes > 0) expect(bytes).toBe(entry.bytes);
        expect(bytes).toBeLessThanOrEqual(MAX_AUDIO_BYTES);
      } catch {
        expect(entry.bytes).toBe(0);
      }
    }
  });

  it("lists every wired game sound", () => {
    const ids = new Set(AUDIO_MANIFEST.sounds.map((s) => s.id));
    for (const id of Object.values(EFFECT_MANIFEST_ID)) expect(ids.has(id)).toBe(true);
    for (const id of Object.values(BED_MANIFEST_ID)) expect(ids.has(id)).toBe(true);
  });
});
