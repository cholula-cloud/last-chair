import { canTakeSummitLinkEquity } from "./founders";
import { ASSET_CATALOG } from "./base";
import { MOUNTAIN_CALENDARS } from "./calendar";
import { checkLiftLine, MAX_LIFTS, MAX_LIFT_SLOTS } from "./descent";
import { SCHOOL_BUS_PUPILS } from "./schoolContract";
import type { PersistedState } from "./state";
import { TERRAIN, type XZ } from "./terrain";
import { SAT_TERM_KEYS } from "./satisfaction";

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
const weather = oneOf("clear", "snow", "storm", "thaw");
const liftType = oneOf("surface", "chair");
const beat = oneOf("first_load", "saturday", "school_bus", "dry_week", "summit_link", "winter_review");
const founder = nullable(oneOf("elena", "tom", "riley", "amira", "juniper", "marco"));
const summitLinkDecision = oneOf("accepted", "declined");
const surpriseKind = oneOf("pie", "former_regulars", "road_delay");
const assetId: Check = (value) => typeof value === "string" && Object.hasOwn(ASSET_CATALOG, value);
const revenue: Check = (value) => record(value) && Object.entries(value).every(([key, amount]) => assetId(key) && number(amount));

function lift(value: unknown): boolean {
  if (!record(value) || !point(value.anchor) || !liftType(value.type) || !boolean(value.confirmed) ||
      !array(string)(value.queue) || !number(value.dispatchCredit) || !optional(boolean)(value.closing) || !optional(string)(value.name) ||
      !["builtDay", "builtAtMin", "paid"].every((key) => optional(number)(value[key]))) return false;
  const bottom = value.bottom === undefined ? TERRAIN.base : value.bottom;
  return point(bottom) && checkLiftLine({ bottom, top: value.anchor }, TERRAIN, value.type === "chair" ? "chair" : "surface",
    // A save keeps lifts built before the lease existed. Only new placements face the lease.
    { enforceLease: false }).ok;
}

const cell: Check = (value) => typeof value === "string" && /^-?\d+:-?\d+$/.test(value);
const fraction: Check = (value) => number(value) && value >= 0 && value <= 1;
const leg = shape({ trailIndex: index, from: fraction, to: fraction });
const connection = shape({ trailIndex: index, from: fraction, to: fraction, at: point });
const trailShape = shape({
  liftIndex: index, name: string, path: array(point), lengthFt: number, pitch: number,
  difficulty: oneOf("green", "blue", "black"), open: boolean,
  snow: array(shape(numbers("depth", "quality", "coverage"))), elevations: array(number),
  glade: optional(boolean), widths: optional(array(number)), paidClearing: optional(array(cell)),
  links: optional(shape({ start: optional(connection), end: optional(connection), crossings: optional(array(connection)) })),
  groomed: optional(array(boolean)), gunCovered: optional(array(boolean)), previousRuns: optional(index),
  previousSegmentRuns: optional(array(number)),
  builtDay: optional(number), builtAtMin: optional(number), paid: optional(number),
});

const guest = shape({
  id: string, label: string, state: oneOf("pending", "arrive", "queue", "ride", "ski", "walk_lift", "walk_out", "refuel", "depart", "gone"),
  persona: oneOf("first_timer", "regular", "family_pack", "race_kid"),
  ...numbers("progress", "mood", "waitMin", "waitCount", "snowSum", "energy", "runs", "targetRuns", "arriveAtMin", "stateSinceMin"),
  liftIndex: optional(index), trailIndex: optional(index), venueIndex: optional(index),
  skiRoute: optional(shape({ legs: array(leg), current: index, snowFt: number, distanceFt: number })),
  joinedQueueAtMin: optional(number), rideStartMin: optional(number), visitMinutes: optional(number),
  refuelled: optional(boolean), rented: optional(boolean), lesson: optional(boolean), balks: optional(number),
  schoolPupil: optional(boolean), schoolLessonCompleted: optional(boolean),
});
const schoolContract: Check = (value) => record(value) && (
  value.decision === "declined" ||
  (value.decision === "accepted" && integer(value.day) && value.day >= 1 &&
    (value.pupilsTaught === null || (integer(value.pupilsTaught) && value.pupilsTaught >= 0 && value.pupilsTaught <= SCHOOL_BUS_PUPILS))
  ));
