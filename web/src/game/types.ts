import { clearingCostFor } from "./founders";
import { TALENT } from "./talents";
import { DUTCH_HILL_CALENDAR } from "./calendar";
import { liftLength, liftVertical, type LiftLine } from "./descent";
import { TERRAIN, type Terrain } from "./terrain";

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
  | "walk_lift"
  | "walk_out"
  | "refuel"
  | "depart"
  /** Left the car park for home; terminal, not drawn. */
  | "gone";
export type PersonaId = "first_timer" | "regular" | "family_pack" | "race_kid";
export type TrailDifficulty = "green" | "blue" | "black";
export type LiftType = "surface" | "chair";
export type WeatherKind = "clear" | "snow" | "storm" | "thaw";
export type Wind = "calm" | "gusty";
export type DayWeather = { kind: WeatherKind; wind: Wind };
export type Outlook = Record<WeatherKind, number>;
export type BuildingId = "warming_hut" | "cafe" | "shop" | "snow_guns";
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
  | "groomer_down"
  | "summit_link"
  | "winter_review";

export type SkiLeg = { trailIndex: number; from: number; to: number };

export type Guest = {
  id: string;
  label: string;
  state: GuestState;
  progress: number;
  /** Starting disposition drawn with the roster (0–1). The live score is derived: see satisfaction.ts. */
  mood: number;
  venueIndex?: number;
  visitMinutes?: number;
  refuelled?: boolean;
  rented?: boolean;
  lesson?: boolean;
  schoolPupil?: boolean;
  schoolLessonCompleted?: boolean;
  balks?: number;
  /** Index into `GameState.lifts` of the lift this guest last queued for or rode. */
  liftIndex?: number;
  /** Index into `GameState.trails` for the run in progress (set when unloading). */
  trailIndex?: number;
  /** Multi-trail descent selected at unloading. The guest's progress is local to its current leg. */
  skiRoute?: { legs: SkiLeg[]; current: number; snowFt: number; distanceFt: number };
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
  byLift: { rides: number; waitSumMin: number }[];
  /** Descents that used each trail. A single descent may use several trails. */
  runsByTrail: number[];
  /** Full-pass equivalents by snow segment for trails that were skied in portions. */
  segmentRunsByTrail?: (number[] | null)[];
  venueRevenue: Partial<Record<import("./base").AssetId, number>>;
  refuels: number;
  balked: number;
  seatsFullMin: number;
  /** Lift ticket base share posted to cash on public arrival. */
  ticketBasePosted?: number;
  /** School bus fares posted to cash on pupil arrival. */
  schoolBusPosted?: number;
  /** Guest revenue posted during the day (venue + tickets). */
  intradayRevenue?: boolean;
  /** Operating bonus and costs applied at close. */
  operatingSettled?: boolean;
};

