import { DUTCH_HILL_SITE } from "./mountains/dutchHill.site";
import { placedAssetsFromLegacy, type LodgeTier, type LodgeUpgrade, type PlacedAsset } from "./base";
import { clearingCells, type ClearingCell } from "./clearing";
import { migrateLegacyGuns, type SnowGun } from "./guns";
import { STANDARD_BRUSH_WIDTH } from "./paintedTrail";
import { MAX_LIFTS, REFERENCE_TOPS, type LiftAnchor } from "./descent";
import { PERSONAS } from "./personas";
import { VALUE, ZERO_TERMS } from "./satisfaction";
import type { XZ } from "./terrain";
import { START_DEPTH, START_QUALITY, deriveSnow, trailFromGlobals } from "./snow";
import {
  buildTrailRun,
  defaultTrails,
  fallLineTrailForLift,
  segmentElevationsForPath,
  type TrailRun,
} from "./trails";
import { DAY_START_MIN, SEASON_LENGTH, emptyDayStats, makeGuest, type NightRecap } from "./sim";
import {
  FARE_PRICES,
  type BuildingId,
  type DayStats,
  type FarePreset,
  type FounderId,
  type GamePhase,
  type Guest,
  type LiftType,
  type SnowPreset,
  type StoryBeatId,
  type WeatherKind,
} from "./types";

/**
 * One lift. Identity is the index in `GameState.lifts`, which is append-only
 * within a season: undo pops only the last lift (before the clock moves) and
 * any future closure sets `confirmed: false` instead of splicing.
 */
export type LiftSlot = {
  type: LiftType;
  /** The top terminal. */
  anchor: LiftAnchor;
  /** The bottom terminal; absent means `TERRAIN.base`. */
  bottom?: XZ;
  /** Day and clock minute the lift was placed; absent on the pre-built default lift. */
  builtDay?: number;
  builtAtMin?: number;
  /** What the player paid, refunded exactly by undo. */
  paid?: number;
  confirmed: boolean;
  closing?: boolean;
  /** FIFO queue of guest ids waiting at this lift, front first. */
  queue: string[];
  /** Dispatch accumulator: whole units dispatch one guest each (see lifts.ts). */
  dispatchCredit: number;
};

/** What yesterday looked like, kept so tonight's recap can show the change. Null on day 1 and after a new season. */
export type LastDay = {
  arrivals: number;
  satisfaction: number;
  cashDelta: number;
  avgWaitMin: number;
  /** The fare the day ran at. */
  fare: FarePreset;
  /** The snow & service preset the crew worked the night before. */
  snow: SnowPreset;
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
  lodgeTier: LodgeTier;
  lodgeUpgrade: LodgeUpgrade | null;
  assets: PlacedAsset[];
  guns: SnowGun[];
  clearedCells: ClearingCell[];
  lifts: LiftSlot[];
  trails: TrailRun[];
  selectedLiftType: LiftType;
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
  /** Set at Sleep; shown as deltas on the next night's recap. */
  lastDay: LastDay | null;
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
      anchor: REFERENCE_TOPS[0] ?? { x: -1.2, z: 0.2 },
      confirmed: true,
      queue: [],
      dispatchCredit: 0,
    },
  ];
}

