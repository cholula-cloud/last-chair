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

  it("fills the sound settings for a save written before they existed", () => {
    const old = { voiceVolume: 60, voiceOn: false, tips: true, captions: true, reduceMotion: false, defaultSpeed: 2 };
    const s = cleanSettings(old);
    expect(s.voiceVolume).toBe(60);
    expect(s.voiceOn).toBe(false);
    expect(s.muted).toBe(false);
    expect(s.masterVolume).toBe(DEFAULT_SETTINGS.masterVolume);
    expect(s.effectsVolume).toBe(DEFAULT_SETTINGS.effectsVolume);
    expect(s.musicVolume).toBe(DEFAULT_SETTINGS.musicVolume);
  });

  it("restores preferences from the ambience and sound switch settings", () => {
    expect(cleanSettings({ soundOn: false, ambienceVolume: 35 })).toMatchObject({ muted: true, musicVolume: 35 });
  });

  it("clamps the new volumes", () => {
    const s = cleanSettings({ masterVolume: 900, effectsVolume: -1, ambienceVolume: Number.NaN });
    expect([s.masterVolume, s.effectsVolume, s.musicVolume]).toEqual([100, 0, DEFAULT_SETTINGS.musicVolume]);
  });
});
