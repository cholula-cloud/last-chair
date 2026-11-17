import { formatMoney } from "./format";
import { PERSONAS } from "./personas";
import { FARE_PRICES, type BuildingId, type FarePreset, type Guest } from "./types";

/** Constants of the satisfaction formula (see SIMULATION_SPEC, Satisfaction). All points are on the 0–100 scale. */
export const SAT = {
  /** Score of a guest whose every term is neutral. */
  BASE: 70,
  /** Arrival mood (0–1) that earns zero points; each 0.01 above or below is worth `ARRIVAL_PTS / 100` points. */
  ARRIVAL_NEUTRAL: 0.7,
  ARRIVAL_PTS: 40,
  /** Points per minute of pain before the persona weight. */
  QUEUE_PTS: 3.5,
  /** Mean wait per ride that costs nothing. */
  QUEUE_FREE_MIN: 1,
  /** Pain grows 1:1 up to this mean wait, then at `QUEUE_FAR_SLOPE`. */
  QUEUE_KNEE_MIN: 6,
  QUEUE_FAR_SLOPE: 0.5,
  /** The queue term never costs more than this, so one bad line cannot zero the score. */
  QUEUE_CAP: 35,
  /** Snow quality a guest expects before the founder's expectation penalty. */
  SNOW_EXPECTED: 0.55,
  SNOW_PTS: 50,
  /** Share of target runs at which the runs term is zero. */
  RUNS_PAR: 0.6,
  /** Bonus at the full target, penalty at zero runs. */
  RUNS_BONUS: 5,
  RUNS_PENALTY: 8,
  /** A day term at or below this many points per guest is a problem worth naming. */
  PROBLEM_MIN: -3,
} as const;

/**
 * What a ticket was worth to a guest, in dollars (see SIMULATION_SPEC, Value).
 * `hillValue = BASE + snow − wait + venues + runs`; the value term is the
 * gap between that and the fare, as a share of the fare.
 */
export const VALUE = {
  /** Worth of a day at Dutch Hill with middling snow, no waiting and the warming hut. */
  BASE: 45,
  /** Dollars per 1.0 of snow quality above what the guest expects (below it, a loss). */
  SNOW_PER_Q: 40,
  /** Dollars lost per minute in lift lines beyond the free minute per ride, up to `WAIT_CAP`. */
  WAIT_PER_MIN: 0.35,
  WAIT_CAP: 20,
  /** Dollars for a lodge or café on the hill. */
  LODGE: 4,
  CAFE: 3,
  /** Dollars at the full run target (and lost at zero runs), scaled like the runs term. */
  RUNS: 8,
  /** A day is never worth less than this. */
  FLOOR: 10,
  /** Points per 1.0 of `(hillValue − fare) / fare`, before the persona weight. */
  K: 30,
  /** The value term stays inside this band (a deal helps less than a rip-off hurts). */
  MIN_PTS: -20,
  MAX_PTS: 10,
  /** Before the day is played, guests expect `BASE` moved by this many dollars per reputation point from 50. */
  REP_PER_POINT: 0.6,
} as const;

/** Dollars the buildings add to a day on the hill. */
export function venueValue(buildings: readonly BuildingId[]): number {
  return (buildings.includes("lodge") ? VALUE.LODGE : 0) + (buildings.includes("cafe") ? VALUE.CAFE : 0);
}

/** What the town expects a day here to be worth: reputation and the venues they know about (no RNG). */
export function expectedHillValue(reputation: number, buildings: readonly BuildingId[]): number {
  return Math.max(
    VALUE.FLOOR,
    VALUE.BASE + VALUE.REP_PER_POINT * (reputation - 50) + venueValue(buildings),
  );
}

/** Signed points each term adds to a guest's score, relative to `SAT.BASE`. */
export type SatTerms = {
  arrivalMood: number;
  queue: number;
  snow: number;
  value: number;
  runs: number;
};

export const SAT_TERM_KEYS = ["queue", "snow", "value", "runs", "arrivalMood"] as const;

export const ZERO_TERMS: SatTerms = { arrivalMood: 0, queue: 0, snow: 0, value: 0, runs: 0 };

/** Day-wide inputs that every guest shares. */
export type SatisfactionContext = {
  fare: FarePreset;
  /** Today's arrival mood, 0–1 (buildings, founder, weather). */
  arrivalMood: number;
  /** Dollars the buildings add to every guest's day (`venueValue`). */
  venueValue: number;
  /** Snow quality guests expect today: `SAT.SNOW_EXPECTED` plus the founder's penalty. */
  snowExpectation: number;
  /** Game clock minute; sizes the wait of a guest still standing in a line. */
  now: number;
};

