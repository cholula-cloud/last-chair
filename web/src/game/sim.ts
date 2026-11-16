import { CREW_TALENTS, STORY_BEATS, founderById } from "./content";
import {
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
  type GuestState,
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

export function createInitialGuests(
  count: number,
  rand: Rand = Math.random,
): Guest[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `g-${daySeed(rand)}-${i}`,
    label: i % 3 === 0 ? `Regular #${i + 1}` : `Guest ${i + 1}`,
    state: "arrive" as GuestState,
    progress: rand() * 0.3,
    mood: 0.7 + rand() * 0.2,
  }));
}

function daySeed(rand: Rand): string {
  return rand().toString(36).slice(2, 7);
}

export function tickGuests(
  guests: Guest[],
  dt: number,
  rand: Rand = Math.random,
): Guest[] {
  const stateRate: Record<GuestState, number> = {
    arrive: 0.35,
    queue: 0.25,
    ride: 0.4,
    ski: 0.5,
    depart: 0.2,
  };
  const nextState: Record<Exclude<GuestState, "ski">, GuestState> = {
    arrive: "queue",
    queue: "ride",
    ride: "ski",
    depart: "depart",
  };

  return guests.map((g) => {
    if (g.state === "depart") return g;
    let progress = g.progress + dt * stateRate[g.state];
    let state: GuestState = g.state;
    if (progress >= 1) {
      progress = 0;
      // One lap-or-leave draw per guest, only when that guest finishes a run.
      state =
        g.state === "ski"
          ? rand() > 0.35
            ? "queue"
            : "depart"
          : nextState[g.state];
    }
    return { ...g, progress, state };
  });
}

/** Average queue wait shown to the player, from the guests currently queued. */
export function queueMinutes(guests: Guest[], talentsOwned: string[]): number {
  const queueCount = guests.filter((g) => g.state === "queue").length;
  return Math.max(
    1.2,
    2 + queueCount * 0.12 - (talentsOwned.includes("patrol_radio") ? 0.3 : 0),
  );
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
  return { arrivals: 0, completedRuns: 0, avgQueueMin: 2.5 };
}

export { DAY_START_MIN, DAY_END_MIN, SEASON_LENGTH };
