import { describe, it } from "vitest";
import { formatTable, runAll, seedList, summarizeAll } from "./balance";

/**
 * The balance report: every strategy over N seeds (default 40), printed as a
 * table. Skipped unless BALANCE_REPORT=1; run it with `npm run balance`.
 * BALANCE_SEEDS overrides N.
 */
describe.runIf(process.env.BALANCE_REPORT === "1")("balance report", () => {
  it("prints the strategy table", { timeout: 600_000 }, () => {
    const n = Number(process.env.BALANCE_SEEDS ?? 40);
    const all = summarizeAll(runAll(seedList(n)));
    const chair = all.filter((s) => s.satWaitChair !== null || s.satWaitNoChair !== null);
    const lines = chair.map(
      (s) =>
        `${s.label.padEnd(20)} Saturday wait: no chair ${s.satWaitNoChair?.toFixed(2) ?? "-"} min, chair ${s.satWaitChair?.toFixed(2) ?? "-"} min`,
    );
    process.stdout.write(`\nBalance report, ${n} seeds, 14-day season, founder Elena\n\n${formatTable(all)}\n\n${lines.join("\n")}\n`);
  });
});
