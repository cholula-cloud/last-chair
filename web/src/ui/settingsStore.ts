"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { applyReduceMotionFromSettings, type ReduceMotionPref } from "@/ui/motion";
import type { BuildingStyleId } from "@/game/base";
import { MOUNTAIN_BUILDING_STYLE } from "@/render/layout";

export type GameSpeed = 1 | 2 | 4;
export const SPEEDS: readonly GameSpeed[] = [1, 2, 4];

export const SETTINGS_KEY = "last-chair-settings";

export type Settings = {
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  muted: boolean;
  textSize: "standard" | "large";
  graphicsQuality: "standard" | "low";
  patternAids: boolean;
  voiceVolume: number;
  voiceOn: boolean;
  tips: boolean;
  captions: boolean;
  radioEnabled: boolean;
  reduceMotion: ReduceMotionPref;
  defaultSpeed: GameSpeed;
  /** Village lodge + default new venue look (mountain style when unset). */
  buildingStyle: BuildingStyleId;
};

type SettingsStore = Settings & {
  set: (patch: Partial<Settings>) => void;
};

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 85,
  musicVolume: 55,
  effectsVolume: 75,
  voiceVolume: 80,
  voiceOn: true,
  tips: true,
  muted: false,
  textSize: "standard",
  graphicsQuality: "standard",
  patternAids: true,
  captions: true,
  radioEnabled: true,
  reduceMotion: "system",
  defaultSpeed: 1,
  buildingStyle: MOUNTAIN_BUILDING_STYLE,
};

/** Keeps stored values in range so a hand-edited key cannot break the UI. */
export function cleanSettings(raw: Partial<Record<keyof Settings | "soundOn" | "ambienceVolume", unknown>> | null | undefined): Settings {
  const r = raw ?? {};
  function volume(key: "masterVolume" | "musicVolume" | "effectsVolume" | "voiceVolume") {
    const value = key === "musicVolume" ? r.musicVolume ?? r.ambienceVolume : r[key];
    return typeof value === "number" && Number.isFinite(value)
      ? Math.min(100, Math.max(0, Math.round(value)))
      : DEFAULT_SETTINGS[key];
  }
  const preferredSpeed = r.defaultSpeed === 3 ? 4 : r.defaultSpeed;
  const speed = SPEEDS.find((s) => s === preferredSpeed) ?? DEFAULT_SETTINGS.defaultSpeed;
  return {
    masterVolume: volume("masterVolume"),
    musicVolume: volume("musicVolume"),
    effectsVolume: volume("effectsVolume"),
    voiceVolume: volume("voiceVolume"),
    voiceOn: typeof r.voiceOn === "boolean" ? r.voiceOn : DEFAULT_SETTINGS.voiceOn,
    tips: typeof r.tips === "boolean" ? r.tips : DEFAULT_SETTINGS.tips,
    muted: typeof r.muted === "boolean" ? r.muted : typeof r.soundOn === "boolean" ? !r.soundOn : DEFAULT_SETTINGS.muted,
    textSize: r.textSize === "large" ? "large" : "standard",
    graphicsQuality: r.graphicsQuality === "low" ? "low" : "standard",
    patternAids: typeof r.patternAids === "boolean" ? r.patternAids : DEFAULT_SETTINGS.patternAids,
    radioEnabled: typeof r.radioEnabled === "boolean" ? r.radioEnabled : DEFAULT_SETTINGS.radioEnabled,
    captions: typeof r.captions === "boolean" ? r.captions : DEFAULT_SETTINGS.captions,
    reduceMotion:
      r.reduceMotion === "system" || r.reduceMotion === "on" || r.reduceMotion === "off"
        ? r.reduceMotion
        : r.reduceMotion === true
          ? "on"
          : r.reduceMotion === false
            ? DEFAULT_SETTINGS.reduceMotion
            : DEFAULT_SETTINGS.reduceMotion,
    defaultSpeed: speed,
    buildingStyle:
      r.buildingStyle === "chalet70s" || r.buildingStyle === "1950s-timber"
        ? r.buildingStyle
        : DEFAULT_SETTINGS.buildingStyle,
  };
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set((s) => cleanSettings({ ...s, ...patch })),
    }),
    {
      name: SETTINGS_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => cleanSettings(state),
      merge: (persisted, current) => ({ ...current, ...cleanSettings(persisted as Partial<Settings> | undefined) }),
    },
  ),
);

if (typeof document !== "undefined") {
  function applyDisplay(settings: Settings) {
    document.documentElement.dataset.textSize = settings.textSize;
    document.documentElement.dataset.patternAids = String(settings.patternAids);
    applyReduceMotionFromSettings(settings);
  }
  applyDisplay(useSettings.getState());
  useSettings.subscribe((s, prev) => {
    if (s.reduceMotion !== prev.reduceMotion || s.textSize !== prev.textSize || s.patternAids !== prev.patternAids) applyDisplay(s);
  });
}
