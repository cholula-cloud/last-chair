import { createInitialState, SAVE_VERSION, toPersisted, type PersistedState } from "./state";
import { validateSave } from "./saveValidation";
import { mix32 } from "./rng";
import { resumeSeasonWeather } from "./weather";

export type Raw = Record<string, unknown>;
export type Migration = { to: number; note: string; up: (p: Raw) => Raw };

/** Schema 1 is the M3 baseline. Append one step for each later schema. */
export const MIGRATIONS: readonly Migration[] = [
  {
    to: 2,
    note: "Seed a weather schedule and keep today's recorded conditions.",
    up(raw) {
      const { rngState, seasonLength, dayIndex, weather } = raw;
      if (typeof rngState !== "number" || !Number.isFinite(rngState) ||
          typeof seasonLength !== "number" || !Number.isInteger(seasonLength) || seasonLength < 1 || seasonLength > 28 ||
          typeof dayIndex !== "number" || !Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > seasonLength ||
          (weather !== "clear" && weather !== "snow" && weather !== "thaw")) throw new Error("Invalid saved weather");
      const seasonSeed = mix32(rngState);
      return { ...raw, seasonSeed, weatherDays: resumeSeasonWeather(seasonSeed, seasonLength, dayIndex, weather) };
    },
  },
  { to: 3, note: "Preserve trail types; existing runs are cleared trails.", up: (raw) => raw },
  { to: 4, note: "Assign existing winters to Dutch Hill.", up: (raw) => ({ ...raw, mountainId: "dutch_hill" }) },
];

type MigrationResult =
  | { state: PersistedState; reset: false }
  | { state: PersistedState; reset: true; reason: string };

export function migrate(persisted: unknown, fromVersion: number): MigrationResult {
  const reset = (reason: string): MigrationResult => ({
    state: toPersisted(createInitialState()), reset: true, reason,
  });
  if (fromVersion > SAVE_VERSION) return reset("newer version");
  if (!Number.isInteger(fromVersion) || fromVersion < 1) return reset("invalid version");
  if (!persisted || typeof persisted !== "object" || Array.isArray(persisted)) return reset("invalid save");
  let raw = persisted as Raw;
  try {
    for (const migration of MIGRATIONS.slice(fromVersion - 1)) raw = migration.up(raw);
  } catch {
    return reset("invalid legacy fields");
  }
  const errors = validateSave(raw);
  if (errors.length) return reset(errors.join(", "));
  return { state: toPersisted(raw as PersistedState), reset: false };
}
