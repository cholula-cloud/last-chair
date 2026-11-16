import { LIFT_PREVIEW_SLOTS, type LiftAnchor } from "./descent";
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

export type LiftSlot = {
  type: LiftType;
  anchor: LiftAnchor;
  confirmed: boolean;
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
  snowQuality: number;
  snowDepth: number;
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
};

/** The whole game: saved fields plus per-session display state. */
export type GameState = PersistedState & {
  nightRecap: NightRecap | null;
  dayStats: DayStats;
  talentToast: string | null;
};

export const DEFAULT_SEED = 1;

export function defaultLifts(): LiftSlot[] {
  return [
    {
      type: "surface",
      anchor: LIFT_PREVIEW_SLOTS[0] ?? { x: -1.2, z: 0.2 },
      confirmed: true,
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
    snowQuality: 0.55,
    snowDepth: 0.45,
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
  };
}

/** Merge a saved slice into the current state. Saves without `rngState` keep the current one. */
export function hydrate<T extends GameState>(persisted: unknown, current: T): T {
  const p = persisted as Partial<PersistedState> | undefined;
  if (!p) return current;
  // PR 4: a save made during the night should apply the night's cash instead of
  // jumping back to the day. Kept as is for PR 3 (zero behavior change).
  if (p.phase === "night") {
    return {
      ...current,
      ...p,
      nightRecap: null,
      phase: "day" as const,
      pendingBeat: null,
      beatAcknowledged: true,
    };
  }
  if (p.phase === "setup" || !p.founderId) {
    return { ...current, ...p, phase: "setup" as const };
  }
  return { ...current, ...p };
}
