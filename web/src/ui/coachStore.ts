"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { freshCoach, observeCoach, TIPS, type CoachProgress } from "@/game/coach";
import type { GameState } from "@/game/state";

type CoachStore = CoachProgress & {
  observe: (s: GameState) => void;
  next: (index: number) => void;
  skip: () => void;
  replay: () => void;
};

export const useCoach = create<CoachStore>()(persist((set, get) => ({
  ...freshCoach,
  observe: (s) => {
    const current = get();
    const result = observeCoach(current, s);
    if (result !== current) set(result);
  },
  next: (index) => { if (get().index === index) set({ index: index + 1, entered: null }); },
  skip: () => set({ index: TIPS.length, entered: null }),
  replay: () => set(freshCoach),
}), {
  name: "last-chair-coach",
  partialize: ({ index, entered }) => ({ index, entered }),
  merge: (stored, current) => {
    const saved = stored as Partial<CoachProgress> | null;
    if (typeof saved?.index !== "number" || !Number.isInteger(saved.index) || saved.index < 0 || saved.index > TIPS.length) return current;
    return { ...current, index: saved.index, entered: typeof saved.entered === "number" && Number.isFinite(saved.entered) ? saved.entered : null };
  },
}));
