import { formatMoney } from "./format";
import { closedDaysBeforeNextOpen, dayLabel, type CalendarDef } from "./calendar";
import type { GameState } from "./state";
import { applyOvernight } from "./sim";
import { trailExposure } from "./clearing";
import { hasMaintenanceGarage } from "./base";
import { groomCoverage, gunCoverageForTrails } from "./guns";
import { morningWeatherHeadline, weatherForDay } from "./weather";
import type { SnowPreset } from "./types";

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
    gunCoverage: gunCoverageForTrails(
      state.trails,
      state.guns,
      state.talentsOwned,
      weatherTomorrow.wind,
      trailExposureGrid(state),
    ),
    groomCoverage: groomCoverage(
      state.trails,
      state.dayStats.runsByTrail,
      snow,
      state.talentsOwned,
      hasMaintenanceGarage(state.assets, state.lodgeTier),
    ),
    hasMaintenanceGarage: hasMaintenanceGarage(state.assets, state.lodgeTier),
    exposure: trailExposureGrid(state),
    hasPlacedGuns: state.guns.length > 0,
    trailElevations: state.trails.map((t) => t.elevations),
    weatherTomorrow,
    buildings: state.buildings,
    talentsOwned: state.talentsOwned,
    daysWithoutSnow: state.daysWithoutSnow,
  });
  const crewPoints = state.crewPoints + overnight.crewPointsEarned;
  return { overnight, state: { ...state, crewPoints } };
}

/**
 * One civil day with no public skiing. Operating and snow-service costs are covered by a
 * weekday lease to the local Olympic training committee; the hill still ages snow and crew overnight.
 */
export function simulateClosedDay(state: GameState, calendarDay: number): GameState {
  const draws = state.payables.reduce((sum, item) => sum + (item.dueDay <= calendarDay ? item.amount : 0), 0);
  const interest = state.loan ? state.loan.principal * state.loan.ratePerDay : 0;
  const cash = state.cash - (draws + interest);
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
  const headlines: string[] = [];
  const cashStart = state.cash;
  for (const d of days) {
    s = simulateClosedDay(s, d);
    headlines.push(`${dayLabel(cal, d).weekday}: ${morningWeatherHeadline(s.weather)}`);
  }
  return {
    state: s,
    summary: { days, cashDelta: s.cash - cashStart, snowNight: 0, headlines },
  };
}

/** Weekday digest copy (Neon). {span} is a weekday range or single date. */
const WEEKDAY_DIGEST_COPY = {
  opening: (span: string) => `Closed to the public (${span}).`,
  lease:
    "The Readsboro Olympic committee leased the hill to run gates and race training, picking up the lift and snow bills so the weekdays broke even without selling a single lift ticket.",
  ledgerEven: "Nothing came due on loans or construction, so the cash box stayed put.",
  ledgerDebt: (amount: string) => `Loan interest and construction bills still took their cut (${amount}).`,
} as const;

export function formatWeekdayDigest(cal: CalendarDef, summary: ClosedDaySummary): string {
  const last = summary.days.at(-1)!;
  const first = summary.days[0]!;
  const span = summary.days.length === 1
    ? dayLabel(cal, first).date
    : `${dayLabel(cal, first).weekday}–${dayLabel(cal, last).weekday}`;
  const weather = summary.headlines[summary.headlines.length - 1] ?? "";
  const ledger = summary.cashDelta === 0
    ? WEEKDAY_DIGEST_COPY.ledgerEven
    : WEEKDAY_DIGEST_COPY.ledgerDebt(formatMoney(summary.cashDelta));
  return `${WEEKDAY_DIGEST_COPY.opening(span)} ${WEEKDAY_DIGEST_COPY.lease} ${ledger} ${weather}`;
}