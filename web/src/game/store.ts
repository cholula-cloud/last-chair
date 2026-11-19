"use client";

import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { migrate } from "./migrations";
import type { AssetId } from "./base";
import type { PaintStroke } from "./paintedTrail";
import type { SchoolContractDecision } from "./schoolContract";
import { backupKeyFor, migrateLegacySave, readActiveSlot, slotKey } from "./saveSlots";
import { STORY_BEATS } from "./content";
import * as rules from "./rules";
import {
  createInitialState,
  SAVE_VERSION,
  hydrate,
  toPersisted,
  type GameState,
  type PersistedState,
} from "./state";
import type { XZ } from "./terrain";
import type { SummitLinkDecision } from "./summitLink";
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
  takeLoan: () => void;
  repayLoan: () => void;
  setFollowId: (id: string | null) => void;
  setBuildMode: (on: boolean) => void;
  setSelectedLiftType: (t: LiftType) => void;
  placeLift: (req: { type: LiftType; bottom: XZ; top: XZ }) => void;
  undoLift: () => void;
  closeLift: (index: number) => void;
  commitPaint: (strokes: readonly PaintStroke[], glade?: boolean) => void;
  placeAsset: (id: AssetId, at: XZ) => void;
  placeGun: (at: XZ) => void;
  beginLodgeUpgrade: () => void;
  undoTrail: () => void;
  buyBuilding: (id: BuildingId) => void;
  pickFounder: (id: FounderId) => void;
  acknowledgeBeat: () => void;
  replyToSummitLink: (reply: SummitLinkDecision) => void;
  decideSchoolContract: (decision: SchoolContractDecision) => void;
  finishWinterReview: () => void;
  startNewSeason: () => void;
  nextTalentHint: () => string | null;
  dismissSaveNotice: () => void;
};

type GameStore = GameState & GameActions & { saveNotice: string | null };
type SavedRead = PersistedState & { saveNotice?: string };

const M2_SAVE_KEYS = ["last-chair-v1", "last-chair-v1-backup"];
const SAVE_NOTICE = "Your last winter couldn’t be loaded on this version. Starting fresh.";

/** Minimum wall time between writes during the day. Other triggers write immediately. */
export const DAY_WRITE_INTERVAL_MS = 10_000;

let clock: () => number = () => Date.now();
/** Tests replace the clock; pass nothing to restore it. */
export function setSaveClock(fn?: () => number): void {
  clock = fn ?? (() => Date.now());
}

type PendingWrite = { key: string; value: StorageValue<SavedRead> };
let pending: PendingWrite | null = null;
let lastWriteAt = 0;
let seenPhase: string | null = null;
/** Raw saves that could not be loaded, held until their backup copy is written. */
const unbackedSaves = new Map<string, string>();

function writePending(): void {
  if (!pending) return;
  const { key, value } = pending;
  try {
    const unbacked = unbackedSaves.get(key);
    if (unbacked !== undefined) {
      localStorage.setItem(backupKeyFor(key), unbacked);
      unbackedSaves.delete(key);
    }
    localStorage.setItem(key, JSON.stringify({ ...value, savedAt: clock() }));
    pending = null;
  } catch {
    // Storage can be denied or full. Keep playing in memory and retry on the next write.
  }
  lastWriteAt = clock();
}

let saveSuspended = false;
/** Runs a state change that must stay in memory only, such as resetting after a slot is deleted. */
export function withoutSaving(fn: () => void): void {
  saveSuspended = true;
  try {
    fn();
  } finally {
    saveSuspended = false;
  }
}

/** Writes the latest state now. Safe to call at any time. */
export function flushSave(): void {
  writePending();
}

/** Drops an unwritten state for a save key, for example after its slot is deleted or replaced. */
export function discardPendingSave(key: string): void {
  if (pending?.key === key) pending = null;
  unbackedSaves.delete(key);
}

/** The key of the save the store is currently attached to. */
export function activeSaveKey(): string {
  return useGameStore.persist.getOptions().name ?? slotKey(1);
}

/** Flushes when the page is hidden or closing. Returns a cleanup function. */
export function installSaveFlush(
  doc: Pick<Document, "addEventListener" | "removeEventListener" | "visibilityState">,
  win: Pick<Window, "addEventListener" | "removeEventListener">,
): () => void {
  const onVisibility = () => {
    if (doc.visibilityState === "hidden") flushSave();
  };
  doc.addEventListener("visibilitychange", onVisibility);
  win.addEventListener("pagehide", flushSave);
  return () => {
    doc.removeEventListener("visibilitychange", onVisibility);
    win.removeEventListener("pagehide", flushSave);
  };
}

