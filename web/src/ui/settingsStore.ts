"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type GameSpeed = 1 | 2 | 3;
export const SPEEDS: readonly GameSpeed[] = [1, 2, 3];

export const SETTINGS_KEY = "last-chair-settings";

export type Settings = {
  /** 0 to 100. Volume of the voice-over. */
  voiceVolume: number;
  /** Voice-over on or off. Captions stay on either way. */
  voiceOn: boolean;
  /** Coach tips during the first winter. */
  tips: boolean;
  captions: boolean;
  reduceMotion: boolean;
  defaultSpeed: GameSpeed;
};

type SettingsStore = Settings & {
  set: (patch: Partial<Settings>) => void;
};

export const DEFAULT_SETTINGS: Settings = {
  voiceVolume: 80,
  voiceOn: true,
  tips: true,
  captions: true,
  reduceMotion: false,
  defaultSpeed: 1,
};

/** Keeps stored values in range so a hand-edited key cannot break the UI. */
export function cleanSettings(raw: Partial<Record<keyof Settings, unknown>> | null | undefined): Settings {
  const r = raw ?? {};
  const volume = typeof r.voiceVolume === "number" && Number.isFinite(r.voiceVolume)
    ? Math.min(100, Math.max(0, Math.round(r.voiceVolume)))
    : DEFAULT_SETTINGS.voiceVolume;
  const speed = SPEEDS.find((s) => s === r.defaultSpeed) ?? DEFAULT_SETTINGS.defaultSpeed;
  return {
    voiceVolume: volume,
    voiceOn: typeof r.voiceOn === "boolean" ? r.voiceOn : DEFAULT_SETTINGS.voiceOn,
    tips: typeof r.tips === "boolean" ? r.tips : DEFAULT_SETTINGS.tips,
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
      partialize: ({ voiceVolume, voiceOn, tips, captions, reduceMotion, defaultSpeed }) => ({ voiceVolume, voiceOn, tips, captions, reduceMotion, defaultSpeed }),
      merge: (persisted, current) => ({ ...current, ...cleanSettings(persisted as Partial<Settings> | undefined) }),
    },
  ),
);

/** Mirrors reduce motion onto the page root so styles can react to it. */
export function applyReduceMotion(on: boolean): void {
  if (typeof document !== "undefined") document.documentElement.dataset.reduceMotion = String(on);
}

if (typeof document !== "undefined") {
  applyReduceMotion(useSettings.getState().reduceMotion);
  useSettings.subscribe((s, prev) => {
    if (s.reduceMotion !== prev.reduceMotion) applyReduceMotion(s.reduceMotion);
  });
}
