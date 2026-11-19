import { MOUNTAIN_CALENDARS, type MountainId } from "./calendar";
import { migrate } from "./migrations";
import { SAVE_KEY, SAVE_VERSION, type PersistedState } from "./state";

/** Pure helpers for save slots, summaries and export files. No React and no store imports. */

export const SLOT_COUNT = 3;
export type SlotNumber = 1 | 2 | 3;
export const SLOT_NUMBERS: readonly SlotNumber[] = [1, 2, 3];

/** The single-slot key used before slots existed. Its save moves into slot 1. */
export const LEGACY_SAVE_KEY = SAVE_KEY;
export const LEGACY_BACKUP_KEY = `${SAVE_KEY}-backup`;
export const ACTIVE_SLOT_KEY = "last-chair-m3-active";
export const EXPORT_APP = "last-chair";
export const EXPORT_FORMAT = 1;

export const slotKey = (slot: SlotNumber): string => `last-chair-m3-slot-${slot}`;
export const slotBackupKey = (slot: SlotNumber): string => `${slotKey(slot)}-backup`;
/** Backup key for any save key, so the writer does not need to know about slots. */
export const backupKeyFor = (key: string): string => `${key}-backup`;

export function isSlotNumber(value: unknown): value is SlotNumber {
  return value === 1 || value === 2 || value === 3;
}

/** The subset of the Web Storage API these helpers use. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readActiveSlot(storage: KeyValueStorage | null = defaultStorage()): SlotNumber {
  try {
    const n = Number(storage?.getItem(ACTIVE_SLOT_KEY));
    return isSlotNumber(n) ? n : 1;
  } catch {
    return 1;
  }
}

export function writeActiveSlot(slot: SlotNumber, storage: KeyValueStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(ACTIVE_SLOT_KEY, String(slot));
  } catch {
    // The pointer is a convenience. Slot 1 is the fallback.
  }
}

/**
 * Moves a pre-slot save into slot 1. Copy first, then remove, so a failure never loses the save.
 * Does nothing when slot 1 already holds a save.
 */
