"use client";

import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { migrate } from "./migrations";
import type { AssetId } from "./base";
import type { PaintStroke } from "./paintedTrail";
import { STORY_BEATS } from "./content";
import * as rules from "./rules";
import {
  createInitialState,
  SAVE_KEY,
  SAVE_VERSION,
  hydrate,
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
  closeLift: (index: number) => void;
  commitPaint: (strokes: readonly PaintStroke[]) => void;
  placeAsset: (id: AssetId, at: XZ) => void;
  placeGun: (at: XZ) => void;
  beginLodgeUpgrade: () => void;
  cutTrail: (liftIndex: number, optionIndex: number) => void;
  undoTrail: () => void;
  buyBuilding: (id: BuildingId) => void;
  pickFounder: (id: FounderId) => void;
  acknowledgeBeat: () => void;
  finishWinterReview: () => void;
  startNewSeason: () => void;
  nextTalentHint: () => string | null;
  dismissSaveNotice: () => void;
};

type GameStore = GameState & GameActions & { saveNotice: string | null };
type SavedRead = PersistedState & { saveNotice?: string };

const SAVE_BACKUP_KEY = "last-chair-v1-backup";
const SAVE_NOTICE = "Your last winter couldn’t be loaded on this version. Starting fresh.";

/** Read the raw envelope so even malformed JSON can be backed up. */
function saveStorage(): PersistStorage<SavedRead> {
  let unbackedSave: string | null = null;
  const write: PersistStorage<SavedRead>["setItem"] = (key, value) => {
    try {
      if (unbackedSave !== null) {
        localStorage.setItem(SAVE_BACKUP_KEY, unbackedSave);
        unbackedSave = null;
      }
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be denied or full. Keep playing in memory and retry on the next write.
    }
  };

  return {
    getItem(key) {
      let raw: string | null;
      try {
        raw = localStorage.getItem(key);
      } catch {
        return null;
      }
      if (raw === null) return null;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
      const envelope = parsed && typeof parsed === "object" && "state" in parsed ? parsed : null;
      const version = envelope && "version" in envelope
        ? (typeof envelope.version === "number" ? envelope.version : Number.NaN)
        : 0;
      const result = migrate(envelope ? envelope.state : parsed, version);
      const state = result.reset ? toPersisted(createInitialState(freshSeed())) : result.state;
      if (result.reset) unbackedSave = raw;
      if (result.reset || version !== SAVE_VERSION) write(key, { state, version: SAVE_VERSION });
      return { state: result.reset ? { ...state, saveNotice: SAVE_NOTICE } : state, version: SAVE_VERSION };
    },
    setItem: write,
    removeItem(key) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Persistence is optional when browser storage is unavailable.
      }
    },
  };
}

/** Each fresh game gets its own seed; saved games resume from their stored RNG state. */
function freshSeed(): number {
  return Math.floor(Math.random() * 0x100000000);
}

export const useGameStore = create<GameStore>()(
  persist<GameStore, [], [], SavedRead>(
    (set, get) => ({
      ...createInitialState(freshSeed()),
      saveNotice: null,
      dismissSaveNotice: () => set({ saveNotice: null }),
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
      closeLift: (index) => set((s) => rules.closeLift(s, index)),
      commitPaint: (strokes) => set((s) => rules.commitPaint(s, strokes)),
      placeAsset: (id, at) => set((s) => rules.placeAsset(s, id, at)),
      placeGun: (at) => set((s) => rules.placeGun(s, at)),
      beginLodgeUpgrade: () => set((s) => rules.beginLodgeUpgrade(s)),
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
      storage: saveStorage(),
      partialize: toPersisted,
      merge: (persisted, current) => hydrate(persisted as SavedRead | undefined, current),
    },
  ),
);

export function storyBeatCopy(id: StoryBeatId | null) {
  if (!id) return null;
  return STORY_BEATS.find((b) => b.id === id) ?? null;
}
