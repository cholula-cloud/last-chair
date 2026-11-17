import { LIFT_PREVIEW_SLOTS, type LiftAnchor } from "./descent";
import { PERSONAS } from "./personas";
import { ZERO_TERMS } from "./satisfaction";
import { START_DEPTH, START_QUALITY, deriveSnow, freshTrail, trailFromGlobals, type Trail } from "./snow";
import { DAY_START_MIN, SEASON_LENGTH, emptyDayStats, makeGuest, type NightRecap } from "./sim";
import type {
  BuildingId,
  DayStats,
  FarePreset,
  FounderId,
  GamePhase,
  Guest,
  LiftType,
  SnowPreset,
  StoryBeatId,
  WeatherKind,
} from "./types";

export type LiftSlot = {
  type: LiftType;
  anchor: LiftAnchor;
  confirmed: boolean;
  /** FIFO queue of guest ids waiting at this lift, front first. */
  queue: string[];
  /** Dispatch accumulator: whole units dispatch one guest each (see lifts.ts). */
  dispatchCredit: number;
  /** Snow on this lift's trail, top (index 0) to bottom (see snow.ts). */
  trail: Trail;
};

/** Everything that is saved between sessions. */
export type PersistedState = {
  dayIndex: number;
  clockMin: number;
  phase: GamePhase;
  paused: boolean;
  cash: number;
  fare: FarePreset;
  snow: SnowPreset;
  /** Derived: mean of every open trail segment (`deriveSnow`). Never set by hand. */
  snowQuality: number;
  /** Derived: mean of every open trail segment (`deriveSnow`). Never set by hand. */
  snowDepth: number;
  /** Fraction of the trail from the bottom the guns covered last night (0 = not fired). */
  gunReach: number;
  guests: Guest[];
  followId: string | null;
  pendingFare: FarePreset;
  pendingSnow: SnowPreset;
  buildMode: boolean;
  founderId: FounderId | null;
  buildings: BuildingId[];
  lifts: LiftSlot[];
  selectedLiftType: LiftType;
  selectedSlotIndex: number;
  talentsOwned: string[];
  completedBeats: StoryBeatId[];
  pendingBeat: StoryBeatId | null;
  beatAcknowledged: boolean;
  weather: WeatherKind;
  morningHeadline: string;
  daysWithoutSnow: number;
  reputation: number;
  gunsVisible: boolean;
  groomVisible: boolean;
  seasonLength: number;
  /** Internal state of the seeded RNG (see rng.ts). */
  rngState: number;
  /** The open night sheet, so a reload during the night restores it. */
  nightRecap: NightRecap | null;
  dayStats: DayStats;
};

/** The whole game: saved fields plus per-session display state. */
export type GameState = PersistedState & {
  talentToast: string | null;
};

export const DEFAULT_SEED = 1;

export function defaultLifts(): LiftSlot[] {
  return [
    {
      type: "surface",
      anchor: LIFT_PREVIEW_SLOTS[0] ?? { x: -1.2, z: 0.2 },
      confirmed: true,
      queue: [],
      dispatchCredit: 0,
      trail: freshTrail(),
    },
  ];
}

export function createInitialState(seed: number = DEFAULT_SEED): GameState {
  return {
    dayIndex: 1,
    clockMin: DAY_START_MIN,
    phase: "setup",
    paused: true,
    cash: 12000,
    fare: "balanced",
    snow: "mid",
    snowQuality: START_QUALITY,
    snowDepth: START_DEPTH,
    gunReach: 0,
    guests: [],
    followId: null,
    nightRecap: null,
    dayStats: emptyDayStats(),
    pendingFare: "balanced",
    pendingSnow: "mid",
    buildMode: false,
    founderId: null,
    buildings: ["warming_hut"],
    lifts: defaultLifts(),
    selectedLiftType: "surface",
    selectedSlotIndex: 0,
    talentsOwned: [],
    completedBeats: [],
    pendingBeat: null,
    beatAcknowledged: true,
    weather: "clear",
    morningHeadline: "Dutch Hill opens — one limping surface lift.",
    daysWithoutSnow: 0,
    reputation: 40,
    gunsVisible: false,
    groomVisible: false,
    seasonLength: SEASON_LENGTH,
    talentToast: null,
    rngState: seed >>> 0,
  };
}

export function toPersisted(state: PersistedState): PersistedState {
  return {
    dayIndex: state.dayIndex,
    clockMin: state.clockMin,
    phase: state.phase,
    paused: state.paused,
    cash: state.cash,
    fare: state.fare,
    snow: state.snow,
    snowQuality: state.snowQuality,
    snowDepth: state.snowDepth,
    gunReach: state.gunReach,
    guests: state.guests,
    followId: state.followId,
    pendingFare: state.pendingFare,
    pendingSnow: state.pendingSnow,
    buildMode: state.buildMode,
    founderId: state.founderId,
    buildings: state.buildings,
    lifts: state.lifts,
    selectedLiftType: state.selectedLiftType,
    selectedSlotIndex: state.selectedSlotIndex,
    talentsOwned: state.talentsOwned,
    completedBeats: state.completedBeats,
    pendingBeat: state.pendingBeat,
    beatAcknowledged: state.beatAcknowledged,
    weather: state.weather,
    morningHeadline: state.morningHeadline,
    daysWithoutSnow: state.daysWithoutSnow,
    reputation: state.reputation,
    gunsVisible: state.gunsVisible,
    groomVisible: state.groomVisible,
    seasonLength: state.seasonLength,
    rngState: state.rngState,
    nightRecap: state.nightRecap,
    dayStats: state.dayStats,
  };
}

