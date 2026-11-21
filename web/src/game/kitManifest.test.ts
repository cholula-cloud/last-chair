import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KIT_GRIP_Y, KIT_MANIFEST, KIT_ROPE_Y, manifestEntry } from "./kitManifest";
import { KIT_ASSETS } from "@/render/kit";

describe("kitManifest", () => {
  const models = path.join(process.cwd(), "public", "models");

  it("every KIT_ASSETS name exists in the manifest with a file on disk", () => {
    for (const name of KIT_ASSETS) {
      const entry = manifestEntry(name);
      expect(entry, name).toBeDefined();
      expect(fs.existsSync(path.join(models, entry!.file))).toBe(true);
    }
  });

  it("rope and grip fallbacks match legacy lift constants", () => {
    expect(KIT_ROPE_Y.tower).toBeCloseTo(7.1, 1);
    expect(KIT_ROPE_Y.chairTerminal).toBeCloseTo(4.3, 1);
    expect(KIT_ROPE_Y.surfaceTerminal).toBeCloseTo(2.5, 1);
    expect(KIT_GRIP_Y["t-bar"]).toBeCloseTo(2.31, 2);
    expect(KIT_GRIP_Y["chair-double"]).toBeCloseTo(2.45, 2);
  });

  it("manifest is v2 with assets", () => {
    expect(KIT_MANIFEST.version).toBeGreaterThanOrEqual(2);
    expect(KIT_MANIFEST.assets.length).toBeGreaterThan(40);
  });
});