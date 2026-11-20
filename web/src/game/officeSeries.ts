import { ASSET_CATALOG, type AssetId } from "./base";
import { morningCash, payoffAmount, type Payable } from "./economy";
import type { DayReport, GameState } from "./state";

export type RevCostPoint = {
  day: number;
  revenue: number;
  costs: number;
  net: number;
};

export type RevenueSourcePoint = {
  day: number;
  tickets: number;
  venues: number;
  schoolBus: number;
  total: number;
};

export type CashPoint = {
  day: number;
  cash: number;
  projected?: boolean;
};

export type LoanPoint = {
  day: number;
  received: number;
  repaid: number;
  netFlow: number;
};

function totalOperatingCost(report: DayReport): number {
  const c = report.recap.costs;
  if (c) return Math.round(c.fixed + c.founder + c.liftOps + c.upkeep);
  const rev = report.recap.revenue ?? 0;
  return Math.max(0, Math.round(rev - report.recap.cashDelta));
}

export function revCostSeries(history: readonly DayReport[]): RevCostPoint[] {
  return history.map((d) => {
    const revenue = Math.round(d.recap.revenue ?? Math.max(0, d.recap.cashDelta));
    const costs = totalOperatingCost(d);
    return { day: d.day, revenue, costs, net: Math.round(d.recap.cashDelta) };
  });
}

export function revenueSourcesSeries(history: readonly DayReport[]): RevenueSourcePoint[] {
  return history.map((d) => {
    const total = Math.round(d.recap.revenue ?? 0);
    const venues = Math.round(
      Object.values(d.recap.facts.venueRevenue ?? {}).reduce((sum, n) => sum + n, 0),
    );
    const schoolBus = Math.round(d.recap.facts.schoolBus?.ticketRevenue ?? 0);
    const tickets = Math.max(0, total - venues - schoolBus);
    return { day: d.day, tickets, venues, schoolBus, total };
  });
}

export function cashTrendSeries(state: GameState): CashPoint[] {
  const settled: CashPoint[] = state.dayHistory.map((d) => ({
    day: d.day,
    cash: Math.round(d.closingCash),
  }));
  const projectedCash = Math.round(morningCash(state));
  const lastSettledDay = settled.at(-1)?.day ?? 0;
  if (state.outcome === "playing" && state.dayIndex > lastSettledDay) {
    settled.push({ day: state.dayIndex, cash: projectedCash, projected: true });
  }
  return settled;
}

export type UpcomingBill = {
  dueDay: number;
  label: string;
  amount: number;
  timing: string;
};

function payableLabel(what: Payable["what"]): string {
  if (what === "lift") return "Lift";
  if (what === "lodge") return "Lodge upgrade";
  return ASSET_CATALOG[what as AssetId]?.label ?? what;
}

export function constructionSeries(state: GameState): {
  upcoming: UpcomingBill[];
  cashOnHand: number;
  freeCash: number;
  shortfall: number;
  totalPaid: number;
  totalScheduled: number;
} {
  const totalPaid = state.dayHistory.reduce((sum, d) => sum + Math.round(d.constructionDue), 0);
  const upcoming: UpcomingBill[] = state.payables
    .filter((p) => p.amount > 0)
    .slice()
    .sort((a, b) => a.dueDay - b.dueDay)
    .map((p) => ({
      dueDay: p.dueDay,
      label: payableLabel(p.what),
      amount: Math.round(p.amount),
      timing:
        p.dueDay <= state.dayIndex
          ? `Tonight (Day ${p.dueDay})`
          : p.dueDay === state.dayIndex + 1
            ? `Tomorrow (Day ${p.dueDay})`
            : `Day ${p.dueDay}`,
    }));
  const totalScheduled = upcoming.reduce((sum, item) => sum + item.amount, 0);
  const cashOnHand = Math.round(state.cash);
  const freeCash = Math.max(0, cashOnHand - totalScheduled);
  const shortfall = Math.max(0, totalScheduled - Math.max(0, cashOnHand));
  return { upcoming, cashOnHand, freeCash, shortfall, totalPaid, totalScheduled };
}

export function loanSeries(state: GameState): {
  points: LoanPoint[];
  totalBorrowed: number;
  totalRepaid: number;
  currentPayoff: number;
  active: boolean;
} {
  let totalBorrowed = 0;
  let totalRepaid = 0;
  const points: LoanPoint[] = [];
  for (const d of state.dayHistory) {
    const received = Math.round(d.recap.loanReceived);
    const repaid = Math.round(d.recap.loanRepaid);
    if (received > 0 || repaid > 0) {
      totalBorrowed += received;
      totalRepaid += repaid;
      points.push({ day: d.day, received, repaid, netFlow: received - repaid });
    }
  }
  if (state.nightRecap && (state.nightRecap.loanReceived > 0 || state.nightRecap.loanRepaid > 0)) {
    const received = Math.round(state.nightRecap.loanReceived);
    const repaid = Math.round(state.nightRecap.loanRepaid);
    totalBorrowed += received;
    totalRepaid += repaid;
    points.push({ day: state.dayIndex, received, repaid, netFlow: received - repaid });
  }
  const currentPayoff = state.loan ? Math.round(payoffAmount(state.loan)) : 0;
  const active = state.loanTaken || state.loan !== null || points.length > 0;
  return { points, totalBorrowed, totalRepaid, currentPayoff, active };
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
