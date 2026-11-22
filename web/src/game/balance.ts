import { canTakeSummitLinkEquity } from "./founders";
import {
  beginLodgeUpgrade,
  buyBuilding,
  decideSchoolContract,
  replyToSummitLink,
  cutTrail,
  pickFounder,
  placeAsset,
  placeAssetAtPad,
  placeLift,
  placeGun,
  resolveNightBeat,
  setPendingFare,
  setPendingSnow,
  skipToClose,
  sleep,
  takeLoan,
  trailOptions,
} from "./rules";
import { spendAllCrewPoints } from "./talentProgress";
import { ASSET_CATALOG, LODGE_TIERS, lodgeAttachPads } from "./base";
import { calendarForSeason, dayKind, inHolidayWeek, weekdayForDay } from "./calendar";
import { trailsOnLift } from "./trails";
import { dailyCosts, liquidNetWorth, loanOffered, morningCash } from "./economy";
import { REFERENCE_TOPS } from "./descent";
import { NO_PROBLEM, SAT, biggestProblem, type SatTerms } from "./satisfaction";
import type { NightRecap } from "./sim";
import type { GameState } from "./state";
import { addReferenceDescent, createBuiltHill } from "./__fixtures__/built-hill";
import { TERRAIN } from "./terrain";
import { liftCost, type BuildingId, type FarePreset, type FounderId, type SnowPreset } from "./types";
import { HEALTHY_GUEST_SCORE, VACATION_WAIT_GOAL } from "./winterArc";
import { winterRecord } from "./winterMemory";
import { outlookFor } from "./weather";

/** Headless seasons auto-spend crew points in roster order, like the old overnight auto-learn. */
function spendCrewPoints(state: GameState): GameState {
  return spendAllCrewPoints(state).state;
}

/**
 * Headless balance harness (see SIMULATION_SPEC, Balance (PR 10)). `runSeason`
 * plays a whole winter through the real rules: pick a founder, then each day
 * build (by strategy), skip to close, acknowledge the beat, set the presets
 * (by strategy), sleep. Pure over its inputs: the same seed and strategy give
 * the same result.
 */

export type BuildAction = "chair" | "upgrade_lodge" | "rentals" | "ski_school" | BuildingId;

export type StrategyContext = {
  /** The game at the decision point: start of a day (builds) or the night sheet (presets). */
  state: GameState;
  /** Last night's recap (at the night sheet, tonight's), or null on day 1. */
  recap: NightRecap | null;
  /** The recap's biggest problem term, or null on a good day. */
  problem: keyof SatTerms | null;
  sawSaturdayQueue: boolean;
};

export type NightPlan = { fare: FarePreset; snow: SnowPreset };

export type Strategy = {
  id: string;
  label: string;
  /** Purchases at the start of a day. Omitted: never builds. */
  build?: (ctx: StrategyContext) => BuildAction[];
  /** The two night choices. */
  night: (ctx: StrategyContext) => NightPlan;
};

const FARES: FarePreset[] = ["cheap", "balanced", "expensive"];
const SNOWS: SnowPreset[] = ["minimal", "mid", "high"];
const SNOW_NAMES = { minimal: "Minimal", mid: "Mid", high: "High" } as const;
const FARE_NAMES = { cheap: "Cheap", balanced: "Balanced", expensive: "Expensive" } as const;

function stepFare(fare: FarePreset, delta: -1 | 1): FarePreset {
  const i = Math.max(0, Math.min(FARES.length - 1, FARES.indexOf(fare) + delta));
  return FARES[i];
}

function hasChair(state: GameState): boolean {
  return state.lifts.some((l) => l.confirmed && l.type === "chair");
}

export const CHAIR_COST = liftCost("chair", { bottom: TERRAIN.base, top: REFERENCE_TOPS[1] });
/** Cash the builder and adaptive strategies keep after buying a chair. */
export const CASH_RESERVE = 2500;

