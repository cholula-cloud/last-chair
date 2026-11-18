"use client";

import { create } from "zustand";
import { SPEEDS, useSettings, type GameSpeed } from "@/ui/settingsStore";

export { SPEEDS, type GameSpeed };

/** Session-only day speed; not saved with the hill. Starts at the default speed from Settings. */
export const useSpeed = create<{
  speed: GameSpeed;
  cycle: () => void;
  reset: () => void;
}>((set, get) => ({
  speed: useSettings.getState().defaultSpeed,
  cycle: () => {
    const i = SPEEDS.indexOf(get().speed);
    set({ speed: SPEEDS[(i + 1) % SPEEDS.length] });
  },
  reset: () => set({ speed: useSettings.getState().defaultSpeed }),
}));

/** Game clock delta passed to `tick`, clamped for background-tab returns. */
export function scaledTickMs(deltaSec: number, speed: GameSpeed): number {
  return Math.min(deltaSec, 0.1) * 1000 * speed;
}