export type SatGuest = Pick<
  Guest,
  | "persona"
  | "state"
  | "runs"
  | "targetRuns"
  | "waitMin"
  | "waitCount"
  | "snowSum"
  | "joinedQueueAtMin"
>;

/** Pain in minutes for a mean wait per ride: free up to a minute, 1:1 to the knee, half slope beyond. */
export function queuePain(avgWaitMin: number): number {
  const w = Math.max(0, avgWaitMin - SAT.QUEUE_FREE_MIN);
  const knee = SAT.QUEUE_KNEE_MIN - SAT.QUEUE_FREE_MIN;
  return w <= knee ? w : knee + (w - knee) * SAT.QUEUE_FAR_SLOPE;
}

/** Mean wait per ride of one guest, counting the line they are standing in right now. */
export function guestAvgWaitMin(g: SatGuest, now: number): number {
  const inLine = g.state === "queue" && g.joinedQueueAtMin !== undefined;
  const sum = g.waitMin + (inLine ? Math.max(0, now - (g.joinedQueueAtMin as number)) : 0);
  const count = g.waitCount + (inLine ? 1 : 0);
  return count > 0 ? sum / count : 0;
}

/** Minutes spent in lift lines today beyond the free minute per ride, counting the line the guest is standing in now. */
export function guestExcessWaitMin(g: SatGuest, now: number): number {
  const inLine = g.state === "queue" && g.joinedQueueAtMin !== undefined;
  const waited = g.waitMin + (inLine ? Math.max(0, now - (g.joinedQueueAtMin as number)) : 0);
  const rides = g.waitCount + (inLine ? 1 : 0);
  return Math.max(0, waited - SAT.QUEUE_FREE_MIN * rides);
}

/** Whether the guest's day on the hill is over (the runs term only applies then). */
function isFinished(g: SatGuest): boolean {
  return g.state === "depart" || g.state === "gone";
}

/** Share of the run target as a signed fraction: +1 at the full target, 0 at `RUNS_PAR`, −1 at zero runs. */
function runsFraction(g: SatGuest): number {
  const share = Math.min(1, g.runs / Math.max(1, g.targetRuns));
  return share >= SAT.RUNS_PAR
    ? (share - SAT.RUNS_PAR) / (1 - SAT.RUNS_PAR)
    : -(SAT.RUNS_PAR - share) / SAT.RUNS_PAR;
}

/** Dollars this guest's day was worth to them: snow felt, time lost waiting, venues, runs got. */
export function guestHillValue(g: SatGuest, ctx: SatisfactionContext): number {
  // Guests with no run yet have felt no snow.
  const snow = g.runs > 0 ? VALUE.SNOW_PER_Q * (g.snowSum / g.runs - ctx.snowExpectation) : 0;
  const wait = Math.min(VALUE.WAIT_CAP, VALUE.WAIT_PER_MIN * guestExcessWaitMin(g, ctx.now));
  const runs = isFinished(g) ? VALUE.RUNS * runsFraction(g) : 0;
  return Math.max(VALUE.FLOOR, VALUE.BASE + snow - wait + ctx.venueValue + runs);
}

function guestEvaluation(
  g: SatGuest,
  ctx: SatisfactionContext,
): { terms: SatTerms; hillValue: number } {
  const p = PERSONAS[g.persona];
  const arrivalMood = SAT.ARRIVAL_PTS * (ctx.arrivalMood - SAT.ARRIVAL_NEUTRAL);
  const queue = 0 - Math.min(
    SAT.QUEUE_CAP,
    SAT.QUEUE_PTS * p.queueWeight * queuePain(guestAvgWaitMin(g, ctx.now)),
  );
  // Guests with no run yet have felt no snow.
  const snow =
    g.runs > 0
      ? SAT.SNOW_PTS * p.snowWeight * (g.snowSum / g.runs - ctx.snowExpectation)
      : 0;
  const hillValue = guestHillValue(g, ctx);
  const price = FARE_PRICES[ctx.fare];
  const value = Math.max(
    VALUE.MIN_PTS,
    Math.min(VALUE.MAX_PTS, p.valueWeight * VALUE.K * ((hillValue - price) / price)),
  );
  const f = isFinished(g) ? runsFraction(g) : 0;
  const runs = f >= 0 ? SAT.RUNS_BONUS * f : SAT.RUNS_PENALTY * f;
  return { terms: { arrivalMood, queue, snow, value, runs }, hillValue };
}

export function guestTerms(g: SatGuest, ctx: SatisfactionContext): SatTerms {
  return guestEvaluation(g, ctx).terms;
}

export function sumTerms(t: SatTerms): number {
  return t.arrivalMood + t.queue + t.snow + t.value + t.runs;
}

