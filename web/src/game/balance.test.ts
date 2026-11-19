import { beforeAll, describe, expect, it } from "vitest";
import {
  ADAPTIVE,
  BUILDER,
  CARELESS,
  COACHED,
  FIXED_STRATEGIES,
  STINGY,
  bestBy,
  combinedScores,
  median,
  runAll,
  runSeason,
  seedList,
  summarizeAll,
  strategyById,
  type DayRecord,
  type SeasonResult,
  type StrategySummary,
} from "./balance";
import { checkFounderScores, checkWinterChoices } from "./m3BalanceChecks";
import { SEASON_LENGTH } from "./sim";
import { createInitialState } from "./state";

// Fast balance properties over a small seed set (see SIMULATION_SPEC, Balance
// (PR 10)). `npm run balance` prints the 40-seed table these margins come from.
const SEEDS = seedList(6);
const START_CASH = createInitialState().cash;
// STINGY plays exactly Expensive / Minimal with no building, so its numbers are that fixed combination's.
const STRATEGIES = [...FIXED_STRATEGIES, ADAPTIVE, BUILDER, CARELESS, COACHED];

let runs: Map<string, SeasonResult[]>;
let sums: Map<string, StrategySummary>;

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sum = (id: string) => sums.get(id) as StrategySummary;
const daysOf = (id: string, pick: (d: DayRecord) => boolean): DayRecord[] =>
  (runs.get(id) ?? []).flatMap((r) => r.days.filter(pick));

beforeAll(() => {
  runs = runAll(SEEDS, STRATEGIES);
  sums = new Map(summarizeAll(runs, STRATEGIES).map((s) => [s.id, s]));
}, 300_000);

describe("runSeason", () => {
  it("plays a whole season and is deterministic per seed", () => {
    const a = runSeason(3, strategyById("balanced/mid"));
    expect(a.days).toHaveLength(SEASON_LENGTH);
    expect(runSeason(3, strategyById("balanced/mid"), "elena", { seasonLength: 14 }).days).toHaveLength(14);
    expect(a.totalArrivals).toBeGreaterThan(0);
    expect(a.minCash).toBeLessThanOrEqual(a.endCash);
    expect(runSeason(3, strategyById("balanced/mid"))).toEqual(a);
  });

  it("the stingy strategy is Expensive / Minimal without building", () => {
    expect(runSeason(2, STINGY)).toEqual({ ...runSeason(2, strategyById("expensive/minimal")), strategy: "stingy" });
  });

  it("different seeds play different winters", () => {
    const [a, b] = [1, 2].map((s) => runSeason(s, strategyById("balanced/mid")));
    expect(a.endCash).not.toBe(b.endCash);
  });
});

describe("balance properties", () => {
  it("no fixed combination is best on both cash and satisfaction", () => {
    const fixed = FIXED_STRATEGIES.map((s) => sum(s.id));
    expect(bestBy(fixed, (s) => s.endCash).id).not.toBe(bestBy(fixed, (s) => s.meanSatisfaction).id);
  });

  it("an adaptive player beats the median fixed combination on cash plus satisfaction", () => {
    const fixed = FIXED_STRATEGIES.map((s) => sum(s.id));
    const scores = combinedScores([...fixed, sum("adaptive")]);
    const fixedScores = fixed.map((s) => scores.get(s.id) as number);
    expect(scores.get("adaptive")).toBeGreaterThan(median(fixedScores) + 0.15);
    expect(sum("adaptive").meanSatisfaction).toBeGreaterThan(sum("balanced/mid").meanSatisfaction + 10);
  });

  it("stinginess costs reputation and guests", () => {
    expect(sum("expensive/minimal").endReputation).toBeLessThan(sum("balanced/mid").endReputation - 10);
    expect(sum("expensive/minimal").totalArrivals).toBeLessThan(sum("balanced/mid").totalArrivals * 0.85);
  });

  it("the snow bill bites a cheap fare", () => {
    expect(sum("cheap/high").endCash).toBeLessThan(sum("balanced/mid").endCash - 1500);
  });

  it("some fixed combinations lose at least 10% of starting cash", () => {
    const losing = FIXED_STRATEGIES.map((s) => sum(s.id)).filter((s) => s.endCash < START_CASH * 0.9);
    expect(losing.length).toBeGreaterThan(0);
  });

  it("the chair cuts weekend queues but leaves a line", () => {
    const weekend = (d: DayRecord) => d.weekend;
    const without = mean(daysOf("balanced/mid", weekend).map((d) => d.avgWaitMin));
    const withChair = mean(daysOf("builder", (d) => d.weekend && d.hasChair).map((d) => d.avgWaitMin));
    expect(without).toBeGreaterThan(8);
    expect(withChair).toBeLessThan(without / 4);
    expect(withChair).toBeGreaterThan(1);
    expect(withChair).toBeLessThan(5);
    expect(sum("balanced/mid").holidaySatWaitNoChair).toBeGreaterThan(12);
    expect(sum("builder").holidaySatWaitChair).toBeGreaterThan(1);
    expect(sum("builder").holidaySatWaitChair).toBeLessThan(5);
  });

  it("a passive Balanced / Mid season preserves capital while Adaptive earns more", () => {
    const end = sum("balanced/mid").endCash;
    expect(end).toBeGreaterThan(START_CASH * 0.9);
    expect(sum("adaptive").endCash).toBeGreaterThan(end);
  });

  it("a passive Balanced / Mid season earns less than 30% on starting cash", () => {
    expect(sum("balanced/mid").endCash).toBeLessThan(START_CASH * 1.3);
  });

  it("the runs term moves with queues", () => {
    const runsTerm = (id: string, pick: (d: DayRecord) => boolean) =>
      mean(daysOf(id, pick).map((d) => d.breakdown.runs));
    const queued = runsTerm("balanced/mid", (d) => d.weekend);
    const quiet = runsTerm("balanced/mid", (d) => !d.weekend && d.day < 20);
    expect(quiet).toBeGreaterThan(4.9);
    expect(queued).toBeLessThan(quiet - 0.5);
    expect(runsTerm("builder", (d) => d.weekend && d.hasChair)).toBeGreaterThan(queued + 0.5);
  });
});

describe("economy balance", () => {
  it("keeps every strategy above zero through a 14-day winter", { timeout: 120_000 }, () => {
    const short = runAll(SEEDS, STRATEGIES, { seasonLength: 14 });
    expect([...short.values()].flat().filter((result) => result.wentNegative)).toHaveLength(0);
  });

  it("exposes careless 28-day shortfalls while prudent strategies avoid bankruptcy", () => {
    expect((runs.get(CARELESS.id) ?? []).filter((result) => result.wentNegative).length).toBeGreaterThanOrEqual(2);
    expect(STRATEGIES.filter((strategy) => strategy !== CARELESS)
      .flatMap((strategy) => runs.get(strategy.id) ?? []).filter((result) => result.wentBankrupt)).toHaveLength(0);
  });
});

it("settles independent winters and delivers booked school visits through the ordinary simulation", { timeout: 120_000 }, () => {
  checkWinterChoices(SEEDS, runs.get("adaptive") ?? []);
});

it("keeps every founder's adaptive score within 15% of the median", { timeout: 120_000 }, () => {
  checkFounderScores(SEEDS, runs.get("adaptive") ?? []);
});