function canAffordChair(state: GameState): boolean {
  return state.lodgeTier >= 2 && !hasChair(state) && liquidNetWorth(state) >= CHAIR_COST + CASH_RESERVE;
}

function canStartChairUpgrade(state: GameState): boolean {
  return state.lodgeTier === 1 && !state.lodgeUpgrade &&
    liquidNetWorth(state) >= LODGE_TIERS[2].cost + CHAIR_COST + CASH_RESERVE;
}

function chairLiftIndex(state: GameState): number {
  return state.lifts.findIndex((l, i) => i > 0 && l.confirmed && l.type === "chair");
}

/** Balance harness: cut the cheapest green on the chair the morning after it opens. */
export function maybeCutChairGreen(state: GameState): GameState {
  const chairI = chairLiftIndex(state);
  if (chairI < 0) return state;
  const built = state.lifts[chairI].builtDay ?? 0;
  if (state.dayIndex !== built + 1) return state;
  if (state.cash <= CASH_RESERVE) return state;
  const hasGreen = trailsOnLift(state.trails, chairI).some(
    ({ trail }) => trail.difficulty === "green",
  );
  if (hasGreen) return state;
  const opts = trailOptions(state, chairI);
  let greenI = -1;
  let cheapest = Infinity;
  opts.forEach((o, i) => {
    if (o.difficulty !== "green" || o.cost >= cheapest) return;
    cheapest = o.cost;
    greenI = i;
  });
  if (greenI < 0) return state;
  return cutTrail(state, chairI, greenI);
}

/** The nine fixed combinations: one fare and one snow preset all winter, no building. */
export const FIXED_STRATEGIES: Strategy[] = FARES.flatMap((fare) =>
  SNOWS.map<Strategy>((snow) => ({
    id: `${fare}/${snow}`,
    label: `${FARE_NAMES[fare]} / ${SNOW_NAMES[snow]}`,
    night: () => ({ fare, snow }),
  })),
);

/**
 * Builds a café and prepares the lodge upgrade on opening day. Adds skill
 * services in Tier 2 and a chair when queues warrant it. Snow problem: High. Value
 * problem: fare one step down. A good day: fare one step up. Snow is High only
 * when a thaw is forecast at 50% or higher, or after thin cover, otherwise Mid.
 */
export const ADAPTIVE: Strategy = {
  id: "adaptive",
  label: "Adaptive",
  build: ({ state, problem }) => {
    if (state.dayIndex === 1 && canStartChairUpgrade(state)) return ["upgrade_lodge", "cafe"];
    if (state.lodgeTier < 2) return [];
    const actions: BuildAction[] = [];
    const buyingChair = problem === "queue" && canAffordChair(state);
    if (buyingChair) actions.push("chair");
    let cash = liquidNetWorth(state) - (buyingChair ? CHAIR_COST : 0);
    for (const id of ["ski_school", "rentals"] as const) {
      if (state.assets.some((asset) => asset.id === id)) continue;
      const { cost } = ASSET_CATALOG[id];
      if (cash < cost + CASH_RESERVE) continue;
      actions.push(id);
      cash -= cost;
    }
    return actions;
  },
  night: ({ state, problem }) => {
    let fare: FarePreset = state.fare;
    if (problem === "queue") fare = hasChair(state) || state.cash < CHAIR_COST + CASH_RESERVE ? "cheap" : fare;
    else if (problem === "value") fare = stepFare(fare, -1);
    else if (problem === null) fare = stepFare(fare, 1);
    const thaw = (outlookFor(state, 1)?.thaw ?? 0) >= 0.5;
    const thin = state.snowDepth < 0.3;
    const snow: SnowPreset = problem === "snow" || thaw || thin ? "high" : "mid";
    return { fare, snow };
  },
};

/** Follows the first week's operating advice and waits for a Saturday queue before adding a chair. */
export const COACHED: Strategy = {
  id: "coached",
  label: "Coached",
  build: (ctx) => (ADAPTIVE.build?.(ctx) ?? []).filter((action) => action !== "chair" || ctx.sawSaturdayQueue),
  night: (ctx) => ctx.state.dayIndex < 7 ? { fare: "balanced", snow: "mid" } : ADAPTIVE.night(ctx),
};