export type FounderDef = {
  id: FounderId;
  name: string;
  title: string;
  relationship: string;
  bonus: string;
  constraint: string;
  arrivalMoodBonus: number;
  fixedCostDelta: number;
  snowExpectationPenalty: number;
  loanRateDelta: number;
  /** Tom: arrival mood lost on a thaw day in a warm week. */
  warmWeekMoodPenalty: number;
  /** Riley: share taken off lift operating cost (the overnight repair crew). */
  liftOpsDiscount: number;
  /** Riley: SummitLink cannot buy in. The SummitLink offer (row 23) reads this. */
  noSummitLinkEquity: boolean;
  /** Amira: how many days ahead the forecast reaches. */
  forecastDays: 1 | 2;
  /** Amira: how much of tomorrow's true weather the forecast knows (0 to 1). */
  forecastSkill: number;
  /** Juniper: reputation gained each night before rounding. */
  reputationDrift: number;
  /** Juniper: multiplier on lift and trail clearing cost. */
  clearingCostMult: number;
  /** Marco: multiplier on venue revenue. */
  apresRevenueMult: number;
  /** Elena: buildings that cannot be demolished. */
  lockedBuildings: readonly import("./base").AssetId[];
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

export function snowNightCost(preset: SnowPreset, owned: readonly string[], hasGarage = true): number {
  if (hasGarage && TALENT.groomerRebuild.learned(owned) && preset !== "minimal") return TALENT.groomerRebuild[preset];
  return SNOW_NIGHT_COST[preset];
}

export const LIFT_LABELS: Record<LiftType, string> = {
  surface: "Surface lift",
  chair: "Double chair",
};

/** Game-scaled lift server numbers (see SIMULATION_SPEC, Lifts). */
export const LIFT_SPECS: Record<
  LiftType,
  { capacityPerHour: number; rideMinutes: number; windHold: boolean }
> = {
  surface: { capacityPerHour: 47, rideMinutes: 4, windHold: false },
  chair: { capacityPerHour: 50, rideMinutes: 3, windHold: true },
};

/**
 * Build cost per lift type: `base + perLength * length + perVertical * vertical`,
 * rounded to $50. Chair at Mid (length 1.98, vertical 0.99) comes to exactly $2,500.
 */
export const LIFT_COST_PARAMS: Record<LiftType, { base: number; perLength: number; perVertical: number }> = {
  surface: { base: 300, perLength: 250, perVertical: 150 },
  chair: { base: 1000, perLength: 500, perVertical: 500 },
};

/** Prices in design units: world length and vertical are divided by H and V first. */
export function liftCost(type: LiftType, line: LiftLine, terrain: Terrain = TERRAIN, founder?: FounderId | null): number {
  const { base, perLength, perVertical } = LIFT_COST_PARAMS[type];
  const { horizontal: H, vertical: V } = terrain.scale;
  const raw = base + perLength * (liftLength(line) / H) + perVertical * (liftVertical(line, terrain) / V);
  const standard = Math.round(raw / 50) * 50;
  return clearingCostFor(founder ?? null, standard, 50);
}

export const BUILDING_LABELS: Record<BuildingId, string> = {
  warming_hut: "Warming hut",
  cafe: "Café",
  shop: "Ski shop",
  snow_guns: "Snow guns",
};

export const BUILDING_COSTS: Record<BuildingId, number> = {
  warming_hut: 0,
  cafe: 1200,
  shop: 900,
  snow_guns: 2200,
};

export const DAY_START_MIN = 7 * 60 + 30;
export const DAY_END_MIN = 16 * 60;
/** Extended closing clock on Mount Tom when Holyoke range lights are active. */
export const NIGHT_SESSION_END_MIN = 18 * 60 + 30;
/** Lifts stop loading; anyone still in a line goes home. */
export const LIFT_CLOSE_MIN = 15 * 60 + 45;
/** Guests reach the hill between these clock minutes, most around the peak. */
export const ARRIVAL_EARLIEST_MIN = 8 * 60;
export const ARRIVAL_PEAK_MIN = 9 * 60 + 30;
export const ARRIVAL_LATEST_MIN = 13 * 60 + 30;
/** Early birds: a share of guests who arrive for first chair, a triangle 08:00–10:00 peaking at 09:00. */
export const ARRIVAL_EARLY_SHARE = 0.3;
export const ARRIVAL_EARLY_PEAK_MIN = 9 * 60;
export const ARRIVAL_EARLY_LATEST_MIN = 10 * 60;
/** Walk between the car park and the lift line (arriving) or the lodge and the car park (departing). */
export const ARRIVE_WALK_MIN = 3;
export const DEPART_WALK_MIN = 3;
export const MS_PER_GAME_MINUTE = 120_000 / (DAY_END_MIN - DAY_START_MIN);
/** Internal P1 shortcut; scale to 28 for ship. */
export const SEASON_LENGTH = DUTCH_HILL_CALENDAR.length;
export const DAILY_FIXED_COST = 1095;
export const LIFT_OPS_COST = 180;
