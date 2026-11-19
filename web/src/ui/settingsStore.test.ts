import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, cleanSettings } from "./settingsStore";

describe("cleanSettings", () => {
  it("keeps valid values", () => {
    const s = { soundOn: false, masterVolume: 40, effectsVolume: 10, ambienceVolume: 0, voiceVolume: 35, voiceOn: false, tips: false, captions: false, reduceMotion: true, defaultSpeed: 3 as const };
    expect(cleanSettings(s)).toEqual(s);
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
    expect(s.soundOn).toBe(true);
    expect(s.masterVolume).toBe(DEFAULT_SETTINGS.masterVolume);
    expect(s.effectsVolume).toBe(DEFAULT_SETTINGS.effectsVolume);
    expect(s.ambienceVolume).toBe(DEFAULT_SETTINGS.ambienceVolume);
  });

  it("clamps the new volumes", () => {
    const s = cleanSettings({ masterVolume: 900, effectsVolume: -1, ambienceVolume: Number.NaN });
    expect([s.masterVolume, s.effectsVolume, s.ambienceVolume]).toEqual([100, 0, DEFAULT_SETTINGS.ambienceVolume]);
  });
});
