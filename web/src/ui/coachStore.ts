"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { freshCoach, observeCoach, TIPS, type CoachProgress } from "@/game/coach";
import type { GameState } from "@/game/state";

const freshMilestones = { skipped: false, lodgeSeen: false, problemSeen: false };

type CoachStore = CoachProgress & typeof freshMilestones & {
  finishDay: () => void;
  sawLodge: () => void;
  sawProblem: () => void;
  observe: (s: GameState) => void;
  next: (index: number) => void;
  skip: () => void;
  replay: () => void;
};

export const useCoach = create<CoachStore>()(persist((set, get) => ({
  ...freshCoach,
  ...freshMilestones,
  observe: (s) => {
    const current = get();
    const result = observeCoach(current, s);
    if (result !== current) set(result);
  },
  next: (index) => { if (get().index === index) set({ index: index + 1, entered: null }); },
  finishDay: () => set({ index: TIPS.length, entered: null }),
  sawLodge: () => set({ lodgeSeen: true }),
  sawProblem: () => set({ problemSeen: true }),
  skip: () => set({ index: TIPS.length, entered: null, skipped: true }),
  replay: () => set({ ...freshCoach, ...freshMilestones }),
}), {
  name: "last-chair-coach",
  partialize: ({ index, entered, skipped, lodgeSeen, problemSeen }) => ({ index, entered, skipped, lodgeSeen, problemSeen }),
  merge: (stored, current) => {
    const saved = stored as Partial<CoachStore> | null;
    if (typeof saved?.index !== "number" || !Number.isInteger(saved.index) || saved.index < 0 || saved.index > TIPS.length) return current;
    return { ...current, skipped: typeof saved.skipped === "boolean" ? saved.skipped : saved.index >= TIPS.length,
      lodgeSeen: saved.lodgeSeen === true, problemSeen: saved.problemSeen === true, index: saved.index, entered: typeof saved.entered === "number" && Number.isFinite(saved.entered) ? saved.entered : null };
  },
}));