/** Starts the lodge upgrade on day 1, then builds its first chair at Tier 2. */
export const BUILDER: Strategy = {
  id: "builder",
  label: "Builder",
  build: ({ state }) => {
    if (state.dayIndex === 1 && canStartChairUpgrade(state)) return ["upgrade_lodge"];
    return canAffordChair(state) ? ["chair"] : [];
  },
  night: () => ({ fare: "balanced", snow: "mid" }),
};

/** Never builds, Minimal snow, Expensive fare. */
export const STINGY: Strategy = {
  id: "stingy",
  label: "Stingy",
  night: () => ({ fare: "expensive", snow: "minimal" }),
};

/** Builds on deposits and sets the cheapest fare with the most expensive service. */
export const CARELESS: Strategy = {
  id: "careless",
  label: "Careless",
  build: ({ state }) => {
    const actions: BuildAction[] = [];
    if (state.lodgeTier === 1 && !state.lodgeUpgrade) actions.push("upgrade_lodge");
    if (!state.buildings.includes("cafe")) actions.push("cafe");
    if (!state.buildings.includes("shop")) actions.push("shop");
    if (state.lodgeTier >= 2 && !state.guns.length) actions.push("snow_guns");
    if (state.lodgeTier >= 2 && !hasChair(state)) actions.push("chair");
    return actions;
  },
  night: () => ({ fare: "cheap", snow: "high" }),
};

export const STRATEGIES: Strategy[] = [...FIXED_STRATEGIES, ADAPTIVE, BUILDER, STINGY, CARELESS, COACHED];

export function strategyById(id: string): Strategy {
  const s = STRATEGIES.find((x) => x.id === id);
  if (!s) throw new Error(`unknown strategy ${id}`);
  return s;
}

/** What one day looked like, for the property tests that care about particular days. */
export type DayRecord = {
  day: number;
  weekend: boolean;
  saturday: boolean;
  holidayWeek: boolean;
  fare: FarePreset;
  snow: SnowPreset;
  hasChair: boolean;
  arrivals: number;
  satisfaction: number;
  avgWaitMin: number;
  runsPerGuest: number;
  /** Mean signed points of each satisfaction term over the day's guests. */
  breakdown: SatTerms;
  cashDelta: number;
  problem: string;
};

export type SeasonResult = {
  seed: number;
  strategy: string;
  endCash: number;
  minCash: number;
  endReputation: number;
  meanSatisfaction: number;
  totalArrivals: number;
  totalRuns: number;
  /** Mean measured wait per ride over the whole season, game minutes. */
  meanWaitMin: number;
  /** Days whose recap named a problem. */
  problemDays: number;
  wentNegative: boolean;
  wentBankrupt: boolean;
  tookLoan: boolean;
  endNetWorth: number;
  events: GameState["surpriseLog"];
  schoolOffers: number;
  vivianOffers: number;
  schoolVisits: NonNullable<NightRecap["facts"]["schoolBus"]>[];
  solvent: boolean;
  winterScore: number;
  firstFrozenPressureDay: number | null;
  schoolContract: GameState["schoolContract"];
  summitLinkDecision: GameState["summitLinkDecision"];
  firstShortfallOfferedLoan: boolean;
  /** Story beats fired (the winter review excluded). */
  beats: number;
  talents: number;
  days: DayRecord[];
};

function applyBuild(state: GameState, action: BuildAction): GameState {
  if (action === "upgrade_lodge") return beginLodgeUpgrade(state);
  if (action === "rentals" || action === "ski_school") {
    for (const [padIndex] of lodgeAttachPads(state.lodgeTier).entries()) {
      const next = placeAssetAtPad(state, action, padIndex);
      if (next !== state) return next;
    }
    const detached = action === "rentals"
      ? { x: 11.5, z: 15.5 }
      : { x: 12.8, z: 14.8 };
    const free = placeAsset(state, action, detached);
    return free === state ? state : free;
  }
  if (action === "chair") {
    const placed = placeLift(state, { type: "chair", bottom: TERRAIN.base, top: REFERENCE_TOPS[1] });
    return placed === state ? state : addReferenceDescent(placed, placed.lifts.length - 1);
  }
  if (action === "snow_guns") return placeGun(state, TERRAIN.base);
  return buyBuilding(state, action);
}

