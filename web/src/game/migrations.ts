import { DEFAULT_STYLE, LODGE_TIERS, type LodgeTier } from "./base";
import { normalizeStyleId } from "./styles";
import { createInitialState, SAVE_VERSION, toPersisted, type PersistedState } from "./state";
import { winterRecord } from "./winterMemory";
import { validateSave } from "./saveValidation";
import { mix32 } from "./rng";
import { SUMMIT_LINK_MIN_REPUTATION, summitLinkFirstDay } from "./summitLink";
import { resumeSeasonWeather } from "./weather";
import { calendarForSeason, operatingDayIndex, type MountainId } from "./calendar";
import { COACH_TIP_IDS } from "./coach";

export type Raw = Record<string, unknown>;
export type Migration = { to: number; note: string; up: (p: Raw) => Raw };

function legacyTips(raw: Raw) {
  const started = (typeof raw.dayIndex === "number" && raw.dayIndex > 1) ||
    (raw.phase !== undefined && raw.phase !== "setup" && raw.phase !== "day");
  return started ? [...COACH_TIP_IDS] : [];
}

/** Schema 1 is the M3 baseline. Append one step for each later schema. */
export const MIGRATIONS: readonly Migration[] = [
  {
    to: 2,
    note: "Seed a weather schedule and keep today's recorded conditions.",
    up(raw) {
      const { rngState, seasonLength, dayIndex, weather } = raw;
      if (typeof rngState !== "number" || !Number.isFinite(rngState) ||
          typeof seasonLength !== "number" || !Number.isInteger(seasonLength) || seasonLength < 1 || seasonLength > 49 ||
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
    note: "Start tracking school-bus and Abominable Snowglomerate offers.",
    up(raw) {
      const { pendingBeat, dayIndex, seasonLength, reputation } = raw;
      const validSummitLinkNight = typeof dayIndex === "number" && typeof seasonLength === "number" &&
        typeof reputation === "number" && dayIndex >= summitLinkFirstDay(seasonLength) && dayIndex < seasonLength &&
        reputation >= SUMMIT_LINK_MIN_REPUTATION;
      const clearTeaser = pendingBeat === "school_bus" || (pendingBeat === "summit_link" && !validSummitLinkNight);
      const migrated = { ...raw, schoolContract: null, schoolProgramProven: false, summitLinkDecision: null };
      return clearTeaser ? { ...migrated, pendingBeat: null, beatAcknowledged: true } : migrated;
    },
  },
  {
    to: 7,
    note: "Add first-winter tips to existing winters.",
    up(raw) {
      return { ...raw, tipsSeen: legacyTips(raw) };
    },
  },
  {
    to: 8,
    note: "Keep coach and winter records from both schema 7 shapes and start the Office ledger.",
    up(raw) {
      return {
        tipsSeen: legacyTips(raw),
        seasonDays: [],
        beatLog: Array.isArray(raw.completedBeats) ? raw.completedBeats.map(id => ({ id, day: null })) : [],
        career: raw.lastWinter ? [raw.lastWinter] : [],
        ...raw,
        dayHistory: [],
      };
    },
  },
  {
    to: 9,
    note: "Crew points replace automatic talent unlock at sleep.",
    up(raw) {
      return { ...raw, crewPoints: typeof raw.crewPoints === "number" ? raw.crewPoints : 0 };
    },
  },
  {
    to: 10,
    note: "Track optional cash rush for a second crew point per night.",
    up(raw) {
      return { ...raw, crewRushDay: typeof raw.crewRushDay === "number" ? raw.crewRushDay : 0 };
    },
  },
  {
    to: 11,
    note: "Operating-day index for Fri–Sun calendar.",
    up(raw) {
      const mountainId = raw.mountainId === "dutch_hill" ? "dutch_hill" : "dutch_hill";
      const seasonLength = typeof raw.seasonLength === "number" ? raw.seasonLength : 28;
      const dayIndex = typeof raw.dayIndex === "number" ? raw.dayIndex : 1;
      const cal = calendarForSeason(mountainId as MountainId, seasonLength);
      const operating = raw.operatingDayIndex ?? operatingDayIndex(cal, dayIndex);
      return { ...raw, operatingDayIndex: operating };
    },
  },
  {
    to: 12,
    note: "One lodge attach pad per tier; drop annex flag on pads that no longer exist.",
    up(raw) {
      const tier = (raw.lodgeTier === 1 || raw.lodgeTier === 2 || raw.lodgeTier === 3 ? raw.lodgeTier : 1) as LodgeTier;
      const maxPad = LODGE_TIERS[tier].pads;
      const assets = raw.assets;
      if (!Array.isArray(assets)) return raw;
      return {
        ...raw,
        assets: assets.map((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
          const attachPad = (entry as { attachPad?: unknown }).attachPad;
          if (typeof attachPad !== "number" || !Number.isInteger(attachPad) || attachPad < 0) return entry;
          if (attachPad >= maxPad || attachPad >= 3) {
            const rest = { ...(entry as Record<string, unknown>) };
            delete rest.attachPad;
            return rest;
          }
          return entry;
        }),
      };
    },
  },
  {
    to: 13,
    note: "Two lodge annex pads total: one at Tier 2, one at Tier 3.",
    up(raw) {
      const tier = (raw.lodgeTier === 1 || raw.lodgeTier === 2 || raw.lodgeTier === 3 ? raw.lodgeTier : 1) as LodgeTier;
      const maxPad = LODGE_TIERS[tier].pads;
      const assets = raw.assets;
      if (!Array.isArray(assets)) return raw;
      return {
        ...raw,
        assets: assets.map((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
          const attachPad = (entry as { attachPad?: unknown }).attachPad;
          if (typeof attachPad !== "number" || !Number.isInteger(attachPad) || attachPad < 0) return entry;
          if (attachPad >= maxPad) {
            const rest = { ...(entry as Record<string, unknown>) };
            delete rest.attachPad;
            return rest;
          }
          return entry;
        }),
      };
    },
  },
  {
    to: 14,
    note: "Cosmetic building styles: lodge default + per-venue style ids.",
    up(raw) {
      const lodgeStyleId = typeof raw.lodgeStyleId === "string"
        ? normalizeStyleId(raw.lodgeStyleId)
        : DEFAULT_STYLE;
      const assets = raw.assets;
      if (!Array.isArray(assets)) return { ...raw, lodgeStyleId };
      return {
        ...raw,
        lodgeStyleId,
        assets: assets.map((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
          const styleId = (entry as { styleId?: unknown }).styleId;
          if (typeof styleId !== "string") return entry;
          return { ...entry, styleId: normalizeStyleId(styleId) };
        }),
      };
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
  const missingSettlementHistory = fromVersion < 7 || (fromVersion === 7 && !("seasonDays" in raw));
  try {
    for (const migration of MIGRATIONS.slice(fromVersion - 1)) raw = migration.up(raw);
  } catch {
    return reset("invalid legacy fields");
  }
  const errors = validateSave(raw);
  if (errors.length) return reset(errors.join(", "));
  const state = toPersisted(raw as PersistedState);
  if (missingSettlementHistory && (state.phase === "winter_review" || state.phase === "mountain2")) {
    const record = winterRecord({ ...state, talentToast: null });
    const previous = state.lastWinter;
    const sameSettlement = previous && previous.day === record.day && previous.founder === record.founder &&
      previous.cash === record.cash && previous.loan === record.loan && previous.construction === record.construction &&
      previous.bankrupt === record.bankrupt && previous.summitLink === record.summitLink;
    state.career = [...(sameSettlement ? state.career.slice(0, -1) : state.career), record];
    state.lastWinter = record;
  }
  return { state, reset: false };
}
