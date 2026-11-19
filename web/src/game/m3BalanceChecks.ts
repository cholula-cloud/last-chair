import { expect } from "vitest";
import { ADAPTIVE, FIXED_STRATEGIES, bestBy, combinedScores, median, runSeason, type SeasonResult, type StrategySummary } from "./balance";
import { FOUNDERS } from "./content";
import { SCHOOL_BUS_FARE, SCHOOL_BUS_PUPILS } from "./schoolContract";

/** Run the same operating policy twice, changing only the replies to real offers. */
export function checkWinterChoices(seeds: number[], declined: SeasonResult[]) {
  const accepted = seeds.map((seed) => runSeason(seed, ADAPTIVE, "elena", {
    school: "accepted", summitLink: "accepted",
  }));
  expect(declined.some((run) => run.solvent)).toBe(true);
  expect(declined.every((run) => run.schoolContract?.decision !== "accepted" && run.summitLinkDecision !== "accepted")).toBe(true);
  expect(declined.some((run) => run.schoolContract?.decision === "declined")).toBe(true);
  expect(declined.some((run) => run.summitLinkDecision === "declined")).toBe(true);
  expect(accepted.some((run) => run.summitLinkDecision === "accepted")).toBe(true);
  for (const run of [...declined, ...accepted]) {
    expect(run.schoolOffers).toBe(Number(run.schoolContract !== null));
    expect(run.vivianOffers).toBe(Number(run.summitLinkDecision !== null));
  }
  const booked = accepted.filter((run) => run.schoolContract?.decision === "accepted");
  expect(booked.length).toBeGreaterThan(0);
  expect(booked.some((run) => run.schoolVisits.some((visit) => visit.taught > 0))).toBe(true);
  for (const run of booked) {
    const [visit] = run.schoolVisits;
    expect(run.schoolVisits).toHaveLength(1);
    expect(visit.arrived).toBe(SCHOOL_BUS_PUPILS);
    expect(visit.ticketRevenue).toBe(visit.arrived * SCHOOL_BUS_FARE);
    expect(visit.taught).toBeLessThanOrEqual(visit.arrived);
    expect(run.schoolContract).toMatchObject({ pupilsTaught: visit.taught });
  }
  return accepted;
}

export function storyCounts(runs: SeasonResult[]) {
  const visits = runs.flatMap((run) => run.schoolVisits);
  return {
    pie: runs.filter((run) => run.events.some((event) => event.kind === "pie")).length,
    regulars: runs.filter((run) => run.events.some((event) => event.kind === "former_regulars")).length,
    roadDelay: runs.filter((run) => run.events.some((event) => event.kind === "road_delay")).length,
    schoolOffers: runs.reduce((sum, run) => sum + run.schoolOffers, 0),
    booked: runs.filter((run) => run.schoolContract?.decision === "accepted").length,
    schoolDeclined: runs.filter((run) => run.schoolContract?.decision === "declined").length,
    visits: visits.length,
    pupils: visits.reduce((total, visit) => total + visit.arrived, 0),
    lessons: visits.reduce((total, visit) => total + visit.taught, 0),
    vivianOffers: runs.reduce((sum, run) => sum + run.vivianOffers, 0),
    vivianAccepted: runs.filter((run) => run.summitLinkDecision === "accepted").length,
    vivianDeclined: runs.filter((run) => run.summitLinkDecision === "declined").length,
  };
}

export function meanWinterScore(runs: SeasonResult[]) {
  return runs.reduce((sum, run) => sum + run.winterScore, 0) / runs.length;
}

export function checkFounderScores(seeds: number[], adaptive: SeasonResult[]) {
  const results = FOUNDERS.map((founder) => {
    const runs = founder.id === "elena" ? adaptive : seeds.map((seed) => runSeason(seed, ADAPTIVE, founder.id));
    return {
      founder: founder.name,
      solvent: runs.filter((run) => run.solvent).length,
      meanScore: meanWinterScore(runs),
      meanNetWorth: Math.round(runs.reduce((sum, run) => sum + run.endNetWorth, 0) / runs.length),
      satisfaction: runs.reduce((sum, run) => sum + run.meanSatisfaction, 0) / runs.length,
    };
  });
  const middle = median(results.map((row) => row.meanScore));
  for (const row of results) {
    expect(row.meanScore, row.founder).toBeGreaterThanOrEqual(middle * 0.85);
    expect(row.meanScore, row.founder).toBeLessThanOrEqual(middle * 1.15);
  }
  return results;
}

export function checkStrategyScores(runs: Map<string, SeasonResult[]>) {
  const score = (id: string) => meanWinterScore(runs.get(id) ?? []);
  expect(score("adaptive")).toBeGreaterThanOrEqual(65);
  expect(score("coached")).toBeGreaterThanOrEqual(65);
  expect(score("expensive/minimal")).toBeLessThan(50); // Stingy's identical no-build policy.
  expect(Math.max(...[...runs.values()].map(meanWinterScore))).toBeLessThan(90);
}

export function checkFixedStrategies(summaries: StrategySummary[]) {
  const fixed = summaries.filter((row) => FIXED_STRATEGIES.some((strategy) => strategy.id === row.id));
  expect(bestBy(fixed, (row) => row.endCash).id).not.toBe(bestBy(fixed, (row) => row.meanSatisfaction).id);
  const adaptive = summaries.find((row) => row.id === ADAPTIVE.id)!;
  const combined = combinedScores([...fixed, adaptive]);
  const middle = median(fixed.map((row) => combined.get(row.id)!));
  expect(combined.get(ADAPTIVE.id)).toBeGreaterThan(middle + 0.15);
}

export function checkFrozenWinters(strategies: Map<string, SeasonResult[]>) {
  for (const [strategy, runs] of strategies) {
    const pressured = runs.filter((run) => run.firstFrozenPressureDay !== null);
    expect(pressured.length, strategy).toBeGreaterThanOrEqual(Math.ceil(runs.length / 2));
  }
}
