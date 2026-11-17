export type FarePreset = "cheap" | "balanced" | "expensive";
export type SnowPreset = "minimal" | "mid" | "high";
export type GamePhase =
  | "setup"
  | "day"
  | "night"
  | "winter_review"
  | "mountain2";
export type GuestState =
  /** On the day's roster but not at the hill yet; not drawn. */
  | "pending"
  | "arrive"
  | "queue"
  | "ride"
  | "ski"
  | "depart"
  /** Left the car park for home; terminal, not drawn. */
  | "gone";
export type PersonaId = "first_timer" | "regular";
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
  /** Starting disposition drawn with the roster (0–1). The live score is derived: see satisfaction.ts. */
  mood: number;
  /** Index into `GameState.lifts` of the lift this guest last queued for or rode. */
  liftIndex?: number;
  /** Game clock minute at which the guest joined the lift queue. */
  joinedQueueAtMin?: number;
  /** Game clock minute at which the guest was dispatched onto the lift. */
  rideStartMin?: number;
  /** Game minutes this guest has waited in lift lines today (completed waits). */
  waitMin: number;
  /** Number of completed waits in `waitMin` (rides, plus a line left at closing). */
  waitCount: number;
  /** Sum of the snow quality (0–1) under each finished run today. */
  snowSum: number;
  persona: PersonaId;
  /** 1 = fresh, 0 or below = done for the day. */
  energy: number;
  /** Finished ski runs today. */
  runs: number;
  /** Runs this guest wants before heading home. */
  targetRuns: number;
  /** Game clock minute at which the guest reaches the hill. */
  arriveAtMin: number;
  /** Game clock minute at which the guest entered their current timed state (arrive, ski, depart). */
  stateSinceMin: number;
};

export type DayStats = {
  /** Guests on today's roster (planned by `planArrivals`). */
  arrivals: number;
  /** Roster guests who have reached the hill so far. */
  guestsArrived: number;
  /** Finished ski runs today. */
  completedRuns: number;
  /** `completedRuns / guestsArrived`; 0 before anyone arrives. */
  runsPerGuest: number;
  /** Guests sent home from the lift line at closing without a single ride. */
  turnedAway: number;
  /** Most guests on the hill (arriving, queueing, riding or skiing) at once. */
  peakOnHill: number;
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
  surface: { capacityPerHour: 52, rideMinutes: 4 },
  chair: { capacityPerHour: 56, rideMinutes: 3 },
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

export const DAY_START_MIN = 7 * 60 + 30;
export const DAY_END_MIN = 16 * 60;
/** Lifts stop loading; anyone still in a line goes home. */
export const LIFT_CLOSE_MIN = 15 * 60 + 45;
/** Guests reach the hill between these clock minutes, most around the peak. */
export const ARRIVAL_EARLIEST_MIN = 8 * 60;
export const ARRIVAL_PEAK_MIN = 10 * 60;
export const ARRIVAL_LATEST_MIN = 14 * 60;
/** Walk between the car park and the lift line (arriving) or the lodge and the car park (departing). */
export const ARRIVE_WALK_MIN = 3;
export const DEPART_WALK_MIN = 3;
export const MS_PER_GAME_MINUTE = 500;
/** Internal P1 shortcut; scale to 28 for ship. */
export const SEASON_LENGTH = 14;
export const DAILY_FIXED_COST = 750;
export const LIFT_OPS_COST = 180;
