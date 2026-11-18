import { describe, it } from "vitest";
import { formatTable, runAll, seedList, summarizeAll } from "./balance";
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

  it("prints the strategy table", { timeout: 600_000 }, () => {
    const n = Number(process.env.BALANCE_SEEDS ?? 40);
    const all = summarizeAll(runAll(seedList(n)));
    const chair = all.filter((s) => s.satWaitChair !== null || s.satWaitNoChair !== null);
    const lines = chair.map(
      (s) =>
        `${s.label.padEnd(20)} Saturday wait: no chair ${s.satWaitNoChair?.toFixed(2) ?? "-"} min, chair ${s.satWaitChair?.toFixed(2) ?? "-"} min`,
    );
    console.info(`\nBalance report, ${n} seeds, 14-day season, founder Elena\n\n${formatTable(all)}\n\n${lines.join("\n")}\n`);
  });
});
