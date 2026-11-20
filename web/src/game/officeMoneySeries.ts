import { ASSET_CATALOG, type AssetId } from "./base";
import { morningCash, payoffAmount, type Payable } from "./economy";
import type { NightRecap } from "./sim";
import type { DayReport, GameState } from "./state";
import { totalOperatingCost } from "./officeSeriesCommon";

export type RevCostPoint = {
  day: number;
  revenue: number;
  costs: number;
  net: number;
};

export type RevenueBreakdown = {
  total: number;
  tickets: number;
  venues: number;
  schoolBus: number;
};

export type RevenueSourcePoint = RevenueBreakdown & { day: number };

const EMPTY_BREAKDOWN: RevenueBreakdown = { total: 0, tickets: 0, venues: 0, schoolBus: 0 };

/** Customer revenue for one closed day: lift tickets, base venues, and school bus fares. */
export function revenueBreakdownFromRecap(
  recap: Pick<NightRecap, "revenue" | "facts">,
): RevenueBreakdown | null {
  if (recap.revenue == null) return null;
  const total = Math.round(recap.revenue);
  const venues = Math.round(
    Object.values(recap.facts.venueRevenue ?? {}).reduce((sum, n) => sum + n, 0),
  );
  const schoolBus = Math.round(recap.facts.schoolBus?.ticketRevenue ?? 0);
  const tickets = Math.max(0, total - venues - schoolBus);
  return { total, tickets, venues, schoolBus };
}

export function revenueSourcesAggregate(history: readonly DayReport[]): RevenueBreakdown {
  return history.reduce((acc, d) => {
    const b = revenueBreakdownFromRecap(d.recap);
    if (!b) return acc;
    return {
      total: acc.total + b.total,
      tickets: acc.tickets + b.tickets,
      venues: acc.venues + b.venues,
      schoolBus: acc.schoolBus + b.schoolBus,
    };
  }, { ...EMPTY_BREAKDOWN });
}

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

export function revCostSeries(history: readonly DayReport[]): RevCostPoint[] {
  return history.map((d) => {
    const revenue = Math.round(d.recap.revenue ?? Math.max(0, d.recap.cashDelta));
    const costs = totalOperatingCost(d);
    return { day: d.day, revenue, costs, net: Math.round(d.recap.cashDelta) };
  });
}

export function revenueSourcesSeries(history: readonly DayReport[]): RevenueSourcePoint[] {
  return history.map((d) => {
    const breakdown = revenueBreakdownFromRecap(d.recap) ?? EMPTY_BREAKDOWN;
    return { day: d.day, ...breakdown };
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