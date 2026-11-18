import { createInitialState, SAVE_VERSION } from "./state";
import {
  backupKeyFor,
  exportFromRaw,
  isReadableRaw,
  parseExport,
  slotKey,
  writeActiveSlot,
  type ExportFile,
  type SlotNumber,
} from "./saveSlots";
import { activeSaveKey, discardPendingSave, flushSave, freshSeed, useGameStore, withoutSaving } from "./store";

/** Store-level slot operations. Every one flushes the current slot before it moves away. */

function attach(slot: SlotNumber): void {
  writeActiveSlot(slot);
  useGameStore.persist.setOptions({ name: slotKey(slot) });
}

/** Keeps the only copy of a save that cannot be read before a slot is overwritten. */
function backUpIfUnreadable(key: string): void {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null && !isReadableRaw(raw)) localStorage.setItem(backupKeyFor(key), raw);
  } catch {
    // Without storage there is nothing to protect.
  }
}

function resetInMemory(): void {
  useGameStore.setState({ ...createInitialState(freshSeed()), saveNotice: null });
}

/** Loads a saved slot into the game. An unreadable save is backed up and replaced, with a notice. */
export async function playSlot(slot: SlotNumber): Promise<void> {
  flushSave();
  attach(slot);
  // A recovery notice belongs to the slot that produced it, not the next one.
  // Memory still holds the old slot's game here, so this must not be saved under the new key.
  withoutSaving(() => useGameStore.setState({ saveNotice: null }));
  await useGameStore.persist.rehydrate();
}

/** Starts a fresh winter in a slot and writes it, replacing whatever the slot held. */
export function startNewWinter(slot: SlotNumber): void {
  flushSave();
  discardPendingSave(slotKey(slot));
  backUpIfUnreadable(slotKey(slot));
  attach(slot);
  resetInMemory();
  flushSave();
}

/** Removes a slot and its backup. If it is the active slot, the game goes back to a fresh, unsaved state. */
export function deleteSlot(slot: SlotNumber): void {
  const key = slotKey(slot);
  const wasActive = activeSaveKey() === key;
  if (!wasActive) flushSave();
  discardPendingSave(key);
  try {
    localStorage.removeItem(key);
    localStorage.removeItem(backupKeyFor(key));
  } catch {
    // Nothing more to remove when storage is unavailable.
  }
  if (wasActive) {
    attach(slot);
    // The fresh state stays in memory. The slot stays empty until the player starts a winter.
    withoutSaving(resetInMemory);
  }
}

/** Builds the export file for a slot, or null when the slot is empty or unreadable. */
export function exportSlot(slot: SlotNumber): ExportFile | null {
  flushSave();
  try {
    return exportFromRaw(localStorage.getItem(slotKey(slot)));
  } catch {
    return null;
  }
}

export type ImportOutcome = { ok: true } | { ok: false; message: string };

/** Validates an export file and writes it into a slot. The caller confirms any overwrite first. */
export function importIntoSlot(slot: SlotNumber, text: string): ImportOutcome {
  const parsed = parseExport(text);
  if (!parsed.ok) return parsed;
  const key = slotKey(slot);
  discardPendingSave(key);
  backUpIfUnreadable(key);
  try {
    localStorage.setItem(key, JSON.stringify({ state: parsed.state, version: SAVE_VERSION, savedAt: Date.now() }));
  } catch {
    return { ok: false, message: "This browser would not let Last Chair store that save." };
  }
  return { ok: true };
}
