import { describe, expect, it } from "vitest";
import { ADAPTIVE, CARELESS, STRATEGIES, formatTable, runAll, summarize, seedList, summarizeAll } from "./balance";
import { checkFixedStrategies, checkFounderScores, checkStrategyScores, checkWinterChoices, meanWinterScore, storyCounts } from "./m3BalanceChecks";
import { gateMetrics, gateScenarios } from "./m2gate";

/**
 * The balance report: every strategy over N seeds (default 40), printed as a
 * table. Skipped unless BALANCE_REPORT=1; run it with `npm run balance`.
 * BALANCE_SEEDS overrides N.
 */
describe.runIf(process.env.BALANCE_REPORT === "1")("balance report", () => {
  it("prints the paired M2 gate outcomes", { timeout: 120_000 }, () => {
    const n = Number(process.env.BALANCE_SEEDS ?? 40);
    const metrics = gateMetrics(seedList(n).map((seed) => gateScenarios(seed)));
    const rows = Object.entries(metrics).map(([name, { wait, satisfaction }]) =>
      `${name.padEnd(10)} wait ${wait.toFixed(3)} min, satisfaction ${satisfaction.toFixed(3)}`,
    );
    console.info(`\nM2 gate, ${n} paired seeds\n${rows.join("\n")}\n`);
  });

  it("verifies the economy and prints the strategy table", { timeout: 1_800_000 }, () => {
    const n = Number(process.env.BALANCE_SEEDS ?? 40);
    const seeds = seedList(n);
    const long = runAll(seeds);
    const all = summarizeAll(long);
    const adaptive = long.get(ADAPTIVE.id) ?? [];
    const accepted = checkWinterChoices(seeds, adaptive);
    for (const [id, runs] of [...long, ["adaptive/accept", accepted] as const]) {
      const net = runs.reduce((sum, run) => sum + run.endNetWorth, 0) / n;
      const summary = summarize(STRATEGIES.find((strategy) => strategy.id === id) ?? ADAPTIVE, runs);
      console.info(id, JSON.stringify({
        winterScore: meanWinterScore(runs).toFixed(1),
        netWorth: Math.round(net), solvent: runs.filter((run) => run.solvent).length,
        bankrupt: runs.filter((run) => run.wentBankrupt).length,
        holidaySaturdayWaitNoChair: summary.holidaySatWaitNoChair?.toFixed(2) ?? null, holidaySaturdayWaitChair: summary.holidaySatWaitChair?.toFixed(2) ?? null,
        ...storyCounts(runs),
      }));
    }
    for (const row of checkFounderScores(seeds, adaptive)) console.info(row.founder, JSON.stringify(row));
    expect(all.find((row) => row.id === "balanced/mid")?.holidaySatWaitNoChair).toBeGreaterThan(12);
    const holidayChair = all.find((row) => row.id === "builder")?.holidaySatWaitChair;
    expect(holidayChair).toBeGreaterThan(1);
    expect(holidayChair).toBeLessThan(5);
    checkFixedStrategies(all);
    checkStrategyScores(long);
    const short = runAll(seeds, STRATEGIES, { seasonLength: 14 });
    const careful = STRATEGIES.filter((strategy) => strategy !== CARELESS)
      .flatMap((strategy) => long.get(strategy.id) ?? []);
    const declined = runAll(seeds, [CARELESS], { takeLoan: false }).get(CARELESS.id) ?? [];
    const shortfalls = declined.filter((run) => run.wentNegative);
    const rescued = long.get(CARELESS.id)?.filter((run) => run.tookLoan).length ?? 0;
    const chair = all.filter((s) => s.satWaitChair !== null || s.satWaitNoChair !== null);
    const lines = chair.map(
      (s) =>
        `${s.label.padEnd(20)} Saturday wait: no chair ${s.satWaitNoChair?.toFixed(2) ?? "-"} min, chair ${s.satWaitChair?.toFixed(2) ?? "-"} min`,
    );
    console.info(`\nBalance report, ${n} seeds, 28-day season, founder Elena\n\n${formatTable(all)}\n\n${lines.join("\n")}\n`);
    console.info(`Careless in 28 days: ${shortfalls.length}/${n} projected shortfalls, ${rescued} loans taken, ${declined.filter((run) => run.wentBankrupt).length} bankruptcies with no loan.`);
    expect([...short.values()].flat().filter((run) => run.wentNegative)).toHaveLength(0);
    expect(careful.filter((run) => run.wentBankrupt)).toHaveLength(0);
    expect(shortfalls.length).toBeGreaterThanOrEqual(Math.ceil(n / 4));
    expect(shortfalls.every((run) => run.firstShortfallOfferedLoan)).toBe(true);
  });
});
