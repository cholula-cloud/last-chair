import { operatingCosts } from "./economy";
import { computeDayRevenue } from "./sim";
import type { GameState } from "./state";
import type { DayStats, Guest } from "./types";
import { FARE_PRICES } from "./types";
import { SCHOOL_BUS_FARE } from "./schoolContract";

/** Base ticket share posted when a public guest arrives (see SIMULATION_SPEC revenue formula). */
export function ticketBaseAmount(fare: GameState["fare"]): number {
  return Math.round(FARE_PRICES[fare] * 0.5);
}

export function ticketBaseOnArrival(guest: Guest, fare: GameState["fare"]): number {
  if (guest.schoolPupil) return SCHOOL_BUS_FARE;
  return ticketBaseAmount(fare);
}

export function postedTicketBase(stats: Pick<DayStats, "ticketBasePosted" | "schoolBusPosted">): number {
  return (stats.ticketBasePosted ?? 0) + (stats.schoolBusPosted ?? 0);
}

/** Satisfaction-linked ticket portion due at close (public tickets only). */
export function ticketSatisfactionBonus(
  fare: GameState["fare"],
  satisfaction: number,
  stats: Pick<DayStats, "arrivals" | "ticketBasePosted" | "schoolBusPosted">,
  schoolArrived: number,
): number {
  const publicArrivals = Math.max(0, stats.arrivals - schoolArrived);
  const ticketTotal = computeDayRevenue(fare, satisfaction, publicArrivals);
  const basePosted = stats.ticketBasePosted ?? 0;
  return Math.round(ticketTotal - basePosted);
}

export function venueRevenueTotal(stats: Pick<DayStats, "venueRevenue">): number {
  return Math.round(Object.values(stats.venueRevenue ?? {}).reduce((sum, n) => sum + n, 0));
}

export function operatingCostTotal(state: GameState): number {
  const costs = operatingCosts(state);
  return costs.fixed + costs.founder + costs.liftOps + costs.upkeep;
}

export function postRevenue(state: GameState, amount: number): GameState {
  if (amount === 0) return state;
  return {
    ...state,
    cash: state.cash + amount,
    dayStats: {
      ...state.dayStats,
      intradayRevenue: true,
    },
  };
}

export function recordGuestArrivalRevenue(
  state: GameState,
  guest: Guest,
): GameState {
  const amount = ticketBaseOnArrival(guest, state.fare);
  if (amount === 0) return state;
  const isSchool = Boolean(guest.schoolPupil);
  return {
    ...postRevenue(state, amount),
    dayStats: {
      ...state.dayStats,
      ticketBasePosted: (state.dayStats.ticketBasePosted ?? 0) + (isSchool ? 0 : amount),
      schoolBusPosted: (state.dayStats.schoolBusPosted ?? 0) + (isSchool ? amount : 0),
      intradayRevenue: true,
    },
  };
}

export type TodaySales = {
  ticketBase: number;
  ticketBonusEstimate: number;
  venues: number;
  schoolBus: number;
  runningSales: number;
  operatingCostsAtClose: number;
};

/** Live money-in for Office → Money during an operating day. */
export function todaySales(state: GameState, liveSatisfaction: number): TodaySales {
  const stats = state.dayStats;
  const schoolArrived = state.guests.filter((g) => g.schoolPupil && g.state !== "pending").length;
  const ticketBonusEstimate = Math.max(
    0,
    ticketSatisfactionBonus(state.fare, liveSatisfaction, { ...stats, arrivals: stats.arrivals }, schoolArrived),
  );
  const venues = venueRevenueTotal(stats);
  const schoolBus = stats.schoolBusPosted ?? 0;
  const ticketBase = stats.ticketBasePosted ?? 0;
  return {
    ticketBase,
    ticketBonusEstimate,
    venues,
    schoolBus,
    runningSales: ticketBase + schoolBus + ticketBonusEstimate + venues,
    operatingCostsAtClose: operatingCostTotal(state),
  };
}

export function operatingSettledAtClose(stats: DayStats): boolean {
  return Boolean(stats.operatingSettled);
}

/**
 * Apply satisfaction ticket bonus and operating costs at 4 PM.
 * Legacy saves without intraday posting get one full operating net instead.
 */
export function settleOperatingDay(
  state: GameState,
  satisfaction: number,
  schoolArrived: number,
): GameState {
  const stats = state.dayStats;
  const costs = operatingCostTotal(state);

  if (!stats.intradayRevenue) {
    const publicArrivals = Math.max(0, stats.arrivals - schoolArrived);
    const ticketTotal = computeDayRevenue(state.fare, satisfaction, publicArrivals);
    const venues = venueRevenueTotal(stats);
    const school = schoolArrived * SCHOOL_BUS_FARE;
    const net = Math.round(ticketTotal + venues + school - costs);
    return {
      ...state,
      cash: state.cash + net,
      dayStats: { ...stats, operatingSettled: true, intradayRevenue: true },
    };
  }

  const bonus = ticketSatisfactionBonus(state.fare, satisfaction, stats, schoolArrived);
  return {
    ...state,
    cash: state.cash + bonus - costs,
    dayStats: { ...stats, operatingSettled: true },
  };
}