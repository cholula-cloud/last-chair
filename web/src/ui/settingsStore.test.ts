import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, cleanSettings } from "./settingsStore";

describe("cleanSettings", () => {
  it("keeps valid values", () => {
    const s = { muted: true, masterVolume: 50, effectsVolume: 10, musicVolume: 0, graphicsQuality: "low", textSize: "large", patternAids: false, tips: false, voiceOn: false, radioEnabled: false, voiceVolume: 35, captions: false, reduceMotion: true, defaultSpeed: 4 as const };
    expect(cleanSettings(s)).toEqual({ ...DEFAULT_SETTINGS, ...s });
  });

  it("preserves the fastest setting from older winters", () => {
    expect(cleanSettings({ defaultSpeed: 3 }).defaultSpeed).toBe(4);
  });

  it("falls back to defaults and clamps out-of-range values", () => {
    expect(cleanSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(cleanSettings({ voiceVolume: 400, captions: "yes", defaultSpeed: 9 })).toEqual({ ...DEFAULT_SETTINGS, voiceVolume: 100 });
    expect(cleanSettings({ voiceVolume: -5 }).voiceVolume).toBe(0);
  });
});