/** Read the raw envelope so even malformed JSON can be backed up. */
function saveStorage(): PersistStorage<SavedRead> {
  let clearedM2Save = false;

  return {
    getItem(key) {
      let raw: string | null;
      try {
        if (!clearedM2Save) {
          M2_SAVE_KEYS.forEach((oldKey) => localStorage.removeItem(oldKey));
          clearedM2Save = true;
        }
        migrateLegacySave();
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
      const version = envelope && "version" in envelope && typeof envelope.version === "number"
        ? envelope.version
        : Number.NaN;
      const result = migrate(envelope?.state, version);
      const state = result.reset ? toPersisted(createInitialState(freshSeed())) : result.state;
      if (result.reset) unbackedSaves.set(key, raw);
      seenPhase = state.phase;
      if (result.reset || version !== SAVE_VERSION) {
        pending = { key, value: { state, version: SAVE_VERSION } };
        writePending();
      }
      return { state: result.reset ? { ...state, saveNotice: SAVE_NOTICE } : state, version: SAVE_VERSION };
    },
    setItem(key, value) {
      const phaseChanged = seenPhase !== null && value.state.phase !== seenPhase;
      seenPhase = value.state.phase;
      if (saveSuspended) return;
      pending = { key, value };
      if (phaseChanged || clock() - lastWriteAt >= DAY_WRITE_INTERVAL_MS) writePending();
    },
    removeItem(key) {
      if (pending?.key === key) pending = null;
      try {
        localStorage.removeItem(key);
      } catch {
        // Persistence is optional when browser storage is unavailable.
      }
    },
  };
}

/** Each fresh game gets its own seed; saved games resume from their stored RNG state. */
export function freshSeed(): number {
  return Math.floor(Math.random() * 0x100000000);
}

/** Move any pre-slot save into slot 1 before the store picks its key. */
function initialSaveKey(): string {
  const storage = typeof localStorage === "undefined" ? null : localStorage;
  migrateLegacySave(storage);
  return slotKey(readActiveSlot(storage));
}

export const useGameStore = create<GameStore>()(
  persist<GameStore, [], [], SavedRead>(
    (set, get) => {
      /** Actions that change the hill write straight away. `tick` and camera state use the throttle. */
      const commit = (update: (s: GameStore) => Partial<GameStore>) => {
        set(update);
        flushSave();
      };
      return {
        ...createInitialState(freshSeed()),
        saveNotice: null,
        dismissSaveNotice: () => commit(() => ({ saveNotice: null })),
        tick: (deltaMs) => set((s) => rules.tick(s, deltaMs)),
        togglePause: () => commit((s) => rules.togglePause(s)),
        skipToClose: () => commit((s) => rules.skipToClose(s)),
        openNightIfReady: () => commit((s) => rules.openNightIfReady(s)),
        setPendingFare: (f) => commit((s) => rules.setPendingFare(s, f)),
        setPendingSnow: (x) => commit((s) => rules.setPendingSnow(s, x)),
        sleep: () => commit((s) => rules.sleep(s)),
        takeLoan: () => commit((s) => rules.takeLoan(s)),
        repayLoan: () => commit((s) => rules.repayLoan(s)),
        setFollowId: (id) => set((s) => rules.setFollowId(s, id)),
        setBuildMode: (on) => set((s) => rules.setBuildMode(s, on)),
        setSelectedLiftType: (t) => set((s) => rules.setSelectedLiftType(s, t)),
        placeLift: (req) => commit((s) => rules.placeLift(s, req)),
        undoLift: () => commit((s) => rules.undoLift(s)),
        closeLift: (index) => commit((s) => rules.closeLift(s, index)),
        commitPaint: (strokes, glade) => commit((s) => rules.commitPaint(s, strokes, glade)),
        placeAsset: (id, at) => commit((s) => rules.placeAsset(s, id, at)),
        placeGun: (at) => commit((s) => rules.placeGun(s, at)),
        beginLodgeUpgrade: () => commit((s) => rules.beginLodgeUpgrade(s)),
        undoTrail: () => commit((s) => rules.undoTrail(s)),
        buyBuilding: (id) => commit((s) => rules.buyBuilding(s, id)),
        pickFounder: (id) => commit((s) => rules.pickFounder(s, id)),
        acknowledgeBeat: () => commit((s) => rules.acknowledgeBeat(s)),
        replyToSummitLink: (reply) => commit((s) => rules.replyToSummitLink(s, reply)),
        decideSchoolContract: (decision) => commit((s) => rules.decideSchoolContract(s, decision)),
        finishWinterReview: () => commit((s) => rules.finishWinterReview(s)),
        startNewSeason: () => commit((s) => rules.startNewSeason(s)),
        nextTalentHint: () => rules.nextTalentHint(get()),
      };
    },
    {
      name: initialSaveKey(),
      version: SAVE_VERSION,
      storage: saveStorage(),
      partialize: toPersisted,
      merge: (persisted, current) => hydrate(persisted as SavedRead | undefined, current),
    },
  ),
);

if (typeof document !== "undefined" && typeof window !== "undefined") installSaveFlush(document, window);

export function storyBeatCopy(id: StoryBeatId | null) {
  if (!id) return null;
  return STORY_BEATS.find((b) => b.id === id) ?? null;
}