/**
 * Continue the same night-14 hill with its fare, service and buildings frozen.
 * A single failed operating day disproves that this hill could coast to close.
 */
function firstFrozenPressureDay(halfway: GameState): number | null {
  let state = spendCrewPoints(sleep(setPendingSnow(setPendingFare(halfway, halfway.fare), halfway.snow)));
  while (state.phase === "day") {
    let night = resolveNightBeat(skipToClose(state));
    const recap = night.nightRecap!;
    night = setPendingSnow(setPendingFare(night, halfway.fare), halfway.snow);
    if (morningCash(night) < 0 || recap.cashDelta < dailyCosts(night).snowNight ||
        recap.satisfaction < HEALTHY_GUEST_SCORE || !recap.facts.dispatched ||
        recap.facts.avgWaitMin > VACATION_WAIT_GOAL) return night.dayIndex;
    state = spendCrewPoints(sleep(night));
  }
  return winterRecord(state).goalMet ? null : state.dayIndex;
}

export function runSeason(
  seed: number,
  strategy: Strategy,
  founderId: FounderId = "elena",
  options: { seasonLength?: number; takeLoan?: boolean; checkMidwinter?: boolean; school?: "accepted" | "declined"; summitLink?: "accepted" | "declined" } = {},
): SeasonResult {
  const hill = createBuiltHill(seed);
  const length = options.seasonLength ?? 28;
  let state = pickFounder({ ...hill, seasonLength: length, weatherDays: hill.weatherDays.slice(0, length) }, founderId);
  let recap: NightRecap | null = null;
  const days: DayRecord[] = [];
  let minCash = state.cash;
  let firstShortfallOfferedLoan = false;
  let frozenPressureDay: number | null = null;
  let runs = 0;
  let waitSum = 0;
  let dispatched = 0;
  const ctxOf = (): StrategyContext => ({
    state,
    recap,
    sawSaturdayQueue: days.some((day) => day.saturday && day.avgWaitMin > SAT.QUEUE_NAG_MIN),
    problem: recap ? biggestProblem(recap.breakdown, recap.facts) : null,
  });

  const calendar = calendarForSeason(state.mountainId, length);
  const schoolVisits: SeasonResult["schoolVisits"] = [];
  let schoolOffers = 0;
  let vivianOffers = 0;
  let guard = 0;
  while (state.phase === "day" && guard++ < 400) {
    for (const action of strategy.build?.(ctxOf()) ?? []) state = applyBuild(state, action);
    if (strategy.id === "builder" || strategy.id === "adaptive" || strategy.id === "coached") {
      state = maybeCutChairGreen(state);
    }
    minCash = Math.min(minCash, state.cash);
    const fare = state.fare;
    const snow = state.snow;
    const chair = hasChair(state);
    state = skipToClose(state);
    if (state.pendingBeat === "school_bus") {
      schoolOffers++;
      state = decideSchoolContract(state, options.school ?? "declined");
    } else if (state.pendingBeat === "summit_link") {
      vivianOffers++;
      const reply = !canTakeSummitLinkEquity({ founderId }) ? "declined" : options.summitLink ?? "declined";
      state = replyToSummitLink(state, reply);
    } else state = resolveNightBeat(state);
    recap = state.nightRecap as NightRecap;
    if (recap.facts.schoolBus) schoolVisits.push(recap.facts.schoolBus);
    const { dayStats } = state;
    runs += dayStats.completedRuns;
    waitSum += dayStats.waitSumMin;
    dispatched += dayStats.dispatched;

    days.push({
      day: state.dayIndex,
      weekend: dayKind(calendar, state.dayIndex) === "weekend",
      saturday: weekdayForDay(calendar, state.dayIndex) === "Sat",
      holidayWeek: inHolidayWeek(calendar, state.dayIndex),
      fare,
      snow,
      hasChair: chair,
      arrivals: recap.arrivals,
      satisfaction: recap.satisfaction,
      avgWaitMin: recap.facts.avgWaitMin,
      runsPerGuest: recap.facts.runsPerGuest,
      breakdown: recap.breakdown,
      cashDelta: recap.cashDelta,
      problem: recap.problem,
    });
    if (options.checkMidwinter && state.dayIndex === 14 && length > 14) frozenPressureDay = firstFrozenPressureDay(state);
    const plan = strategy.night(ctxOf());
    state = setPendingSnow(setPendingFare(state, plan.fare), plan.snow);
    const projected = morningCash(state);
    const offered = loanOffered(state);
    if (minCash >= 0 && projected < 0) firstShortfallOfferedLoan = offered;
    minCash = Math.min(minCash, projected);
    if (offered && options.takeLoan !== false) state = takeLoan(state);
    state = spendCrewPoints(sleep(state));
    minCash = Math.min(minCash, state.cash);
  }

  if (state.phase !== "winter_review") throw new Error(`Season stopped on day ${state.dayIndex} in ${state.phase}`);
  const record = winterRecord(state);
  if (!record.score) throw new Error("Completed simulated season has no measured score");
  const n = Math.max(1, days.length);
  return {
    seed,
    strategy: strategy.id,
    endCash: state.cash,
    minCash,
    endReputation: state.reputation,
    meanSatisfaction: days.reduce((a, d) => a + d.satisfaction, 0) / n,
    totalArrivals: days.reduce((a, d) => a + d.arrivals, 0),
    totalRuns: runs,
    meanWaitMin: dispatched > 0 ? waitSum / dispatched : 0,
    problemDays: days.filter((d) => d.problem !== NO_PROBLEM).length,
    wentNegative: minCash < 0,
    wentBankrupt: state.outcome === "bankrupt",
    tookLoan: state.loanTaken,
    endNetWorth: record.netWorth,
    solvent: record.goalMet,
    winterScore: record.score.total,
    firstFrozenPressureDay: frozenPressureDay,
    events: state.surpriseLog,
    schoolOffers,
    vivianOffers,
    schoolVisits,
    schoolContract: state.schoolContract,
    summitLinkDecision: state.summitLinkDecision,
    firstShortfallOfferedLoan,
    beats: state.completedBeats.filter((b) => b !== "winter_review").length,
    talents: state.talentsOwned.length,
    days,
  };
}

