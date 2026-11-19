import type { WinterRecord } from "./winterMemory";
import { DUTCH_HILL_SITE } from "./mountains/dutchHill.site";
import { MOUNTAIN_CALENDARS, type MountainId } from "./calendar";
import type { LodgeTier, LodgeUpgrade, PlacedAsset } from "./base";
import type { Loan, Payable } from "./economy";
import type { ClearingCell } from "./clearing";
import type { SnowGun } from "./guns";
import type { SchoolContract } from "./schoolContract";
import { mix32 } from "./rng";
import { generateSeasonWeather } from "./weather";
import type { LiftAnchor } from "./descent";
import type { XZ } from "./terrain";
import { START_DEPTH, START_QUALITY } from "./snow";
import type { TrailRun } from "./trails";
import { DAY_START_MIN, emptyDayStats, type NightRecap } from "./sim";
import type { SummitLinkDecision } from "./summitLink";
import type { GuestObservation } from "./why";
import type { SurpriseEntry, SurprisePlan } from "./surprises";
import type {
  BuildingId,
  DayStats,
  DayWeather,
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
  snowNightCost?: number;
  arrivals: number;
  satisfaction: number;
  cashDelta: number;
  avgWaitMin: number;
  observation?: GuestObservation;
  /** The fare the day ran at. */
  fare: FarePreset;
  /** The snow & service preset the crew worked the night before. */
  snow: SnowPreset;
};

export type DayReport = {
  day: number;
  fare: FarePreset;
  snow: SnowPreset;
  weather: WeatherKind;
  recap: NightRecap;
  snowCost: number;
  constructionDue: number;
  closingCash: number;
};

export type SeasonDay = Pick<LastDay, "fare" | "snow" | "arrivals" | "satisfaction"> & {
  day: number;
  /** Missing on days settled before daily reputation was recorded. */
  closingReputation?: number;
  lodgeOpening?: LodgeTier;
  schoolBus?: NightRecap["facts"]["schoolBus"];
  summitLink?: { reply: SummitLinkDecision; receipt: number; fareCap: "balanced" | null };
};

/** Everything that is saved between sessions. */
export type PersistedState = {
  mountainId: MountainId;
  dayIndex: number;
  clockMin: number;
  phase: GamePhase;
  paused: boolean;
  cash: number;
  payables: Payable[];
  loan: Loan | null;
  loanTaken: boolean;
  debtMornings: number;
  outcome: "playing" | "finished" | "bankrupt";
  constructionSpent: number;
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
  summitLinkDecision: SummitLinkDecision | null;
  /** Coach tips the player has already seen this winter (see coach.ts). */
  tipsSeen: string[];
  pendingBeat: StoryBeatId | null;
  beatAcknowledged: boolean;
  schoolContract: SchoolContract | null;
  schoolProgramProven: boolean;
  weather: WeatherKind;
  seasonSeed: number;
  /** One actual weather outcome per day in the current winter. */
  weatherDays: DayWeather[];
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
  /** The day's surprise is set with its roster and cleared at closing. */
  surprise: SurprisePlan | null;
  /** Resolved surprises, in the order they were reported on Route 100 Radio. */
  surpriseLog: SurpriseEntry[];
  /** Set at Sleep; shown as deltas on the next night's recap. */
  lastDay: LastDay | null;
  dayHistory: DayReport[];
  seasonDays: SeasonDay[];
  beatLog: { id: StoryBeatId; day: number | null }[];
  career: WinterRecord[];
  lastWinter?: WinterRecord;
  dayStats: DayStats;
};

/** The whole game: saved fields plus per-session display state. */
export type GameState = PersistedState & {
  talentToast: string | null;
};

export const DEFAULT_SEED = 1;

export const OPENING_HEADLINE = "Dutch Hill has a lodge. Build a lift and paint a trail to open.";

