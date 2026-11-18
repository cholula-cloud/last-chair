import { ASSET_CATALOG } from "./base";
import { checkLiftLine, MAX_LIFTS, MAX_LIFT_SLOTS } from "./descent";
import type { PersistedState } from "./state";
import { TERRAIN, type XZ } from "./terrain";

type Check = (value: unknown) => boolean;

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const number = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const integer = (value: unknown): value is number => number(value) && Number.isInteger(value);
const index: Check = (value) => integer(value) && value >= 0;
const string: Check = (value) => typeof value === "string";
const boolean: Check = (value) => typeof value === "boolean";
const oneOf = (...values: (string | number)[]): Check => (value) => values.some((entry) => entry === value);
const nullable = (check: Check): Check => (value) => value === null || check(value);
const optional = (check: Check): Check => (value) => value === undefined || check(value);
const array = (check: Check): Check => (value) => Array.isArray(value) && value.every(check);
const shape = (fields: Record<string, Check>): Check => (value) =>
  record(value) && Object.entries(fields).every(([key, check]) => check(value[key]));
const numbers = (...names: string[]): Record<string, Check> => Object.fromEntries(names.map((name) => [name, number]));

const point = (value: unknown): value is XZ => record(value) && number(value.x) && number(value.z);
const fare = oneOf("cheap", "balanced", "expensive");
const snow = oneOf("minimal", "mid", "high");
const liftType = oneOf("surface", "chair");
const beat = oneOf("first_load", "saturday", "school_bus", "dry_week", "summit_link", "winter_review");
const assetId: Check = (value) => typeof value === "string" && Object.hasOwn(ASSET_CATALOG, value);
const revenue: Check = (value) => record(value) && Object.entries(value).every(([key, amount]) => assetId(key) && number(amount));

function lift(value: unknown): boolean {
  if (!record(value) || !point(value.anchor) || !liftType(value.type) || !boolean(value.confirmed) ||
      !array(string)(value.queue) || !number(value.dispatchCredit) || !optional(boolean)(value.closing) ||
      !["builtDay", "builtAtMin", "paid"].every((key) => optional(number)(value[key]))) return false;
  const bottom = value.bottom === undefined ? TERRAIN.base : value.bottom;
  return point(bottom) && checkLiftLine({ bottom, top: value.anchor }, TERRAIN, value.type === "chair" ? "chair" : "surface").ok;
}

const cell: Check = (value) => typeof value === "string" && /^-?\d+:-?\d+$/.test(value);
const trailShape = shape({
  liftIndex: index, name: string, path: array(point), lengthFt: number, pitch: number,
  difficulty: oneOf("green", "blue", "black"), open: boolean,
  snow: array(shape(numbers("depth", "quality", "coverage"))), elevations: array(number),
  widths: optional(array(number)), paidClearing: optional(array(cell)),
  groomed: optional(array(boolean)), gunCovered: optional(array(boolean)),
  builtDay: optional(number), builtAtMin: optional(number), paid: optional(number),
});

const guest = shape({
  id: string, label: string, state: oneOf("pending", "arrive", "queue", "ride", "ski", "refuel", "depart", "gone"),
  persona: oneOf("first_timer", "regular"),
  ...numbers("progress", "mood", "waitMin", "waitCount", "snowSum", "energy", "runs", "targetRuns", "arriveAtMin", "stateSinceMin"),
  liftIndex: optional(index), trailIndex: optional(index), venueIndex: optional(index),
  joinedQueueAtMin: optional(number), rideStartMin: optional(number), visitMinutes: optional(number),
  refuelled: optional(boolean), rented: optional(boolean), lesson: optional(boolean), balks: optional(number),
});
const recap = shape({
  ...numbers("arrivals", "satisfaction", "cashDelta"), problem: string,
  breakdown: shape(numbers("arrivalMood", "queue", "snow", "value", "runs")),
  facts: shape({
    ...numbers("avgWaitMin", "snowQuality", "farePrice", "hillValue", "runsPerGuest", "turnedAway", "arrivalMood"),
    snowLabel: string, venueRevenue: optional(revenue), balked: optional(number),
    busiestLift: optional(shape({ label: string, min: number })),
  }),
});
const dayStats = shape({
  ...numbers("arrivals", "guestsArrived", "completedRuns", "runsPerGuest", "turnedAway", "peakOnHill", "avgQueueMin",
    "dispatched", "waitSumMin", "maxQueueLength", "peakWaitMin", "refuels", "balked", "seatsFullMin"),
  byLift: array(shape(numbers("rides", "waitSumMin"))), runsByTrail: array(number), venueRevenue: revenue,
});
const fields: Record<keyof PersistedState, Check> = {
  dayIndex: (value) => integer(value) && value >= 1,
  clockMin: number,
  phase: oneOf("setup", "day", "night", "winter_review", "mountain2"),
  paused: boolean,
  cash: number,
  fare,
  snow,
  snowQuality: number,
  snowDepth: number,
  gunReach: number,
  guests: array(guest),
  followId: nullable(string),
  pendingFare: fare,
  pendingSnow: snow,
  buildMode: boolean,
  founderId: nullable(oneOf("elena", "tom", "riley", "amira", "juniper", "marco")),
  buildings: array(oneOf("warming_hut", "cafe", "shop", "snow_guns")),
  lodgeTier: oneOf(1, 2, 3),
  lodgeUpgrade: nullable(shape({ toTier: oneOf(2, 3), nightsRemaining: number })),
  assets: array(shape({ id: assetId, at: point, styleId: string, attachPad: optional(index) })),
  guns: array(shape({ at: point, builtDay: number, paid: number })),
  clearedCells: array(cell),
  lifts: (value) => Array.isArray(value) && value.length <= MAX_LIFT_SLOTS && value.every(lift) &&
    value.filter((slot) => slot.confirmed).length <= MAX_LIFTS,
  trails: array((value) => trailShape(value) && record(value) && Array.isArray(value.path) && value.path.length >= 2 &&
    Array.isArray(value.snow) && value.snow.length > 0),
  selectedLiftType: liftType,
  talentsOwned: array(string),
  completedBeats: array(beat),
  pendingBeat: nullable(beat),
  beatAcknowledged: boolean,
  weather: oneOf("snow", "clear", "thaw"),
  morningHeadline: string,
  daysWithoutSnow: number,
  reputation: number,
  gunsVisible: boolean,
  groomVisible: boolean,
  seasonLength: (value) => integer(value) && value >= 1,
  rngState: number,
  nightRecap: nullable(recap),
  lastDay: nullable(shape({ ...numbers("arrivals", "satisfaction", "cashDelta", "avgWaitMin"), fare, snow })),
  dayStats,
};

export function validateSave(value: unknown): string[] {
  if (!record(value)) return ["invalid save"];
  const errors = Object.entries(fields).flatMap(([key, check]) => check(value[key]) ? [] : [key]);
  if (number(value.dayIndex) && number(value.seasonLength) && value.dayIndex > value.seasonLength) errors.push("dayIndex");
  if (value.phase === "night" && value.nightRecap === null) errors.push("nightRecap");
  return errors;
}
