export type FarePreset = "cheap" | "balanced" | "expensive";
export type SnowPreset = "minimal" | "mid" | "high";
export type GamePhase =
  | "setup"
  | "day"
  | "night"
  | "winter_review"
  | "mountain2";
export type GuestState =
  | "arrive"
  | "queue"
  | "ride"
  | "ski"
  | "depart";
export type LiftType = "surface" | "chair";
export type WeatherKind = "snow" | "clear" | "thaw";
export type BuildingId = "warming_hut" | "lodge" | "cafe" | "shop" | "snow_guns";
export type FounderId =
  | "elena"
  | "tom"
  | "riley"
  | "amira"
  | "juniper"
  | "marco";
export type StoryBeatId =
  | "first_load"
  | "saturday"
  | "school_bus"
  | "dry_week"
  | "summit_link"
  | "winter_review";

export type Guest = {
  id: string;
  label: string;
  state: GuestState;
  progress: number;
  mood: number;
  /** Index into `GameState.lifts` of the lift this guest last queued for or rode. */
  liftIndex?: number;
  /** Game clock minute at which the guest joined the lift queue. */
  joinedQueueAtMin?: number;
  /** Game clock minute at which the guest was dispatched onto the lift. */
  rideStartMin?: number;
};

export type DayStats = {
  arrivals: number;
  completedRuns: number;
  /** Mean measured wait (game minutes) of guests dispatched today; 0 before the first dispatch. */
  avgQueueMin: number;
  /** Guests dispatched onto a lift today. */
  dispatched: number;
  /** Sum of the measured waits of those guests, in game minutes. */
  waitSumMin: number;
  /** Longest single lift queue seen today, in guests. */
  maxQueueLength: number;
  /** Longest measured wait of any dispatched guest today, in game minutes. */
  peakWaitMin: number;
};

export type FounderDef = {
  id: FounderId;
  name: string;
  title: string;
  blurb: string;
  arrivalMoodBonus: number;
  fixedCostDelta: number;
  snowExpectationPenalty: number;
};

export type TalentDef = {
  id: string;
  name: string;
  effect: string;
};

export type StoryBeatDef = {
  id: StoryBeatId;
  title: string;
  radio: string;
};

export const FARE_PRICES: Record<FarePreset, number> = {
  cheap: 35,
  balanced: 48,
  expensive: 62,
};

export const FARE_LABELS: Record<FarePreset, string> = {
  cheap: "Cheap",
  balanced: "Balanced",
  expensive: "Expensive",
};

export const SNOW_LABELS: Record<SnowPreset, string> = {
  minimal: "Minimal",
  mid: "Mid",
  high: "High",
};

export const SNOW_NIGHT_COST: Record<SnowPreset, number> = {
  minimal: 0,
  mid: 150,
  high: 350,
};

export const LIFT_LABELS: Record<LiftType, string> = {
  surface: "Surface lift",
  chair: "Double chair",
};

/** Game-scaled lift server numbers (see SIMULATION_SPEC, Lifts). */
export const LIFT_SPECS: Record<
  LiftType,
  { capacityPerHour: number; rideMinutes: number }
> = {
  surface: { capacityPerHour: 70, rideMinutes: 4 },
  chair: { capacityPerHour: 110, rideMinutes: 3 },
};

export const LIFT_BUILD_COST: Record<LiftType, number> = {
  surface: 0,
  chair: 2500,
};

export const BUILDING_LABELS: Record<BuildingId, string> = {
  warming_hut: "Warming hut",
  lodge: "Lodge (step 1)",
  cafe: "Café",
  shop: "Shop",
  snow_guns: "Snow guns",
};

export const BUILDING_COSTS: Record<BuildingId, number> = {
  warming_hut: 0,
  lodge: 1800,
  cafe: 1200,
  shop: 900,
  snow_guns: 2200,
};

export const DAY_START_MIN = 6 * 60;
export const DAY_END_MIN = 16 * 60;
export const MS_PER_GAME_MINUTE = 500;
/** Internal P1 shortcut; scale to 28 for ship. */
export const SEASON_LENGTH = 14;
export const DAILY_FIXED_COST = 400;
export const LIFT_OPS_COST = 180;