const operatingCosts = shape({
  ...numbers("fixed", "founder", "liftOps", "upkeep"),
  vacationStaffing: optional(index),
});
const payable = shape({
  what: (value) => assetId(value) || value === "lift" || value === "lodge",
  liftIndex: optional(index),
  amount: (value) => integer(value) && value > 0,
  dueDay: (value) => integer(value) && value >= 1,
});
const loan = shape({
  principal: (value) => number(value) && value >= 0,
  balance: (value) => number(value) && value > 0,
  ratePerDay: (value) => number(value) && value > 0,
  takenDay: (value) => integer(value) && value >= 1,
});
const recap = shape({
  ...numbers("arrivals", "satisfaction", "cashDelta", "loanReceived", "loanRepaid"), problem: string,
  summitLinkReply: optional(summitLinkDecision),
  costs: nullable(operatingCosts), revenue: nullable(number),
  breakdown: shape(numbers("arrivalMood", "queue", "snow", "value", "runs")),
  facts: shape({
    ...numbers("avgWaitMin", "snowQuality", "farePrice", "hillValue", "runsPerGuest", "turnedAway", "arrivalMood"),
    snowLabel: string, venueRevenue: optional(revenue), balked: optional(number),
    dispatched: optional(index),
    busiestLift: optional(shape({ label: string, min: number })),
    schoolBus: optional(shape({ invited: index, arrived: index, taught: index, ticketRevenue: number })),
  }),
});
const dayStats = shape({
  ...numbers("arrivals", "guestsArrived", "completedRuns", "runsPerGuest", "turnedAway", "peakOnHill", "avgQueueMin",
    "dispatched", "waitSumMin", "maxQueueLength", "peakWaitMin", "refuels", "balked", "seatsFullMin"),
  byLift: array(shape(numbers("rides", "waitSumMin"))), runsByTrail: array(number), venueRevenue: revenue,
  segmentRunsByTrail: optional(array(nullable(array(number)))),
});
const seasonDay = shape({
  closingReputation: optional(number),
  summitLink: optional(shape({ reply: summitLinkDecision, receipt: number, fareCap: nullable(oneOf("balanced")) })),
  lodgeOpening: optional(oneOf(2, 3)), day: index, fare, snow, arrivals: index, satisfaction: number,
  schoolBus: optional(shape({ invited: index, arrived: index, taught: index, ticketRevenue: number })),
});
const broadcast = shape({ id: beat, day: nullable(index) });
const moment = shape({ dayIndex: index, kind: surpriseKind, affectedGuests: index });
const winterRecord = shape({
  completedDays: optional(index), goalMet: optional(boolean), reputation: optional(number),
  days: optional(array(seasonDay)), broadcasts: optional(array(broadcast)), talents: optional(array(string)),
  moments: optional(array(moment)), score: optional(nullable(shape({ satisfaction: number, averageReputation: optional(number), measuredDays: index, total: number }))),
  day: index, founder,
  bankrupt: boolean, ...numbers("cash", "loan", "construction", "netWorth"),
  school: nullable(schoolContract), summitLink: nullable(summitLinkDecision),
  localMoment: nullable(moment),
});

const fields: Record<keyof PersistedState, Check> = {
  mountainId: oneOf(...Object.keys(MOUNTAIN_CALENDARS)),
  dayIndex: (value) => integer(value) && value >= 1,
  clockMin: number,
  phase: oneOf("setup", "day", "night", "winter_review", "mountain2"),
  paused: boolean,
  cash: number,
  payables: array(payable),
  loan: nullable(loan),
  loanTaken: boolean,
  debtMornings: index,
  outcome: oneOf("playing", "finished", "bankrupt"),
  constructionSpent: number,
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
  founderId: founder,
  buildings: array(oneOf("warming_hut", "cafe", "shop", "snow_guns")),
  lodgeTier: oneOf(1, 2, 3),
  lodgeName: optional(string),
  lodgeUpgrade: nullable(shape({ toTier: oneOf(2, 3), nightsRemaining: number })),
  assets: array(shape({ id: assetId, at: point, styleId: string, name: optional(string), attachPad: optional(index), purchase: optional(shape({ day: index, minute: number, price: index })) })),
  guns: array(shape({ at: point, builtDay: number, paid: number, name: optional(string) })),
  clearedCells: array(cell),
  lifts: (value) => Array.isArray(value) && value.length <= MAX_LIFT_SLOTS && value.every(lift) &&
    value.filter((slot) => slot.confirmed).length <= MAX_LIFTS,
  trails: array((value) => trailShape(value) && record(value) && Array.isArray(value.path) && value.path.length >= 2 &&
    Array.isArray(value.snow) && value.snow.length > 0),
  selectedLiftType: liftType,
  talentsOwned: array(string),
  crewPoints: index,
  completedBeats: array(beat),
  summitLinkDecision: nullable(summitLinkDecision),
  tipsSeen: array(string),
  pendingBeat: nullable(beat),
  beatAcknowledged: boolean,
  schoolContract: nullable(schoolContract),
  schoolProgramProven: boolean,
  weather,
  seasonSeed: index,
  weatherDays: array(shape({ kind: weather, wind: oneOf("calm", "gusty") })),
  morningHeadline: string,
  daysWithoutSnow: number,
  reputation: number,
  gunsVisible: boolean,
  groomVisible: boolean,
  seasonLength: (value) => integer(value) && value >= 1,
  rngState: number,
  nightRecap: nullable(recap),
  lastWinter: optional(winterRecord),
  dayHistory: array(shape({ day: index, fare, snow, weather, recap, ...numbers("snowCost", "constructionDue", "closingCash") })),
  seasonDays: array(seasonDay),
  beatLog: array(broadcast),
  career: array(winterRecord),
  surprise: optional(nullable(shape({ dayIndex: index, kind: surpriseKind, guestIds: array(string) }))),
  surpriseLog: optional(array(shape({ dayIndex: index, kind: surpriseKind, affectedGuests: index }))),
  lastDay: nullable(shape({
    snowNightCost: optional(number),
    ...numbers("arrivals", "satisfaction", "cashDelta", "avgWaitMin"), fare, snow,
    observation: optional(shape({ measure: oneOf(...SAT_TERM_KEYS), value: number })),
  })),
  dayStats,
};

