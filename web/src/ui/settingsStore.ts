"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type GameSpeed = 1 | 2 | 3;
export const SPEEDS: readonly GameSpeed[] = [1, 2, 3];

export const SETTINGS_KEY = "last-chair-settings";

export type Settings = {
  /** Master switch for all sound, voice included. */
  soundOn: boolean;
  /** 0 to 100. Overall volume. */
  masterVolume: number;
  /** 0 to 100. UI taps, build thunks and stings. */
  effectsVolume: number;
  /** 0 to 100. The wind bed. */
  ambienceVolume: number;
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
  soundOn: true,
  masterVolume: 80,
  effectsVolume: 80,
  ambienceVolume: 50,
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
  const percent = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : fallback;
  const speed = SPEEDS.find((s) => s === r.defaultSpeed) ?? DEFAULT_SETTINGS.defaultSpeed;
  return {
    soundOn: typeof r.soundOn === "boolean" ? r.soundOn : DEFAULT_SETTINGS.soundOn,
    masterVolume: percent(r.masterVolume, DEFAULT_SETTINGS.masterVolume),
    effectsVolume: percent(r.effectsVolume, DEFAULT_SETTINGS.effectsVolume),
    ambienceVolume: percent(r.ambienceVolume, DEFAULT_SETTINGS.ambienceVolume),
    voiceVolume: percent(r.voiceVolume, DEFAULT_SETTINGS.voiceVolume),
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
      partialize: ({ soundOn, masterVolume, effectsVolume, ambienceVolume, voiceVolume, voiceOn, tips, captions, reduceMotion, defaultSpeed }) => ({
        soundOn, masterVolume, effectsVolume, ambienceVolume, voiceVolume, voiceOn, tips, captions, reduceMotion, defaultSpeed,
      }),
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
