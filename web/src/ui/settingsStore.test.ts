import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, cleanSettings } from "./settingsStore";

describe("cleanSettings", () => {
  it("keeps valid values", () => {
    const s = { voiceVolume: 35, voiceOn: false, tips: false, captions: false, reduceMotion: true, defaultSpeed: 3 as const };
    expect(cleanSettings(s)).toEqual(s);
  });

  it("falls back to defaults and clamps out-of-range values", () => {
    expect(cleanSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(cleanSettings({ voiceVolume: 400, captions: "yes", defaultSpeed: 9 })).toEqual({ ...DEFAULT_SETTINGS, voiceVolume: 100 });
    expect(cleanSettings({ voiceVolume: -5 }).voiceVolume).toBe(0);
  });
});
