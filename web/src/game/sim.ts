import {
  DAY_END_MIN,
  DAY_START_MIN,
  FARE_PRICES,
  SNOW_NIGHT_COST,
  type DayStats,
  type FarePreset,
  type GamePhase,
  type Guest,
  type GuestState,
  type SnowPreset,
} from "./types";

export function formatClock(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function createInitialGuests(count: number): Guest[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `g-${i}`,
    label: i % 3 === 0 ? `Regular #${i + 1}` : `Guest ${i + 1}`,
    state: "arrive" as GuestState,
    progress: Math.random() * 0.3,
    mood: 0.7 + Math.random() * 0.2,
  }));
}

export function tickGuests(guests: Guest[], dt: number): Guest[] {
  const stateRate: Record<GuestState, number> = {
    arrive: 0.35,
    queue: 0.25,
    ride: 0.4,
    ski: 0.5,
    depart: 0.2,
  };
  const nextState: Record<GuestState, GuestState> = {
    arrive: "queue",
    queue: "ride",
    ride: "ski",
    ski: Math.random() > 0.35 ? "queue" : "depart",
    depart: "depart",
  };

  return guests.map((g) => {
    if (g.state === "depart") return g;
    let progress = g.progress + dt * stateRate[g.state];
    let state: GuestState = g.state;
    if (progress >= 1) {
      progress = 0;
      state = nextState[g.state];
    }
    return { ...g, progress, state };
  });
}

export function computeSatisfaction(
  fare: FarePreset,
  snowQuality: number,
  avgQueueMin: number,
): number {
  const ticketMismatch =
    fare === "cheap" ? 0 : fare === "balanced" ? 0.3 : 1;
  return Math.max(
    0,
    Math.min(
      100,
      70 - 8 * avgQueueMin + 25 * snowQuality - 15 * ticketMismatch + 7,
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
): NightRecap {
  const satisfaction = computeSatisfaction(fare, snowQuality, avgQueueMin);
  const cashDelta =
    computeDayRevenue(fare, satisfaction, stats.arrivals) - 580;

  let problem = "Crowd flowed well.";
  if (avgQueueMin > 4) problem = "Lift queue ran long — add capacity or ease crowd.";
  else if (snowQuality < 0.45)
    problem = "Thin cover — bump snow & service tonight.";

  return {
    arrivals: stats.arrivals,
    satisfaction,
    cashDelta,
    problem,
  };
}

export function applyOvernight(
  snow: SnowPreset,
  cash: number,
): { snowQuality: number; cash: number } {
  const snowQuality =
    snow === "minimal" ? 0.42 : snow === "mid" ? 0.62 : 0.82;
  return { snowQuality, cash: cash - SNOW_NIGHT_COST[snow] };
}

export function emptyDayStats(): DayStats {
  return { arrivals: 0, completedRuns: 0, avgQueueMin: 2.5 };
}

export function isDayOver(clockMin: number, phase: GamePhase): boolean {
  return phase === "day" && clockMin >= DAY_END_MIN;
}

export { DAY_START_MIN, DAY_END_MIN };
