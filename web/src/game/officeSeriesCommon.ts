import type { DayReport } from "./state";

export function totalOperatingCost(report: DayReport): number {
  const c = report.recap.costs;
  if (c) return Math.round(c.fixed + c.founder + c.liftOps + c.upkeep);
  const rev = report.recap.revenue ?? 0;
  return Math.max(0, Math.round(rev - report.recap.cashDelta));
}

export function bestDayBy<T extends { day: number }>(
  series: readonly T[],
  score: (item: T) => number,
): { day: number; value: number } | null {
  if (series.length === 0) return null;
  let best = series[0];
  let bestVal = score(best);
  for (let i = 1; i < series.length; i++) {
    const v = score(series[i]);
    if (v > bestVal) {
      best = series[i];
      bestVal = v;
    }
  }
  return { day: best.day, value: bestVal };
}