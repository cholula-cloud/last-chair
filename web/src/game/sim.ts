import { CREW_TALENTS, STORY_BEATS, founderById } from "./content";
import { PERSONAS, skiMinutes } from "./personas";
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
  const goHome = (g: Guest, over: Partial<Guest> = {}): Guest => ({
    ...g,
    ...over,
    state: "depart",
    progress: 0,
    stateSinceMin: now,
  });

  return guests.map((g) => {
    switch (g.state) {
      case "pending":
        return now >= g.arriveAtMin
          ? { ...g, state: "arrive", progress: 0, stateSinceMin: now }
          : g;
      case "arrive": {
        const progress = (now - g.stateSinceMin) / ARRIVE_WALK_MIN;
        if (progress < 1) return { ...g, progress };
        return now >= LIFT_CLOSE_MIN ? goHome(g) : { ...g, state: "queue", progress: 0 };
      }
      case "queue":
        return now >= LIFT_CLOSE_MIN ? goHome(g) : g;
      case "ski": {
        const duration = skiMinutes(g.persona, clock.snowQuality);
        const progress = (now - g.stateSinceMin) / duration;
        if (progress < 1) return { ...g, progress };
        const runs = g.runs + 1;
        const energy = g.energy - PERSONAS[g.persona].energyPerRun;
        const done = { runs, energy };
        const lapEnds = now + clock.lapOverheadMin + duration;
        if (energy <= 1e-9 || runs >= g.targetRuns || lapEnds > LIFT_CLOSE_MIN) {
          return goHome(g, done);
        }
        return { ...g, ...done, state: "queue", progress: 0 };
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

export function computeSatisfaction(
  fare: FarePreset,
  snowQuality: number,
  avgQueueMin: number,
  arrivalMood = 0.7,
  snowExpectationPenalty = 0,
): number {
  // ticketMismatch 0 / 0.5 / 1 matches SIMULATION_SPEC (main Tier 0 fix)
  const ticketMismatch =
    fare === "cheap" ? 0 : fare === "balanced" ? 0.5 : 1;
  const snowTerm = snowQuality - snowExpectationPenalty;
  return Math.max(
    0,
    Math.min(
      100,
      70 -
        8 * avgQueueMin +
        25 * snowTerm -
        15 * ticketMismatch +
        10 * arrivalMood,
    ),
  );
}

export function computeDayRevenue(
  fare: FarePreset,
  satisfaction: number,
  arrivals: number,
): number {
  const mult = 0.75 + (satisfaction / 100) * 0.35;
  return Math.round(arrivals * FARE_PRICES[fare] * mult);
}

export type NightRecap = {
  arrivals: number;
  satisfaction: number;
  cashDelta: number;
  problem: string;
};

export function buildNightRecap(
  stats: DayStats,
  fare: FarePreset,
  snowQuality: number,
  avgQueueMin: number,
  arrivalMood: number,
  snowExpectationPenalty: number,
  openLiftCount: number,
  founderFixedDelta: number,
): NightRecap {
  const satisfaction = computeSatisfaction(
    fare,
    snowQuality,
    avgQueueMin,
    arrivalMood,
    snowExpectationPenalty,
  );
  const revenue = computeDayRevenue(fare, satisfaction, stats.arrivals);
  const costs =
    DAILY_FIXED_COST +
    founderFixedDelta +
    LIFT_OPS_COST * Math.max(1, openLiftCount);
  const cashDelta = revenue - costs;

  let problem = "Crowd flowed well.";
  if (avgQueueMin > 4)
    problem = "Lift queue ran long — add capacity or ease crowd.";
  else if (snowQuality < 0.45)
    problem = "Thin cover — bump snow & service tonight.";
  else if (stats.arrivals < 18)
    problem = "Quiet hill — weekend pricing or weather may help.";

  return {
    arrivals: stats.arrivals,
    satisfaction,
    cashDelta,
    problem,
  };
}

export type OvernightResult = {
  snowQuality: number;
  snowDepth: number;
  cash: number;
  groomVisible: boolean;
  gunsFired: boolean;
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
  snowQuality: number;
  snowDepth: number;
  dayIndex: number;
  buildings: BuildingId[];
  talentsOwned: string[];
  daysWithoutSnow: number;
}): OvernightResult {
  const hasGuns = opts.buildings.includes("snow_guns");
  const hasTrailGuns = opts.talentsOwned.includes("trail_guns");
  const hasGroom = opts.talentsOwned.includes("groom_pass") ||
    opts.talentsOwned.includes("corduroy");

  let snowQuality = opts.snowQuality;
  let snowDepth = opts.snowDepth;
  let gunsFired = false;
  let groomVisible = false;

  if (opts.snow === "minimal") {
    snowDepth = Math.min(1, snowDepth + (hasGuns ? 0.08 : 0.02));
    snowQuality = Math.max(0.35, snowQuality - 0.05);
  } else if (opts.snow === "mid") {
    snowDepth = Math.min(1, snowDepth + (hasGuns ? 0.18 : 0.1));
    snowQuality = Math.min(0.85, 0.55 + (hasGroom ? 0.12 : 0.05));
    gunsFired = hasGuns;
    groomVisible = true;
  } else {
    snowDepth = Math.min(1, snowDepth + (hasGuns || hasTrailGuns ? 0.28 : 0.14));
    snowQuality = Math.min(0.9, 0.72 + (hasGroom ? 0.1 : 0));
    gunsFired = hasGuns || hasTrailGuns;
    groomVisible = true;
  }

  const nextDay = opts.dayIndex + 1;
  const weather = rollMorningWeather(nextDay, hasGuns);
  let daysWithoutSnow = opts.daysWithoutSnow;

  if (weather === "snow") {
    snowDepth = Math.min(1, snowDepth + 0.12);
    snowQuality = Math.min(0.95, snowQuality + 0.08);
    daysWithoutSnow = 0;
  } else if (weather === "thaw") {
    snowDepth = Math.max(0.05, snowDepth - 0.08);
    snowQuality = Math.max(0.25, snowQuality - 0.12);
    daysWithoutSnow += 1;
  } else {
    daysWithoutSnow += 1;
  }

  const talent = learnNextTalent(opts.talentsOwned);
  const nextHint = nextTalentName([...opts.talentsOwned, ...(talent ? [talent.id] : [])]);

  const headline =
    weather === "snow"
      ? "Overnight squall — fresh on Dutch Meadows."
      : weather === "thaw"
        ? "Thaw watch — lower third softens by noon."
        : "Clear and cold — corduroy holds if you groomed.";

  return {
    snowQuality,
    snowDepth,
    cash: opts.cash - SNOW_NIGHT_COST[opts.snow],
    groomVisible,
    gunsFired,
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

/** Honest next-day arrivals (fare + weather + buildings + founder). */
export function planArrivals(opts: {
  dayIndex: number;
  fare: FarePreset;
  snowQuality: number;
  weather: WeatherKind;
  buildings: BuildingId[];
  talentsOwned: string[];
  founderId: FounderId | null;
  rand?: Rand;
}): number {
  const rand = opts.rand ?? Math.random;
  const weekend = isWeekend(opts.dayIndex);
  let base = weekend ? 24 : 18;
  base += Math.floor(rand() * 5);
  if (weekend) base = Math.round(base * 1.3);
  if (opts.fare === "cheap") base = Math.round(base * 1.1);
  if (opts.fare === "expensive") base = Math.round(base * 0.9);
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