export function scoreFromTerms(t: SatTerms): number {
  return Math.max(0, Math.min(100, SAT.BASE + sumTerms(t)));
}

/** One guest's satisfaction, 0–100, from what has happened to them so far. */
export function guestSatisfaction(g: SatGuest, ctx: SatisfactionContext): number {
  return scoreFromTerms(guestTerms(g, ctx));
}

export type DaySatisfaction = {
  /** Mean guest score, 0–100. */
  score: number;
  /** Mean signed points of each term over the guests who arrived. */
  breakdown: SatTerms;
  /** Guests who arrived (the mean's denominator). */
  guests: number;
  /** Mean dollars a day on the hill was worth to those guests (`guestHillValue`). */
  hillValue: number;
};

/**
 * Mean satisfaction of every guest who has arrived: those gone home count
 * their finished day, those still on the hill their day so far. Before anyone
 * arrives it is the score of a fresh regular with nothing yet to complain about.
 */
export function daySatisfaction(
  guests: readonly Guest[],
  ctx: SatisfactionContext,
): DaySatisfaction {
  const arrived = guests.filter((g) => g.state !== "pending");
  if (arrived.length === 0) {
    const fresh: SatGuest = {
      persona: "regular",
      state: "arrive",
      runs: 0,
      targetRuns: 1,
      waitMin: 0,
      waitCount: 0,
      snowSum: 0,
    };
    const { terms, hillValue } = guestEvaluation(fresh, ctx);
    return { score: scoreFromTerms(terms), breakdown: terms, guests: 0, hillValue };
  }
  const total: SatTerms = { ...ZERO_TERMS };
  let scoreSum = 0;
  let valueSum = 0;
  for (const g of arrived) {
    const { terms: t, hillValue } = guestEvaluation(g, ctx);
    for (const k of SAT_TERM_KEYS) total[k] += t[k];
    scoreSum += scoreFromTerms(t);
    valueSum += hillValue;
  }
  const n = arrived.length;
  const breakdown = { ...ZERO_TERMS };
  for (const k of SAT_TERM_KEYS) breakdown[k] = total[k] / n;
  return { score: scoreSum / n, breakdown, guests: n, hillValue: valueSum / n };
}

/** Facts quoted in the problem line. */
export type ProblemFacts = {
  avgWaitMin: number;
  snowQuality: number;
  /** Where the worst segment is, e.g. "Bare patches at the bottom of the trail" (see snow.ts `readSnow`). */
  snowTrouble?: string;
  fare: FarePreset;
  turnedAway: number;
  runsPerGuest: number;
  arrivalMood: number;
  /** Today's cash result; a loss names itself when no satisfaction term is a problem. */
  cashDelta?: number;
};

export const NO_PROBLEM = "Good day on the hill.";

/** The term with the largest negative average contribution, or null if none is below `SAT.PROBLEM_MIN`. */
export function biggestProblem(breakdown: SatTerms): keyof SatTerms | null {
  let worst: keyof SatTerms | null = null;
  let worstPts: number = SAT.PROBLEM_MIN;
  for (const k of SAT_TERM_KEYS) {
    if (breakdown[k] < worstPts) {
      worst = k;
      worstPts = breakdown[k];
    }
  }
  return worst;
}

/** One fixable sentence naming the biggest real cause of unhappiness today. */
export function problemLine(breakdown: SatTerms, facts: ProblemFacts): string {
  switch (biggestProblem(breakdown)) {
    case "queue":
      return `Long lift lines — guests waited ${facts.avgWaitMin.toFixed(1)} min a ride. More capacity or a cheaper fare to spread the crowd.`;
    case "snow":
      return facts.snowTrouble
        ? `${facts.snowTrouble} (mean quality ${Math.round(facts.snowQuality * 100)}%) — bump Snow & service tonight.`
        : `Thin, scraped snow (quality ${Math.round(facts.snowQuality * 100)}%) — bump Snow & service tonight.`;
    case "value":
      return `Guests felt the ${formatMoney(FARE_PRICES[facts.fare])} ticket was steep for what they got.`;
    case "runs":
      return facts.turnedAway > 0
        ? `Many guests barely skied — ${facts.turnedAway} turned away at close.`
        : `Many guests barely skied — ${facts.runsPerGuest.toFixed(1)} runs each. Faster lifts would let them ski more.`;
    case "arrivalMood":
      return `A cold welcome (mood ${Math.round(facts.arrivalMood * 100)} on arrival) — a warmer lodge would help.`;
    default:
      return facts.cashDelta !== undefined && facts.cashDelta < 0
        ? `Lost ${formatMoney(-facts.cashDelta)} today — running costs beat ticket sales on a quiet day.`
        : NO_PROBLEM;
  }
}
