import { ASSET_CATALOG, type AssetId } from "./base";
import { dayLabel, MOUNTAIN_CALENDARS } from "./calendar";
import { morningCash, payoffAmount, type Payable } from "./economy";
import { isLiftOperational } from "./lifts";
import type { SatTerms } from "./satisfaction";
import { readSnow } from "./snow";
import { snowCarriers } from "./trails";
import type { DayReport, GameState } from "./state";
import { FARE_LABELS, FARE_PRICES, type FarePreset, type TrailDifficulty, type WeatherKind } from "./types";

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

export type FareElasticityRow = {
  fare: FarePreset;
  label: string;
  price: number;
  days: number;
  avgArrivals: number;
  avgRevenue: number;
};

export function fareElasticitySeries(history: readonly DayReport[]): FareElasticityRow[] {
  const buckets: Record<FarePreset, { days: number; arrivals: number; revenue: number }> = {
    cheap: { days: 0, arrivals: 0, revenue: 0 },
    balanced: { days: 0, arrivals: 0, revenue: 0 },
    expensive: { days: 0, arrivals: 0, revenue: 0 },
  };
  for (const d of history) {
    const b = buckets[d.fare];
    b.days += 1;
    b.arrivals += d.recap.arrivals;
    b.revenue += d.recap.revenue ?? Math.max(0, d.recap.cashDelta);
  }
  return (["cheap", "balanced", "expensive"] as const)
    .filter((fare) => buckets[fare].days > 0)
    .map((fare) => {
      const b = buckets[fare];
      return {
        fare,
        label: FARE_LABELS[fare],
        price: FARE_PRICES[fare],
        days: b.days,
        avgArrivals: Math.round(b.arrivals / b.days),
        avgRevenue: Math.round(b.revenue / b.days),
      };
    });
}

export type OpsPoint = {
  day: number;
  arrivals: number;
  avgWaitMin: number;
  satisfaction: number;
  breakdown: SatTerms;
  snowCost: number;
  operatingCost: number;
  revenue: number;
};

export function opsSeries(history: readonly DayReport[]): OpsPoint[] {
  return history.map((d) => ({
    day: d.day,
    arrivals: d.recap.arrivals,
    avgWaitMin: d.recap.facts.avgWaitMin,
    satisfaction: Math.round(d.recap.satisfaction),
    breakdown: d.recap.breakdown,
    snowCost: Math.round(d.snowCost),
    operatingCost: totalOperatingCost(d),
    revenue: Math.round(d.recap.revenue ?? Math.max(0, d.recap.cashDelta)),
  }));
}

export type CalendarCell = {
  day: number;
  weekday: string;
  date: string;
  holiday: string | null;
  weather: WeatherKind | null;
  status: "settled" | "today" | "upcoming";
  report: DayReport | null;
};

export function seasonCalendarCells(state: GameState): CalendarCell[] {
  const cal = MOUNTAIN_CALENDARS[state.mountainId];
  const byDay = new Map(state.dayHistory.map((d) => [d.day, d]));
  const cells: CalendarCell[] = [];
  for (let day = 1; day <= state.seasonLength; day++) {
    const meta = dayLabel(cal, day);
    const report = byDay.get(day) ?? null;
    const status = report ? "settled" : day === state.dayIndex ? "today" : "upcoming";
    const weather = report ? report.weather : day === state.dayIndex ? state.weather : null;
    cells.push({
      day,
      weekday: meta.weekday,
      date: meta.date,
      holiday: meta.note ?? null,
      weather,
      status,
      report,
    });
  }
  return cells;
}

export type TrailReportRow = {
  name: string;
  difficulty: TrailDifficulty;
  open: boolean;
  glade: boolean;
  depthPct: number;
  qualityPct: number;
  condition: string;
  tone: "good" | "watch" | "bad";
};

export function trailReportRows(state: GameState): TrailReportRow[] {
  return state.trails
    .filter((t) => t.open)
    .map((t) => {
      const lift = state.lifts[t.liftIndex];
      const open = Boolean(lift && isLiftOperational(lift, t.liftIndex, state.trails));
      const n = Math.max(1, t.snow.length);
      const depth = t.snow.reduce((sum, seg) => sum + seg.depth, 0) / n;
      const quality = t.snow.reduce((sum, seg) => sum + seg.quality, 0) / n;
      const reading = readSnow(snowCarriers([t]));
      return {
        name: t.name,
        difficulty: t.difficulty,
        open,
        glade: Boolean(t.glade),
        depthPct: Math.round(depth * 100),
        qualityPct: Math.round(quality * 100),
        condition: open ? reading.label : "Closed",
        tone: open ? reading.tone : "bad",
      };
    });
}