export function validateSave(value: unknown): string[] {
  if (!record(value)) return ["invalid save"];
  const errors = Object.entries(fields).flatMap(([key, check]) => check(value[key]) ? [] : [key]);
  if (number(value.dayIndex) && number(value.seasonLength) && value.dayIndex > value.seasonLength) errors.push("dayIndex");
  if (record(value.schoolContract) && value.schoolContract.decision === "accepted" &&
      number(value.schoolContract.day) && number(value.seasonLength) &&
      value.schoolContract.day > value.seasonLength) errors.push("schoolContract");
  if (Array.isArray(value.weatherDays) && (value.weatherDays.length !== value.seasonLength ||
    (integer(value.dayIndex) && value.weatherDays[value.dayIndex - 1]?.kind !== value.weather))) errors.push("weatherDays");
  if (value.phase === "night" && value.nightRecap === null) errors.push("nightRecap");
  const playing = value.phase === "setup" || value.phase === "day" || value.phase === "night";
  if ((playing && value.outcome !== "playing") ||
      (value.phase === "winter_review" && value.outcome === "playing") ||
      (value.phase === "mountain2" && value.outcome !== "finished")) errors.push("outcome");
  if (value.loan && value.loanTaken !== true) errors.push("loanTaken");
  const founderId = typeof value.founderId === "string" ? value.founderId : null;
  if (value.summitLinkDecision === "accepted" &&
      (value.pendingFare === "expensive" || !canTakeSummitLinkEquity({ founderId }))) {
    errors.push("summitLinkDecision");
  }
  if (Array.isArray(value.payables) && Array.isArray(value.lifts) && integer(value.seasonLength)) {
    const maxDueDay = value.seasonLength + 1;
    const liftCount = value.lifts.length;
    if (value.payables.some((item) => record(item) && (
      (integer(item.dueDay) && item.dueDay > maxDueDay) ||
      (item.what === "lift" ? !integer(item.liftIndex) || item.liftIndex >= liftCount : item.liftIndex !== undefined)
    ))) errors.push("payables");
  }
  if (!errors.includes("trails")) {
    const trails = value.trails as PersistedState["trails"];
    if (trails.some(({ links }, i) => {
      if (!links) return false;
      const { start, end, crossings = [] } = links;
      return Boolean((start && (start.trailIndex >= i || start.from !== 0 || start.to <= 0 || start.to >= 1)) ||
        (end && (end.trailIndex >= i || end.from !== 1 || end.to >= 1)) ||
        crossings.some(({ trailIndex, from, to }) => trailIndex >= i || from <= 0 || from >= 1 || to <= 0 || to >= 1));
    })) errors.push("trails");
    if (!errors.includes("guests") && (value.guests as PersistedState["guests"]).some(({ skiRoute, trailIndex, state }) => {
      if (!skiRoute) return false;
      const { legs, current, distanceFt, snowFt } = skiRoute;
      return state !== "ski" || legs.length < 2 || current >= legs.length || trailIndex !== legs[current].trailIndex ||
        distanceFt < 0 || snowFt < 0 ||
        legs.some((leg) => leg.trailIndex >= trails.length || leg.from >= leg.to);
    })) errors.push("guests");
  }
  return errors;
}