export function createInitialState(seed: number = DEFAULT_SEED): GameState {
  const trails = defaultTrails();
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
    lastDay: null,
    dayStats: emptyDayStats(),
    pendingFare: "balanced",
    pendingSnow: "mid",
    buildMode: false,
    founderId: null,
    buildings: ["warming_hut"],
    lodgeTier: DUTCH_HILL_SITE.buildings.lodge.startingTier,
    lodgeUpgrade: null,
    assets: placedAssetsFromLegacy(["warming_hut"]),
    guns: [],
    clearedCells: trails.flatMap((trail) => clearingCells(trail.path, trail.path.map(() => STANDARD_BRUSH_WIDTH))),
    lifts: defaultLifts(),
    trails,
    selectedLiftType: "surface",
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
    lodgeTier: state.lodgeTier,
    lodgeUpgrade: state.lodgeUpgrade,
    assets: state.assets,
    guns: state.guns,
    clearedCells: state.clearedCells,
    lifts: state.lifts,
    trails: state.trails,
    selectedLiftType: state.selectedLiftType,
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
    lastDay: state.lastDay,
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
export const SAVE_VERSION = 14;

/** Frozen horizontal scale for v7 saves (Dutch Hill only). */
const V7_DUTCH_HILL_H = 6;

const finiteXZ = (p: unknown): boolean =>
  !!p &&
  Number.isFinite((p as XZ).x) &&
  Number.isFinite((p as XZ).z);

function liftsUsable(lifts: unknown): boolean {
  return (
    Array.isArray(lifts) &&
    lifts.length > 0 &&
    lifts.length <= MAX_LIFTS &&
    lifts.every((l) => finiteXZ(l?.anchor) && (l.bottom === undefined || finiteXZ(l.bottom)))
  );
}

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
 * Versions below 6 have no `lastDay` (it loads null, so the first recap shows
 * no deltas) and no `facts` on a saved night recap (rebuilt from the day's
 * stats, the fare and the snow, with the hill's worth at its base value).
 * Versions below 7 drop `selectedSlotIndex` (free lift placement) and keep
 * their lifts, unless the lifts are missing, empty, hold a non-finite
 * terminal or exceed `MAX_LIFTS`, in which case they reset to the default lift.
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
    type Legacy = LiftSlot & { trail?: import("./snow").Trail };
    p.lifts = (p.lifts ?? fresh.lifts).map((l) => {
      const leg = l as Legacy;
      return { ...l, trail: leg.trail ?? trailFromGlobals(depth, quality) } as Legacy;
    });
    p.gunReach = p.gunReach ?? 0;
    const snowLifts = (p.lifts as Legacy[]).map((l) => ({
      confirmed: l.confirmed,
      trail: l.trail ?? trailFromGlobals(depth, quality),
    }));
    Object.assign(p, deriveSnow(snowLifts));
  }
  if (fromVersion < 6) {
    p.lastDay = p.lastDay ?? null;
    if (p.nightRecap && !p.nightRecap.facts) {
      const fare = p.fare ?? fresh.fare;
      const stats = { ...emptyDayStats(), ...p.dayStats };
      p.nightRecap = {
        ...p.nightRecap,
        facts: {
          avgWaitMin: stats.avgQueueMin,
          snowQuality: p.snowQuality ?? START_QUALITY,
          snowLabel: "Good cover",
          farePrice: FARE_PRICES[fare],
          hillValue: VALUE.BASE,
          runsPerGuest: stats.runsPerGuest,
          turnedAway: stats.turnedAway,
          arrivalMood: 0.7,
        },
      };
    }
  }
  if (fromVersion < 7) {
    delete (p as Record<string, unknown>).selectedSlotIndex;
    if (!liftsUsable(p.lifts)) {
      p.lifts = fresh.lifts;
      p.guests = (p.guests ?? []).map((g) => ({ ...g, liftIndex: undefined }));
    }
  }
  if (fromVersion === 7) {
    const scaleXZ = (v: number) => Math.round(v * V7_DUTCH_HILL_H * 1e6) / 1e6;
    p.lifts = (p.lifts ?? fresh.lifts).map((l) => ({
      ...l,
      anchor: { x: scaleXZ(l.anchor.x), z: scaleXZ(l.anchor.z) },
      ...(l.bottom
        ? { bottom: { x: scaleXZ(l.bottom.x), z: scaleXZ(l.bottom.z) } }
        : {}),
    }));
    if (!liftsUsable(p.lifts)) {
      p.lifts = fresh.lifts;
      p.guests = (p.guests ?? []).map((g) => ({ ...g, liftIndex: undefined }));
    }
  }
  if (fromVersion < 9) {
    type LegacyLift = LiftSlot & { trail?: import("./snow").Trail };
    const lifts = (p.lifts ?? fresh.lifts) as LegacyLift[];
    const trails: TrailRun[] = lifts.map((l, i) => {
      const snow = l.trail ?? trailFromGlobals(START_DEPTH, START_QUALITY);
      if (i === 0) {
        return buildTrailRun(0, l.anchor, snow, {
          name: "Dutch Meadows",
          gentle: true,
          open: l.confirmed,
        });
      }
      return fallLineTrailForLift(i, l, snow);
    });
    p.trails = trails;
    p.lifts = lifts.map((l) => {
      const { trail: _unused, ...rest } = l as LegacyLift;
      void _unused;
      return rest;
    });
  }
  if (fromVersion < 10) {
    type MaybeTrail = TrailRun & { elevations?: number[] };
    p.trails = (p.trails ?? fresh.trails).map((t: MaybeTrail) => ({
      ...t,
      elevations: t.elevations ?? segmentElevationsForPath(t.path),
    }));
  }
  if (fromVersion < 14) {
    // Shipped v11 and v12 saves predate the asset catalog and the new day stats.
    const legacy = persisted as { buildings?: (BuildingId | "lodge")[] };
    p.lodgeTier ??= fresh.lodgeTier;
    p.lodgeUpgrade ??= null;
    if (fromVersion < 11 || !p.assets) {
      p.assets = placedAssetsFromLegacy(legacy.buildings ?? fresh.buildings);
    }
    p.buildings = (legacy.buildings ?? fresh.buildings)
      .filter((id): id is BuildingId => id !== "lodge" && id !== "snow_guns");
    p.dayStats = { ...emptyDayStats(), ...p.dayStats };
    p.trails = (p.trails ?? fresh.trails).map((trail) => ({
      ...trail,
      widths: trail.widths ?? trail.path.map(() => STANDARD_BRUSH_WIDTH),
    }));
    if (fromVersion < 13 || !p.guns) {
      p.guns = legacy.buildings?.includes("snow_guns")
        ? migrateLegacyGuns(p.trails, p.dayIndex ?? 1)
        : [];
      p.gunsVisible = false;
    }
  }
  if (fromVersion < 14) {
    p.clearedCells = [...new Set((p.trails ?? fresh.trails).flatMap((trail) =>
      clearingCells(trail.path, trail.widths ?? trail.path.map(() => STANDARD_BRUSH_WIDTH)),
    ))].sort();
  }
  // A save without rngState gets a fresh random seed; filling it from
  // createInitialState() would put every migrated save on the same seed.
  const rngState = p.rngState ?? Math.floor(Math.random() * 0x100000000);
  return { ...fresh, ...p, rngState };
}
