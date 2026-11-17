import { CREW_TALENTS, STORY_BEATS, founderById } from "./content";
import { PERSONAS, skiMinutes } from "./personas";
import {
  deriveSnow,
  gunReach,
  overnightTrail,
  type Trail,
} from "./snow";
import {
  expectedHillValue,
  problemLine,
  type DaySatisfaction,
  type SatTerms,
} from "./satisfaction";
import {
  ARRIVAL_EARLIEST_MIN,
  ARRIVAL_LATEST_MIN,
  ARRIVAL_PEAK_MIN,
  ARRIVE_WALK_MIN,
  DEPART_WALK_MIN,
  LIFT_CLOSE_MIN,
  DAILY_FIXED_COST,
  DAY_END_MIN,
  DAY_START_MIN,
  FARE_PRICES,
  LIFT_OPS_COST,
  SEASON_LENGTH,
  SNOW_NIGHT_COST,
  type BuildingId,
  type DayStats,
  type FarePreset,
  type FounderId,
  type Guest,
  type PersonaId,
  type SnowPreset,
  type StoryBeatId,
  type WeatherKind,
} from "./types";

export function formatClock(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function weekdayLabel(dayIndex: number): string {
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return names[(dayIndex - 1) % 7] ?? "Mon";
}

export function isWeekend(dayIndex: number): boolean {
  const d = (dayIndex - 1) % 7;
  return d === 5 || d === 6;
}

export type Rand = () => number;

/**
 * Arrival minute from a triangular curve over the arrival window, peaking at
 * ARRIVAL_PEAK_MIN: a slow trickle from 08:00, a mid-morning rush, a long tail to 14:00.
 */
export function drawArrivalMin(rand: Rand): number {
  return (triangular(rand) + triangular(rand)) / 2;
}

function triangular(rand: Rand): number {
  const a = ARRIVAL_EARLIEST_MIN;
  const b = ARRIVAL_LATEST_MIN;
  const c = ARRIVAL_PEAK_MIN;
  const u = rand();
  const split = (c - a) / (b - a);
  return u < split
    ? a + Math.sqrt(u * (b - a) * (c - a))
    : b - Math.sqrt((1 - u) * (b - a) * (b - c));
}

/** A guest at the car park door with the given persona; `over` overrides any field (tests, migration). */
export function makeGuest(over: Partial<Guest> = {}): Guest {
  const persona = over.persona ?? "regular";
  const def = PERSONAS[persona];
  return {
    id: "g",
    label: "Guest",
    state: "arrive",
    progress: 0,
    mood: 0.8,
    persona,
    energy: def.startEnergy,
    runs: 0,
    targetRuns: def.targetRuns[1],
    waitMin: 0,
    waitCount: 0,
    snowSum: 0,
    arriveAtMin: DAY_START_MIN,
    stateSinceMin: DAY_START_MIN,
    ...over,
  };
}

/**
 * The whole day's roster, all "pending", sorted by arrival time. Persona, target
 * runs and arrival minute are drawn per guest from `rand`.
 */
export function createInitialGuests(
  count: number,
  rand: Rand = Math.random,
  weekend = false,
): Guest[] {
  const seed = daySeed(rand);
  const firstShare = weekend
    ? PERSONAS.first_timer.weekendShare
    : PERSONAS.first_timer.weekdayShare;
  const drawn = Array.from({ length: count }, (_, i) => {
    const persona: PersonaId = rand() < firstShare ? "first_timer" : "regular";
    const [lo, hi] = PERSONAS[persona].targetRuns;
    const targetRuns = lo + Math.floor(rand() * (hi - lo + 1));
    const arriveAtMin = drawArrivalMin(rand);
    const mood = 0.7 + rand() * 0.2;
    return { i, persona, targetRuns, arriveAtMin, mood };
  });
  drawn.sort((x, y) => x.arriveAtMin - y.arriveAtMin);
  return drawn.map((d, rank) =>
    makeGuest({
      id: `g-${seed}-${d.i}`,
      label: `${PERSONAS[d.persona].label} ${rank + 1}`,
      state: "pending",
      mood: d.mood,
      persona: d.persona,
      targetRuns: d.targetRuns,
      arriveAtMin: d.arriveAtMin,
      stateSinceMin: d.arriveAtMin,
    }),
  );
}

function daySeed(rand: Rand): string {
  return rand().toString(36).slice(2, 7);
}

/** Guests on the hill: walking in, in a line, on a lift or skiing. */
export function isOnHill(g: Guest): boolean {
  return g.state === "arrive" || g.state === "queue" || g.state === "ride" || g.state === "ski";
}

export type GuestClock = {
  /** Game clock minute at the end of this step. */
  now: number;
  snowQuality: number;
  /** Experienced snow per lift index (see snow.ts `experiencedSnow`); falls back to `snowQuality`. */
  snowByLift?: number[];
  /** Expected wait plus ride time for the next lap at the best open lift (Infinity with none). */
  lapOverheadMin: number;
};

/**
 * Advance guests that move on their own clock: pending guests arrive on their
 * minute, arrivals walk to the line, skiers finish runs, departers walk to the
 * car park. Queueing and riding belong to the lifts (`stepLifts`). Each timed
 * state's `progress` is elapsed / duration. At the bottom of a run the guest
 * goes home if tired, if they have done their runs, or if another lap cannot
 * finish before the lifts close; otherwise they queue again. Lifts stop
 * loading at LIFT_CLOSE_MIN, so anyone still in a line goes home.
 */
export function tickGuests(guests: Guest[], clock: GuestClock): Guest[] {
  const { now } = clock;
  const goHome = (g: Guest, over: Partial<Guest> = {}): Guest => {
    // Sent home from a line: the wait so far counts as a completed wait.
    const left =
      g.state === "queue" && g.joinedQueueAtMin !== undefined
        ? { waitMin: g.waitMin + (now - g.joinedQueueAtMin), waitCount: g.waitCount + 1 }
        : {};
    return { ...g, ...left, ...over, state: "depart", progress: 0, stateSinceMin: now };
  };
  /** Back in line: the next wait starts when stepLifts seats the guest in a lift queue. */
  const joinLine = (g: Guest, over: Partial<Guest> = {}): Guest => {
    const next: Guest = { ...g, ...over, state: "queue", progress: 0 };
    delete next.joinedQueueAtMin;
    return next;
  };

  return guests.map((g) => {
    switch (g.state) {
      case "pending":
        return now >= g.arriveAtMin
          ? { ...g, state: "arrive", progress: 0, stateSinceMin: now }
          : g;
      case "arrive": {
        const progress = (now - g.stateSinceMin) / ARRIVE_WALK_MIN;
        if (progress < 1) return { ...g, progress };
        return now >= LIFT_CLOSE_MIN ? goHome(g) : joinLine(g);
      }
      case "queue":
        return now >= LIFT_CLOSE_MIN ? goHome(g) : g;
      case "ski": {
        const q = clock.snowByLift?.[g.liftIndex ?? 0] ?? clock.snowQuality;
        const duration = skiMinutes(g.persona, q);
        const progress = (now - g.stateSinceMin) / duration;
        if (progress < 1) return { ...g, progress };
        const runs = g.runs + 1;
        const energy = g.energy - PERSONAS[g.persona].energyPerRun;
        const done = { runs, energy, snowSum: g.snowSum + q };
        const lapEnds = now + clock.lapOverheadMin + duration;
        if (energy <= 1e-9 || runs >= g.targetRuns || lapEnds > LIFT_CLOSE_MIN) {
          return goHome(g, done);
        }
        return joinLine(g, done);
      }
      case "depart": {
        const progress = (now - g.stateSinceMin) / DEPART_WALK_MIN;
        return progress >= 1 ? { ...g, state: "gone", progress: 0 } : { ...g, progress };
      }
      default:
        return g;
    }
  });
}

export function computeDayRevenue(
  fare: FarePreset,
  satisfaction: number,
  arrivals: number,
): number {
  const mult = 0.75 + (satisfaction / 100) * 0.35;
  return Math.round(arrivals * FARE_PRICES[fare] * mult);
}

/** The real numbers behind the breakdown, so "Why?" can quote them. */
export type RecapFacts = {
  /** Mean measured wait per ride, game minutes. */
  avgWaitMin: number;
  /** Hill-wide mean snow quality at close, 0–1. */
  snowQuality: number;
  /** The conditions board word for the worst segment at close ("Good cover", "Icy bottom"). */
  snowLabel: string;
  /** Ticket price the day ran at, dollars. */
  farePrice: number;
  /** Mean dollars a day here was worth to the guests (see `guestHillValue`). */
  hillValue: number;
  runsPerGuest: number;
  turnedAway: number;
  /** Mood on arrival, 0–1. */
  arrivalMood: number;
};

export type NightRecap = {
  arrivals: number;
  /** Mean guest satisfaction, 0–100. */
  satisfaction: number;
  /** Mean signed points of each satisfaction term over the guests who arrived. */
  breakdown: SatTerms;
  cashDelta: number;
  problem: string;
  facts: RecapFacts;
};

export function buildNightRecap(opts: {
  stats: DayStats;
  fare: FarePreset;
  snowQuality: number;
  snowTrouble?: string;
  /** Conditions board word for the worst segment at close. */
  snowLabel?: string;
  /** The day's guest-built satisfaction (see `daySatisfaction`). */
  day: DaySatisfaction;
  arrivalMood: number;
  openLiftCount: number;
  founderFixedDelta: number;
}): NightRecap {
  const { stats, fare, day } = opts;
  const revenue = computeDayRevenue(fare, day.score, stats.arrivals);
  const costs =
    DAILY_FIXED_COST +
    opts.founderFixedDelta +
    LIFT_OPS_COST * Math.max(1, opts.openLiftCount);
  return {
    arrivals: stats.arrivals,
    satisfaction: day.score,
    breakdown: day.breakdown,
    cashDelta: revenue - costs,
    problem: problemLine(day.breakdown, {
      avgWaitMin: stats.avgQueueMin,
      snowQuality: opts.snowQuality,
      snowTrouble: opts.snowTrouble,
      fare,
      turnedAway: stats.turnedAway,
      runsPerGuest: stats.runsPerGuest,
      arrivalMood: opts.arrivalMood,
    }),
    facts: {
      avgWaitMin: stats.avgQueueMin,
      snowQuality: opts.snowQuality,
      snowLabel: opts.snowLabel ?? "Good cover",
      farePrice: FARE_PRICES[fare],
      hillValue: day.hillValue,
      runsPerGuest: stats.runsPerGuest,
      turnedAway: stats.turnedAway,
      arrivalMood: opts.arrivalMood,
    },
  };
}

export type OvernightResult = {
  /** One trail per input trail, after the player's night and the morning weather. */
  trails: Trail[];
  /** Derived: means over `trails`. */
  snowQuality: number;
  snowDepth: number;
  cash: number;
  groomVisible: boolean;
  gunsFired: boolean;
  /** Fraction of the trail from the bottom the guns covered (0 when not fired). */
  gunReach: number;
  weather: WeatherKind;
  morningHeadline: string;
  talentLearned: string | null;
  nextTalentHint: string | null;
  daysWithoutSnow: number;
};

export function rollMorningWeather(
  dayIndex: number,
  hasGuns: boolean,
): WeatherKind {
  const roll = (dayIndex * 17 + 3) % 10;
  if (roll < 3) return "snow";
  if (roll < 6) return hasGuns ? "clear" : "thaw";
  if (roll < 8) return "clear";
  return "thaw";
}

export function applyOvernight(opts: {
  snow: SnowPreset;
  cash: number;
  trails: Trail[];
  dayIndex: number;
  buildings: BuildingId[];
  talentsOwned: string[];
  daysWithoutSnow: number;
}): OvernightResult {
  const hasGuns = opts.buildings.includes("snow_guns");
  const hasTrailGuns = opts.talentsOwned.includes("trail_guns");
  const hasGroom = opts.talentsOwned.includes("groom_pass") ||
    opts.talentsOwned.includes("corduroy");

  const nextDay = opts.dayIndex + 1;
  const weather = rollMorningWeather(nextDay, hasGuns);
  const night = { snow: opts.snow, weather, hasGuns, hasTrailGuns, hasGroom };
  const reach = gunReach(night);
  const trails = opts.trails.map((t) => overnightTrail(t, night));
  const groomVisible = opts.snow !== "minimal";
  const gunsFired = reach > 0;
  let daysWithoutSnow = opts.daysWithoutSnow;
  daysWithoutSnow = weather === "snow" ? 0 : daysWithoutSnow + 1;

  const talent = learnNextTalent(opts.talentsOwned);
  const nextHint = nextTalentName([...opts.talentsOwned, ...(talent ? [talent.id] : [])]);

  const headline =
    weather === "snow"
      ? "Overnight squall — fresh on Dutch Meadows."
      : weather === "thaw"
        ? "Thaw watch — lower third softens by noon."
        : "Clear and cold — corduroy holds if you groomed.";

  return {
    trails,
    ...deriveSnow(trails.map((trail) => ({ confirmed: true, trail }))),
    cash: opts.cash - SNOW_NIGHT_COST[opts.snow],
    groomVisible,
    gunsFired,
    gunReach: reach,
    weather,
    morningHeadline: headline,
    talentLearned: talent?.name ?? null,
    nextTalentHint: nextHint,
    daysWithoutSnow,
  };
}

function learnNextTalent(owned: string[]) {
  return CREW_TALENTS.find((t) => !owned.includes(t.id)) ?? null;
}

export function nextTalentName(owned: string[]): string | null {
  return learnNextTalent(owned)?.name ?? null;
}

/**
 * Fare elasticity (see SIMULATION_SPEC, Arrivals). A persona's demand is
 * `1 + ELASTICITY × valueWeight × (expectedValue / fare − REF_RATIO)`, clamped,
 * and the day's multiplier is the mean over the persona mix.
 */
export const DEMAND = {
  ELASTICITY: 0.45,
  /** Value-to-fare ratio at which demand is unchanged: Balanced at the starting reputation (40) with no venues. */
  REF_RATIO: 41 / 48,
  MIN_MULT: 0.75,
  MAX_MULT: 1.3,
  /** Reputation of a new hill. */
  START_REPUTATION: 40,
} as const;

/** Demand multiplier from the fare against what the town expects a day here to be worth. */
export function fareDemandMultiplier(
  fare: FarePreset,
  expectedValue: number,
  weekend: boolean,
): number {
  const ratio = expectedValue / FARE_PRICES[fare];
  let mult = 0;
  for (const p of Object.values(PERSONAS)) {
    const share = weekend ? p.weekendShare : p.weekdayShare;
    const m = 1 + DEMAND.ELASTICITY * p.valueWeight * (ratio - DEMAND.REF_RATIO);
    mult += share * Math.max(DEMAND.MIN_MULT, Math.min(DEMAND.MAX_MULT, m));
  }
  return mult;
}

export type ArrivalInputs = {
  dayIndex: number;
  fare: FarePreset;
  snowQuality: number;
  weather: WeatherKind;
  buildings: BuildingId[];
  talentsOwned: string[];
  founderId: FounderId | null;
  /** Word of mouth, 0–100. Defaults to a new hill's. */
  reputation?: number;
};

/** The day-to-day noise `planArrivals` draws is floor(rand × 5); its mean is 2. */
const MEAN_NOISE = 2;

function arrivalCount(opts: ArrivalInputs, noise: number): number {
  const weekend = isWeekend(opts.dayIndex);
  let base = weekend ? 24 : 18;
  base += noise;
  if (weekend) base = Math.round(base * 1.3);
  const expected = expectedHillValue(opts.reputation ?? DEMAND.START_REPUTATION, opts.buildings);
  base = Math.round(base * fareDemandMultiplier(opts.fare, expected, weekend));
  if (opts.weather === "snow") base += 3;
  if (opts.weather === "thaw") base -= 4;
  if (opts.snowQuality < 0.4) base -= 3;
  if (opts.buildings.includes("cafe")) base += 1;
  if (opts.talentsOwned.includes("ticket_booth") && weekend) base += 1;
  if (opts.talentsOwned.includes("school_day") && !weekend) base += 2;
  const founder = founderById(opts.founderId);
  if (founder) base += Math.round(founder.arrivalMoodBonus * 20);
  return Math.max(12, Math.min(40, base));
}

/** Honest next-day arrivals (fare against reputation, weather, buildings, founder). */
export function planArrivals(opts: ArrivalInputs & { rand?: Rand }): number {
  const rand = opts.rand ?? Math.random;
  return arrivalCount(opts, Math.floor(rand() * 5));
}

/** Mean of `planArrivals` over the day-to-day noise, without drawing any: the UI's "~27 skiers". */
export function meanArrivals(opts: ArrivalInputs): number {
  return arrivalCount(opts, MEAN_NOISE);
}

export type BeatCheckInput = {
  dayIndex: number;
  liftsOpen: number;
  completedRuns: number;
  arrivals: number;
  snowDepth: number;
  daysWithoutSnow: number;
  reputation: number;
  buildings: BuildingId[];
  lessonsBooked: boolean;
  completedBeats: StoryBeatId[];
};

export function readyStoryBeat(input: BeatCheckInput): StoryBeatId | null {
  for (const beat of STORY_BEATS) {
    if (input.completedBeats.includes(beat.id)) continue;
    if (beat.id === "winter_review") continue;
    if (beatGateMet(beat.id, input)) return beat.id;
  }
  return null;
}

function beatGateMet(id: StoryBeatId, input: BeatCheckInput): boolean {
  switch (id) {
    case "first_load":
      return input.liftsOpen >= 1 && input.completedRuns >= 5;
    case "saturday":
      return isWeekend(input.dayIndex) && input.arrivals >= 22;
    case "school_bus":
      return (
        input.lessonsBooked ||
        (!isWeekend(input.dayIndex) && input.arrivals >= 28) ||
        input.buildings.includes("lodge")
      );
    case "dry_week":
      return input.daysWithoutSnow >= 3 && input.snowDepth < 0.35;
    case "summit_link":
      return input.reputation >= 50;
    case "winter_review":
      return input.dayIndex >= SEASON_LENGTH;
    default:
      return false;
  }
}

export function emptyDayStats(): DayStats {
  return {
    arrivals: 0,
    guestsArrived: 0,
    completedRuns: 0,
    runsPerGuest: 0,
    turnedAway: 0,
    peakOnHill: 0,
    avgQueueMin: 0,
    dispatched: 0,
    waitSumMin: 0,
    maxQueueLength: 0,
    peakWaitMin: 0,
  };
}

export { currentWaitMin } from "./lifts";

export { DAY_START_MIN, DAY_END_MIN, SEASON_LENGTH };
