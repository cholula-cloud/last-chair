"use client";

import { create } from "zustand";

export type GameSpeed = 1 | 2 | 3;

const SPEEDS: GameSpeed[] = [1, 2, 3];

/** Session-only day speed; not saved with the hill. */
export const useSpeed = create<{
  speed: GameSpeed;
  cycle: () => void;
  reset: () => void;
}>((set, get) => ({
  speed: 1,
  cycle: () => {
    const i = SPEEDS.indexOf(get().speed);
    set({ speed: SPEEDS[(i + 1) % SPEEDS.length] });
  },
  reset: () => set({ speed: 1 }),
}));

/** Game clock delta passed to `tick`, clamped for background-tab returns. */
export function scaledTickMs(deltaSec: number, speed: GameSpeed): number {
  return Math.min(deltaSec, 0.1) * 1000 * speed;
}