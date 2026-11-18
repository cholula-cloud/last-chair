"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORY_BEATS } from "./content";
import * as rules from "./rules";
import {
  createInitialState,
  SAVE_KEY,
  SAVE_VERSION,
  hydrate,
  migrate,
  toPersisted,
  type GameState,
  type PersistedState,
} from "./state";
import type { XZ } from "./terrain";
import type {
  BuildingId,
  FarePreset,
  FounderId,
  LiftType,
  SnowPreset,
  StoryBeatId,
} from "./types";

export type { LiftSlot } from "./state";

type GameActions = {
  tick: (deltaMs: number) => void;
  togglePause: () => void;
  skipToClose: () => void;
  openNightIfReady: () => void;
  setPendingFare: (f: FarePreset) => void;
  setPendingSnow: (s: SnowPreset) => void;
  sleep: () => void;
  setFollowId: (id: string | null) => void;
  setBuildMode: (on: boolean) => void;
  setSelectedLiftType: (t: LiftType) => void;
  placeLift: (req: { type: LiftType; bottom: XZ; top: XZ }) => void;
  undoLift: () => void;
  cutTrail: (liftIndex: number, optionIndex: number) => void;
  undoTrail: () => void;
  buyBuilding: (id: BuildingId) => void;
  pickFounder: (id: FounderId) => void;
  acknowledgeBeat: () => void;
  finishWinterReview: () => void;
  startNewSeason: () => void;
  nextTalentHint: () => string | null;
};

type GameStore = GameState & GameActions;

/** Each fresh game gets its own seed; saved games resume from their stored RNG state. */
function freshSeed(): number {
  return Math.floor(Math.random() * 0x100000000);
}

export const useGameStore = create<GameStore>()(
  persist<GameStore, [], [], PersistedState>(
    (set, get) => ({
      ...createInitialState(freshSeed()),
      tick: (deltaMs) => set((s) => rules.tick(s, deltaMs)),
      togglePause: () => set((s) => rules.togglePause(s)),
      skipToClose: () => set((s) => rules.skipToClose(s)),
      openNightIfReady: () => set((s) => rules.openNightIfReady(s)),
      setPendingFare: (f) => set((s) => rules.setPendingFare(s, f)),
      setPendingSnow: (x) => set((s) => rules.setPendingSnow(s, x)),
      sleep: () => set((s) => rules.sleep(s)),
      setFollowId: (id) => set((s) => rules.setFollowId(s, id)),
      setBuildMode: (on) => set((s) => rules.setBuildMode(s, on)),
      setSelectedLiftType: (t) => set((s) => rules.setSelectedLiftType(s, t)),
      placeLift: (req) => set((s) => rules.placeLift(s, req)),
      undoLift: () => set((s) => rules.undoLift(s)),
      cutTrail: (liftIndex, optionIndex) =>
        set((s) => rules.cutTrail(s, liftIndex, optionIndex)),
      undoTrail: () => set((s) => rules.undoTrail(s)),
      buyBuilding: (id) => set((s) => rules.buyBuilding(s, id)),
      pickFounder: (id) => set((s) => rules.pickFounder(s, id)),
      acknowledgeBeat: () => set((s) => rules.acknowledgeBeat(s)),
      finishWinterReview: () => set((s) => rules.finishWinterReview(s)),
      startNewSeason: () => set((s) => rules.startNewSeason(s)),
      nextTalentHint: () => rules.nextTalentHint(get()),
    }),
    {
      name: SAVE_KEY,
      version: SAVE_VERSION,
      migrate: (persisted, fromVersion) => migrate(persisted, fromVersion),
      storage: createJSONStorage(() => localStorage),
      partialize: toPersisted,
      merge: hydrate,
    },
  ),
);

export function storyBeatCopy(id: StoryBeatId | null) {
  if (!id) return null;
  return STORY_BEATS.find((b) => b.id === id) ?? null;
}