export function migrateLegacySave(storage: KeyValueStorage | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    const legacy = storage.getItem(LEGACY_SAVE_KEY);
    if (legacy === null || storage.getItem(slotKey(1)) !== null) return false;
    storage.setItem(slotKey(1), legacy);
    storage.removeItem(LEGACY_SAVE_KEY);
    const legacyBackup = storage.getItem(LEGACY_BACKUP_KEY);
    if (legacyBackup !== null) {
      if (storage.getItem(slotBackupKey(1)) === null) storage.setItem(slotBackupKey(1), legacyBackup);
      storage.removeItem(LEGACY_BACKUP_KEY);
    }
    storage.setItem(ACTIVE_SLOT_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

export const MOUNTAIN_NAMES: Record<MountainId, string> = { dutch_hill: "Dutch Hill" };

export function mountainName(id: unknown): string {
  return typeof id === "string" && Object.hasOwn(MOUNTAIN_NAMES, id) ? MOUNTAIN_NAMES[id as MountainId] : "Unknown hill";
}

export type SlotSummary =
  | { kind: "empty" }
  | { kind: "unreadable" }
  | {
      kind: "ok";
      mountainId: MountainId;
      hill: string;
      dayIndex: number;
      seasonLength: number;
      cash: number;
      /** Epoch ms of the last write, or null for saves written before slots. */
      savedAt: number | null;
    };

const isCount = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1;

/** Light read of a raw slot string. Full validation happens when the slot is loaded. */
export function summarizeRaw(raw: string | null): SlotSummary {
  if (raw === null) return { kind: "empty" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "unreadable" };
  }
  if (!parsed || typeof parsed !== "object") return { kind: "unreadable" };
  const envelope = parsed as { state?: unknown; savedAt?: unknown };
  const state = envelope.state as Record<string, unknown> | null | undefined;
  if (!state || typeof state !== "object") return { kind: "unreadable" };
  const { mountainId, dayIndex, seasonLength, cash } = state;
  if (typeof mountainId !== "string" || !Object.hasOwn(MOUNTAIN_CALENDARS, mountainId)) return { kind: "unreadable" };
  if (!isCount(dayIndex) || !isCount(seasonLength) || dayIndex > seasonLength) return { kind: "unreadable" };
  if (typeof cash !== "number" || !Number.isFinite(cash)) return { kind: "unreadable" };
  return {
    kind: "ok",
    mountainId: mountainId as MountainId,
    hill: mountainName(mountainId),
    dayIndex,
    seasonLength,
    cash,
    savedAt: typeof envelope.savedAt === "number" && Number.isFinite(envelope.savedAt) ? envelope.savedAt : null,
  };
}

export function readSlotSummary(slot: SlotNumber, storage: KeyValueStorage | null = defaultStorage()): SlotSummary {
  try {
    return summarizeRaw(storage ? storage.getItem(slotKey(slot)) : null);
  } catch {
    return { kind: "empty" };
  }
}

export function readAllSlotSummaries(storage: KeyValueStorage | null = defaultStorage()): SlotSummary[] {
  return SLOT_NUMBERS.map((slot) => readSlotSummary(slot, storage));
}

/** First empty slot, or null when all three hold a save. */
export function firstEmptySlot(summaries: readonly SlotSummary[]): SlotNumber | null {
  const i = summaries.findIndex((s) => s.kind === "empty");
  return i < 0 ? null : (SLOT_NUMBERS[i] ?? null);
}

export type ExportFile = {
  app: typeof EXPORT_APP;
  format: typeof EXPORT_FORMAT;
  exportedAt: string;
  version: number;
  state: PersistedState;
};

export function buildExport(state: PersistedState, version: number, exportedAt: Date | number = Date.now()): ExportFile {
  return { app: EXPORT_APP, format: EXPORT_FORMAT, exportedAt: new Date(exportedAt).toISOString(), version, state };
}

/** Reads the state out of a raw slot string for export. Null when the slot cannot be read. */
export function exportFromRaw(raw: string | null, exportedAt: Date | number = Date.now()): ExportFile | null {
  if (raw === null) return null;
  try {
    const envelope = JSON.parse(raw) as { state?: unknown; version?: unknown };
    if (summarizeRaw(raw).kind !== "ok" || typeof envelope.version !== "number") return null;
    return buildExport(envelope.state as PersistedState, envelope.version, exportedAt);
  } catch {
    return null;
  }
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** For example `last-chair-dutch-hill-day-12.json`. */
export function exportFilename(file: ExportFile): string {
  const state = file.state as { mountainId?: unknown; dayIndex?: unknown };
  const day = isCount(state.dayIndex) ? state.dayIndex : 1;
  return `last-chair-${slug(mountainName(state.mountainId))}-day-${day}.json`;
}

export type ImportResult =
  | { ok: true; state: PersistedState }
  | { ok: false; message: string };

const BAD_FILE = "Choose a save file exported from Last Chair.";

/** Parses an export file and runs its state through the same migration and validation as a slot load. */
export function parseExport(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: BAD_FILE };
  }
  if (!parsed || typeof parsed !== "object") return { ok: false, message: BAD_FILE };
  const file = parsed as Partial<Record<keyof ExportFile, unknown>>;
  if (file.app !== EXPORT_APP) return { ok: false, message: BAD_FILE };
  if (file.format !== EXPORT_FORMAT) return { ok: false, message: "Open this file in the version of Last Chair that exported it." };
  const version = file.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) return { ok: false, message: BAD_FILE };
  if (version > SAVE_VERSION) return { ok: false, message: "Update Last Chair to open this newer save." };
  const result = migrate(file.state, version);
  if (result.reset) return { ok: false, message: "This save is damaged. Choose another copy to import." };
  return { ok: true, state: result.state };
}

/** True when a raw slot value would load without being reset. Used to decide if an overwrite needs a backup. */
export function isReadableRaw(raw: string): boolean {
  try {
    const envelope = JSON.parse(raw) as { state?: unknown; version?: unknown } | null;
    if (!envelope || typeof envelope !== "object" || typeof envelope.version !== "number") return false;
    return !migrate(envelope.state, envelope.version).reset;
  } catch {
    return false;
  }
}
