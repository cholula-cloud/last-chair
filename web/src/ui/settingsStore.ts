"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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
  captions: boolean;
  radioEnabled: boolean;
  reduceMotion: boolean;
  defaultSpeed: GameSpeed;
};

type SettingsStore = Settings & {
  set: (patch: Partial<Settings>) => void;
};

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 85,
  musicVolume: 55,
  effectsVolume: 75,
  voiceVolume: 80,
  muted: false,
  textSize: "standard",
  graphicsQuality: "standard",
  patternAids: true,
  captions: true,
  radioEnabled: true,
  reduceMotion: false,
  defaultSpeed: 1,
};

/** Keeps stored values in range so a hand-edited key cannot break the UI. */
export function cleanSettings(raw: Partial<Record<keyof Settings, unknown>> | null | undefined): Settings {
  const r = raw ?? {};
  function volume(key: "masterVolume" | "musicVolume" | "effectsVolume" | "voiceVolume") {
    const value = r[key];
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
    muted: typeof r.muted === "boolean" ? r.muted : DEFAULT_SETTINGS.muted,
    textSize: r.textSize === "large" ? "large" : "standard",
    graphicsQuality: r.graphicsQuality === "low" ? "low" : "standard",
    patternAids: typeof r.patternAids === "boolean" ? r.patternAids : DEFAULT_SETTINGS.patternAids,
    radioEnabled: typeof r.radioEnabled === "boolean" ? r.radioEnabled : DEFAULT_SETTINGS.radioEnabled,
    captions: typeof r.captions === "boolean" ? r.captions : DEFAULT_SETTINGS.captions,
    reduceMotion: typeof r.reduceMotion === "boolean" ? r.reduceMotion : DEFAULT_SETTINGS.reduceMotion,
    defaultSpeed: speed,
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

/** Mirrors reduce motion onto the page root so styles can react to it. */
export function applyReduceMotion(on: boolean): void {
  if (typeof document !== "undefined") document.documentElement.dataset.reduceMotion = String(on);
}

if (typeof document !== "undefined") {
  function applyDisplay(settings: Settings) {
    document.documentElement.dataset.textSize = settings.textSize;
    document.documentElement.dataset.patternAids = String(settings.patternAids);
    applyReduceMotion(settings.reduceMotion);
  }
  applyDisplay(useSettings.getState());
  useSettings.subscribe((s, prev) => {
    if (s.reduceMotion !== prev.reduceMotion || s.textSize !== prev.textSize || s.patternAids !== prev.patternAids) applyDisplay(s);
  });
}