export function createInitialState(seed: number = DEFAULT_SEED): GameState {
  const mountainId = "dutch_hill";
  const seasonLength = MOUNTAIN_CALENDARS[mountainId].length;
  const seasonSeed = mix32(seed);
  const weatherDays = generateSeasonWeather(seasonSeed, seasonLength);
  return {
    mountainId,
    dayIndex: 1,
    clockMin: DAY_START_MIN,
    phase: "setup",
    paused: true,
    cash: 12000,
    payables: [],
    loan: null,
    loanTaken: false,
    debtMornings: 0,
    outcome: "playing",
    constructionSpent: 0,
    fare: "balanced",
    snow: "mid",
    snowQuality: START_QUALITY,
    snowDepth: START_DEPTH,
    gunReach: 0,
    guests: [],
    followId: null,
    nightRecap: null,
    surprise: null,
    surpriseLog: [],
    dayHistory: [],
    seasonDays: [],
    beatLog: [],
    career: [],
    lastDay: null,
    dayStats: emptyDayStats(),
    pendingFare: "balanced",
    pendingSnow: "mid",
    buildMode: false,
    founderId: null,
    buildings: [],
    lodgeTier: DUTCH_HILL_SITE.buildings.lodge.startingTier,
    lodgeUpgrade: null,
    assets: [],
    guns: [],
    clearedCells: [],
    lifts: [],
    trails: [],
    selectedLiftType: "surface",
    talentsOwned: [],
    completedBeats: [],
    summitLinkDecision: null,
    tipsSeen: [],
    pendingBeat: null,
    beatAcknowledged: true,
    schoolContract: null,
    schoolProgramProven: false,
    weather: weatherDays[0].kind,
    seasonSeed,
    weatherDays,
    morningHeadline: OPENING_HEADLINE,
    daysWithoutSnow: 0,
    reputation: 40,
    gunsVisible: false,
    groomVisible: false,
    seasonLength,
    talentToast: null,
    rngState: seed >>> 0,
  };
}

export function toPersisted(state: PersistedState): PersistedState {
  return {
    mountainId: state.mountainId,
    dayHistory: state.dayHistory,
    seasonDays: state.seasonDays,
    beatLog: state.beatLog,
    career: state.career,
    dayIndex: state.dayIndex,
    clockMin: state.clockMin,
    phase: state.phase,
    paused: state.paused,
    cash: state.cash,
    payables: state.payables,
    loan: state.loan,
    loanTaken: state.loanTaken,
    debtMornings: state.debtMornings,
    outcome: state.outcome,
    constructionSpent: state.constructionSpent,
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
    summitLinkDecision: state.summitLinkDecision,
    tipsSeen: state.tipsSeen,
    pendingBeat: state.pendingBeat,
    beatAcknowledged: state.beatAcknowledged,
    schoolContract: state.schoolContract,
    schoolProgramProven: state.schoolProgramProven,
    weather: state.weather,
    seasonSeed: state.seasonSeed,
    weatherDays: state.weatherDays,
    morningHeadline: state.morningHeadline,
    daysWithoutSnow: state.daysWithoutSnow,
    reputation: state.reputation,
    gunsVisible: state.gunsVisible,
    groomVisible: state.groomVisible,
    seasonLength: state.seasonLength,
    rngState: state.rngState,
    nightRecap: state.nightRecap,
    surprise: state.surprise ?? null,
    surpriseLog: state.surpriseLog ?? [],
    lastDay: state.lastDay,
    ...(state.lastWinter ? { lastWinter: state.lastWinter } : {}),
    dayStats: state.dayStats,
  };
}

/** Merge a validated saved slice into the current session. */
export function hydrate<T extends GameState>(p: PersistedState | undefined, current: T): T {
  if (!p) return current;
  return { ...current, ...p, lastWinter: p.lastWinter, phase: p.founderId ? p.phase : "setup" };
}

/** M3 starts with a clean hill and a separate save slot. */
export const SAVE_KEY = "last-chair-m3";
export const SAVE_VERSION = 8;
