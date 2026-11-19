import { createInitialState, SAVE_VERSION, toPersisted, type PersistedState } from "./state";
import { validateSave } from "./saveValidation";
import { mix32 } from "./rng";
import { SUMMIT_LINK_FIRST_DAY, SUMMIT_LINK_MIN_REPUTATION } from "./summitLink";
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
  {
    to: 5,
    note: "Keep existing construction fully paid and preserve the recorded operating result.",
    up(raw) {
      const { cash, phase, nightRecap } = raw;
      return {
        ...raw,
        payables: [],
        loan: null,
        loanTaken: false,
        debtMornings: typeof cash === "number" && cash < 0 ? 1 : 0,
        outcome: phase === "winter_review" || phase === "mountain2" ? "finished" : "playing",
        constructionSpent: 0,
        nightRecap: nightRecap && typeof nightRecap === "object" && !Array.isArray(nightRecap)
          ? { ...nightRecap, costs: null, revenue: null, loanReceived: 0, loanRepaid: 0 }
          : nightRecap,
      };
    },
  },
  {
    to: 6,
    note: "Start tracking school-bus and SummitLink offers.",
    up(raw) {
      const { pendingBeat, dayIndex, seasonLength, reputation } = raw;
      const validSummitLinkNight = typeof dayIndex === "number" && typeof seasonLength === "number" &&
        typeof reputation === "number" && dayIndex >= SUMMIT_LINK_FIRST_DAY && dayIndex < seasonLength &&
        reputation >= SUMMIT_LINK_MIN_REPUTATION;
      const clearTeaser = pendingBeat === "school_bus" || (pendingBeat === "summit_link" && !validSummitLinkNight);
      const migrated = { ...raw, schoolContract: null, schoolProgramProven: false, summitLinkDecision: null };
      return clearTeaser ? { ...migrated, pendingBeat: null, beatAcknowledged: true } : migrated;
    },
  },
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