/** Merge a saved slice into the current state. Saves without `rngState` keep the current one. */
export function hydrate<T extends GameState>(persisted: unknown, current: T): T {
  const p = persisted as Partial<PersistedState> | undefined;
  if (!p) return current;
  if (p.phase === "setup" || !p.founderId) {
    return { ...current, ...p, phase: "setup" as const };
  }
  return { ...current, ...p };
}

/** Storage key stays `last-chair-v1` so existing saves load; the schema version is separate. */
export const SAVE_KEY = "last-chair-v1";
export const SAVE_VERSION = 5;

/**
 * Upgrade a saved slice from an older schema. Fields that are missing are
 * filled from a fresh state. Version 0 (unversioned) saves have no `rngState`,
 * `nightRecap` or `dayStats`. A v0 save made during the night has no recap to
 * restore, so it cannot resume the night sheet and is loaded as a day.
 * Versions below 2 have no lift queues or queue statistics: queues load empty,
 * accumulators 0, and any guest saved mid-queue rejoins a lift on the next tick.
 * Versions below 3 have no personas or day script: each guest becomes a
 * regular who has already arrived, with a full tank, and old "depart" guests
 * are "gone". Versions below 4 have no per-guest wait or snow tallies (they
 * start at 0, so a guest mid-day is scored from the next ride on) and no
 * satisfaction breakdown on a saved night recap (it loads as all zeros).
 * Versions below 5 have one global snow depth and quality: every lift gets a
 * trail of segments all set to those values, and `gunReach` is 0.
 */
export function migrate(persisted: unknown, fromVersion: number): PersistedState {
  const fresh = toPersisted(createInitialState());
  if (!persisted || typeof persisted !== "object") return fresh;
  const p = { ...(persisted as Partial<PersistedState>) };
  if (fromVersion < 1) {
    if (p.phase === "night" && !p.nightRecap) {
      p.phase = "day";
      p.pendingBeat = null;
      p.beatAcknowledged = true;
    }
  }
  if (fromVersion < 2) {
    p.lifts = (p.lifts ?? fresh.lifts).map((l) => ({
      ...l,
      queue: l.queue ?? [],
      dispatchCredit: l.dispatchCredit ?? 0,
    }));
    p.dayStats = { ...emptyDayStats(), ...p.dayStats, avgQueueMin: 0 };
  }
  if (fromVersion < 3) {
    const clock = p.clockMin ?? DAY_START_MIN;
    const guests = (p.guests ?? []) as unknown as Array<Record<string, unknown>>;
    p.guests = guests.map((g) => {
      if (g.persona) return g as unknown as Guest;
      const old = g as { state?: string; progress?: number };
      return makeGuest({
        ...(g as object),
        state: old.state === "depart" ? "gone" : (old.state as Guest["state"]),
        arriveAtMin: DAY_START_MIN,
        stateSinceMin: clock - (old.progress ?? 0) * PERSONAS.regular.skiMin,
      });
    });
    const arrived = p.guests.filter((g) => g.state !== "pending").length;
    const stats = { ...emptyDayStats(), ...p.dayStats };
    p.dayStats = {
      ...stats,
      guestsArrived: p.dayStats?.guestsArrived ?? arrived,
      runsPerGuest: arrived > 0 ? stats.completedRuns / arrived : 0,
    };
  }
  if (fromVersion < 4) {
    p.guests = (p.guests ?? []).map((g) => ({
      ...g,
      waitMin: g.waitMin ?? 0,
      waitCount: g.waitCount ?? 0,
      snowSum: g.snowSum ?? 0,
    }));
    if (p.nightRecap && !p.nightRecap.breakdown) {
      p.nightRecap = { ...p.nightRecap, breakdown: { ...ZERO_TERMS } };
    }
  }
  if (fromVersion < 5) {
    const depth = p.snowDepth ?? START_DEPTH;
    const quality = p.snowQuality ?? START_QUALITY;
    p.lifts = (p.lifts ?? fresh.lifts).map((l) => ({
      ...l,
      trail: l.trail ?? trailFromGlobals(depth, quality),
    }));
    p.gunReach = p.gunReach ?? 0;
    Object.assign(p, deriveSnow(p.lifts));
  }
  // A save without rngState gets a fresh random seed; filling it from
  // createInitialState() would put every migrated save on the same seed.
  const rngState = p.rngState ?? Math.floor(Math.random() * 0x100000000);
  return { ...fresh, ...p, rngState };
}
