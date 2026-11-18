import { DUTCH_HILL_SITE } from "./mountains/dutchHill.site";
import { placedAssetsFromLegacy, type LodgeTier, type LodgeUpgrade, type PlacedAsset } from "./base";
import { clearingCells, type ClearingCell } from "./clearing";
import type { SnowGun } from "./guns";
import { STANDARD_BRUSH_WIDTH } from "./paintedTrail";
import { REFERENCE_TOPS, type LiftAnchor } from "./descent";
import type { XZ } from "./terrain";
import { START_DEPTH, START_QUALITY } from "./snow";
import { defaultTrails, type TrailRun } from "./trails";
import { DAY_START_MIN, SEASON_LENGTH, emptyDayStats, type NightRecap } from "./sim";
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

/** Merge a validated saved slice into the current session. */
export function hydrate<T extends GameState>(p: PersistedState | undefined, current: T): T {
  if (!p) return current;
  if (p.phase === "setup" || !p.founderId) {
    return { ...current, ...p, phase: "setup" as const };
  }
  return { ...current, ...p };
}

/** Storage key stays `last-chair-v1` so existing saves load; the schema version is separate. */
export const SAVE_KEY = "last-chair-v1";
export const SAVE_VERSION = 14;
