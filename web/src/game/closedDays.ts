import { formatMoney } from "./format";
import { operatingCosts } from "./economy";
import { closedDaysBeforeNextOpen, dayLabel, type CalendarDef } from "./calendar";
import { spendAllCrewPoints } from "./talentProgress";
import type { GameState } from "./state";
import { applyOvernight } from "./sim";
import { trailExposure } from "./clearing";
import { groomCoverage, gunCoverage } from "./guns";
import { morningWeatherHeadline, weatherForDay } from "./weather";
import { snowNightCost, type SnowPreset } from "./types";

export type ClosedDaySummary = {
  days: number[];
  cashDelta: number;
  snowNight: number;
  headlines: string[];
};

function trailExposureGrid(state: GameState): number[][] {
  const cleared = new Set(state.clearedCells);
  return state.trails.map((trail) => trailExposure(trail, cleared));
}

function overnightForClosed(state: GameState, snow: SnowPreset, calendarDay: number) {
  const weatherTomorrow = state.weatherDays[calendarDay] ?? weatherForDay({ ...state, dayIndex: calendarDay });
  const overnight = applyOvernight({
    snow,
    cash: state.cash,
    trails: state.trails.map((t) => t.snow),
    openTrails: state.trails.map((t) => t.open),
    gunCoverage: state.trails.map((t) => (t.open ? gunCoverage(t, state.guns, state.talentsOwned) : [])),
    groomCoverage: groomCoverage(state.trails, state.dayStats.runsByTrail, snow, state.talentsOwned),
    exposure: trailExposureGrid(state),
    hasPlacedGuns: state.guns.length > 0,
    trailElevations: state.trails.map((t) => t.elevations),
    weatherTomorrow,
    buildings: state.buildings,
    talentsOwned: state.talentsOwned,
    daysWithoutSnow: state.daysWithoutSnow,
  });
  const crewPoints = state.crewPoints + overnight.crewPointsEarned;
  const spentNight = spendAllCrewPoints({ ...state, talentsOwned: state.talentsOwned, crewPoints });
  return { overnight, state: spentNight.state };
}

/** One civil day with no guests; locked fare and snow tiers stay as-is. */
export function simulateClosedDay(state: GameState, calendarDay: number): GameState {
  const ops = operatingCosts({ ...state, dayIndex: calendarDay });
  const snowNight = calendarDay < state.seasonLength ? snowNightCost(state.snow, state.talentsOwned) : 0;
  const draws = state.payables.reduce((sum, item) => sum + (item.dueDay <= calendarDay ? item.amount : 0), 0);
  const interest = state.loan ? state.loan.principal * state.loan.ratePerDay : 0;
  const cash =
    state.cash - (ops.fixed + ops.founder + ops.liftOps + ops.upkeep + snowNight + draws + interest);
  const next: GameState = {
    ...state,
    dayIndex: calendarDay,
    weather: state.weatherDays[calendarDay - 1]?.kind ?? state.weather,
    cash,
    payables: state.payables.filter(({ dueDay }) => dueDay > calendarDay),
    loan: state.loan ? { ...state.loan, balance: state.loan.balance + interest } : null,
    debtMornings: cash < 0 ? state.debtMornings + 1 : 0,
  };
  const { overnight, state: afterCrew } = overnightForClosed(next, state.snow, calendarDay);
  return {
    ...afterCrew,
    trails: next.trails.map((t, i) => ({
      ...t,
      snow: overnight.trails[i] ?? t.snow,
      gunCovered: overnight.gunCoverage?.[i],
      groomed: overnight.groomCoverage?.[i],
    })),
    snowQuality: overnight.snowQuality,
    snowDepth: overnight.snowDepth,
    gunReach: overnight.gunReach,
    groomVisible: overnight.groomVisible,
    daysWithoutSnow: overnight.daysWithoutSnow,
    gunsVisible: overnight.gunsFired,
    weather: overnight.weather,
  };
}

export function advanceClosedDays(
  state: GameState,
  cal: CalendarDef,
  fromCalendarDay: number,
): { state: GameState; summary: ClosedDaySummary | null } {
  const days = closedDaysBeforeNextOpen(cal, fromCalendarDay);
  if (!days.length) return { state, summary: null };
  let s = state;
  let snowTotal = 0;
  const headlines: string[] = [];
  const cashStart = state.cash;
  for (const d of days) {
    snowTotal += snowNightCost(s.snow, s.talentsOwned);
    s = simulateClosedDay(s, d);
    headlines.push(`${dayLabel(cal, d).weekday}: ${morningWeatherHeadline(s.weather)}`);
  }
  return {
    state: s,
    summary: { days, cashDelta: s.cash - cashStart, snowNight: snowTotal, headlines },
  };
}

export function formatWeekdayDigest(cal: CalendarDef, summary: ClosedDaySummary): string {
  const last = summary.days.at(-1)!;
  const first = summary.days[0]!;
  const span = summary.days.length === 1
    ? dayLabel(cal, first).date
    : `${dayLabel(cal, first).weekday}–${dayLabel(cal, last).weekday}`;
  const cashLine = summary.cashDelta === 0
    ? "Cash held steady off the hill."
    : `Off the hill: ${formatMoney(summary.cashDelta)} in operating costs.`;
  const weather = summary.headlines[summary.headlines.length - 1] ?? "";
  return `While Dutch Hill was closed (${span}), ${cashLine} ${weather}`;
}