export type StrategySummary = {
  id: string;
  label: string;
  seeds: number;
  endCash: number;
  minCash: number;
  endReputation: number;
  meanSatisfaction: number;
  totalArrivals: number;
  totalRuns: number;
  meanWaitMin: number;
  problemDays: number;
  negativeShare: number;
  beats: number;
  talents: number;
  /** Mean over seeds of Saturday wait, game minutes, on days with a chair / without. */
  satWaitChair: number | null;
  satWaitNoChair: number | null;
  holidaySatWaitChair: number | null;
  holidaySatWaitNoChair: number | null;
};

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function summarize(strategy: Strategy, results: SeasonResult[]): StrategySummary {
  const m = (f: (r: SeasonResult) => number) => mean(results.map(f));
  const sat = (chair: boolean, holidayOnly = false) => {
    const waits = results.flatMap((r) =>
      r.days.filter((d) => d.saturday && (!holidayOnly || d.holidayWeek) && d.hasChair === chair).map((d) => d.avgWaitMin),
    );
    return waits.length ? mean(waits) : null;
  };
  return {
    id: strategy.id,
    label: strategy.label,
    seeds: results.length,
    endCash: m((r) => r.endCash),
    minCash: m((r) => r.minCash),
    endReputation: m((r) => r.endReputation),
    meanSatisfaction: m((r) => r.meanSatisfaction),
    totalArrivals: m((r) => r.totalArrivals),
    totalRuns: m((r) => r.totalRuns),
    meanWaitMin: m((r) => r.meanWaitMin),
    problemDays: m((r) => r.problemDays),
    negativeShare: m((r) => (r.wentNegative ? 1 : 0)),
    beats: m((r) => r.beats),
    talents: m((r) => r.talents),
    satWaitChair: sat(true),
    satWaitNoChair: sat(false),
    holidaySatWaitChair: sat(true, true),
    holidaySatWaitNoChair: sat(false, true),
  };
}

