import { dayLabel, MOUNTAIN_CALENDARS } from "./calendar";
import { isLiftOperational } from "./lifts";
import type { SatTerms } from "./satisfaction";
import { readSnow } from "./snow";
import { snowCarriers } from "./trails";
import type { DayReport, GameState } from "./state";
import { FARE_LABELS, FARE_PRICES, type FarePreset, type TrailDifficulty, type WeatherKind } from "./types";
import { totalOperatingCost } from "./officeSeriesCommon";

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