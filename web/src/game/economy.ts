import { TALENT } from "./talents";
import { ASSET_CATALOG, type AssetId } from "./base";
import { inHolidayWeek, MOUNTAIN_CALENDARS } from "./calendar";
import { founderById } from "./content";
import { isLiftOperational } from "./lifts";
import type { GameState } from "./state";
import { DAILY_FIXED_COST, LIFT_OPS_COST, snowNightCost } from "./types";

export const LOW_CASH = 1500;
export const LOAN_TERMS = { principal: 10_000, rate: 0.08, reserve: 2_000 } as const;
export function winterLoanRate(state: Pick<GameState, "founderId">): number {
  return state.founderId === "tom" ? 0.07 : LOAN_TERMS.rate;
}

export const BANKRUPTCY_MORNINGS = 3;
const CHAIR_DAILY_SURCHARGE = 5;
const VACATION_STAFFING_COST = 425;

export type Payable = {
  what: "lift" | "lodge" | AssetId;
  liftIndex?: number;
  amount: number;
  dueDay: number;
};

export type Loan = {
  principal: number;
  balance: number;
  ratePerDay: number;
  takenDay: number;
};

export type OperatingCosts = { fixed: number; vacationStaffing?: number; founder: number; liftOps: number; upkeep: number };
export type CostLines = OperatingCosts & { snowNight: number; draws: number; interest: number; constructionSpent: number };

export function constructionDraw(total: number) {
  const deposit = Math.round(total * 0.4);
  const first = Math.round(total * 0.3);
  return { deposit, first, second: total - deposit - first };
}

export function constructionPayables(total: number, day: number, what: Payable["what"], liftIndex?: number): Payable[] {
  const { first, second } = constructionDraw(total);
  const entry = { what, ...(liftIndex === undefined ? {} : { liftIndex }) };
  return [
    { ...entry, amount: first, dueDay: day },
    { ...entry, amount: second, dueDay: day + 1 },
  ].filter(({ amount }) => amount > 0);
}

export function operatingCosts(state: GameState): OperatingCosts {
  const openLifts = state.lifts.filter((lift, i) => isLiftOperational(lift, i, state.trails));
  const liftCost = openLifts.reduce((sum, lift) => sum + LIFT_OPS_COST
    + (lift.type === "chair" ? CHAIR_DAILY_SURCHARGE : 0)
    - (lift.type === "surface" && TALENT.ropeTow.learned(state.talentsOwned) ? TALENT.ropeTow.savings : 0), 0);
  const staffing = inHolidayWeek(MOUNTAIN_CALENDARS[state.mountainId], state.dayIndex) ? VACATION_STAFFING_COST : 0;
  return {
    ...(staffing ? { vacationStaffing: staffing } : {}),
    fixed: DAILY_FIXED_COST + staffing - (TALENT.volunteerPatrol.learned(state.talentsOwned) ? TALENT.volunteerPatrol.savings : 0),
    founder: founderById(state.founderId)?.fixedCostDelta ?? 0,
    liftOps: Math.round((liftCost || LIFT_OPS_COST) * (state.founderId === "riley" ? 0.85 : 1)),
    upkeep: 60 + state.assets.reduce((sum, asset) => sum + ASSET_CATALOG[asset.id].upkeep, 0)
      + state.guns.length * ASSET_CATALOG.snow_guns.upkeep,
  };
}

export function dailyCosts(state: GameState): CostLines {
  return {
    ...(state.nightRecap?.costs ?? operatingCosts(state)),
    snowNight: state.dayIndex < state.seasonLength ? snowNightCost(state.pendingSnow, state.talentsOwned) : 0,
    draws: state.payables.reduce((sum, item) => sum + (item.dueDay <= state.dayIndex ? item.amount : 0), 0),
    interest: state.loan ? state.loan.principal * state.loan.ratePerDay : 0,
    constructionSpent: state.constructionSpent,
  };
}

/** Cash after settlement, before any loans taken or repaid on this screen. */
export function morningCash(state: GameState): number {
  const { snowNight, draws } = dailyCosts(state);
  return state.cash + (state.nightRecap?.cashDelta ?? 0) - snowNight - draws;
}

export function loanOffered(state: GameState): boolean {
  return state.phase === "night" && state.dayIndex < state.seasonLength &&
    state.nightRecap !== null && !state.loanTaken && morningCash(state) < 0;
}

export function canRepayLoan(state: GameState): boolean {
  return state.phase === "night" && state.loan !== null &&
    morningCash(state) >= payoffAmount(state.loan) + LOAN_TERMS.reserve;
}

export function payoffAmount(loan: Loan): number {
  return Math.round(loan.balance * 100) / 100;
}

export function liquidNetWorth(state: GameState): number {
  return state.cash - (state.loan ? payoffAmount(state.loan) : 0)
    - state.payables.reduce((sum, item) => sum + item.amount, 0);
}