export function seedList(n: number, from = 1): number[] {
  return Array.from({ length: n }, (_, i) => from + i);
}

/** Season results of every strategy over `seeds`. */
export function runAll(
  seeds: number[],
  strategies: Strategy[] = STRATEGIES,
  options: Parameters<typeof runSeason>[3] = {},
): Map<string, SeasonResult[]> {
  const out = new Map<string, SeasonResult[]>();
  for (const s of strategies) out.set(s.id, seeds.map((seed) => runSeason(seed, s, "elena", options)));
  return out;
}

/** Summaries in strategy order. */
export function summarizeAll(
  runs: Map<string, SeasonResult[]>,
  strategies: Strategy[] = STRATEGIES,
): StrategySummary[] {
  return strategies.map((s) => summarize(s, runs.get(s.id) ?? []));
}

/**
 * Cash and satisfaction scaled 0–1 across `all` and averaged, so one number
 * ranks strategies on money and mood together.
 */
export function combinedScores(all: StrategySummary[]): Map<string, number> {
  const norm = (v: number, lo: number, hi: number) => (hi > lo ? (v - lo) / (hi - lo) : 0.5);
  const cashes = all.map((s) => s.endCash);
  const sats = all.map((s) => s.meanSatisfaction);
  const [cLo, cHi] = [Math.min(...cashes), Math.max(...cashes)];
  const [sLo, sHi] = [Math.min(...sats), Math.max(...sats)];
  return new Map(
    all.map((s) => [
      s.id,
      (norm(s.endCash, cLo, cHi) + norm(s.meanSatisfaction, sLo, sHi)) / 2,
    ]),
  );
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** The fixed combination with the highest `pick`, ties to the first. */
export function bestBy(
  all: StrategySummary[],
  pick: (s: StrategySummary) => number,
): StrategySummary {
  return all.reduce((best, s) => (pick(s) > pick(best) ? s : best));
}

/** A fixed-width table of summaries (the `npm run balance` output). */
export function formatTable(all: StrategySummary[]): string {
  const scores = combinedScores(all);
  const head = [
    "strategy".padEnd(20),
    "endCash".padStart(8),
    "minCash".padStart(8),
    "rep".padStart(5),
    "sat".padStart(6),
    "arrivals".padStart(9),
    "runs".padStart(6),
    "wait".padStart(6),
    "probDays".padStart(9),
    "neg%".padStart(5),
    "beats".padStart(6),
    "combo".padStart(6),
  ].join(" ");
  const rows = all.map((s) =>
    [
      s.label.padEnd(20),
      Math.round(s.endCash).toString().padStart(8),
      Math.round(s.minCash).toString().padStart(8),
      s.endReputation.toFixed(1).padStart(5),
      s.meanSatisfaction.toFixed(1).padStart(6),
      s.totalArrivals.toFixed(0).padStart(9),
      s.totalRuns.toFixed(0).padStart(6),
      s.meanWaitMin.toFixed(2).padStart(6),
      s.problemDays.toFixed(1).padStart(9),
      Math.round(s.negativeShare * 100).toString().padStart(5),
      s.beats.toFixed(1).padStart(6),
      (scores.get(s.id) ?? 0).toFixed(2).padStart(6),
    ].join(" "),
  );
  return [head, ...rows].join("\n");
}
