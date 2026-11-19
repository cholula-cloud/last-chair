import { ASSET_CATALOG, type AssetId } from "./base";
import { founderById } from "./content";
import { isLiftOperational } from "./lifts";
import type { GameState } from "./state";
import { DAILY_FIXED_COST, LIFT_OPS_COST, SNOW_NIGHT_COST } from "./types";

export const LOW_CASH = 1500;
export const LOAN_TERMS = { principal: 10_000, rate: 0.08, reserve: 2_000 } as const;
export const BANKRUPTCY_MORNINGS = 3;
const CHAIR_DAILY_SURCHARGE = 5;

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

export type OperatingCosts = { fixed: number; founder: number; liftOps: number; upkeep: number };
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
  return {
    fixed: DAILY_FIXED_COST,
    founder: founderById(state.founderId)?.fixedCostDelta ?? 0,
    liftOps: LIFT_OPS_COST * Math.max(1, openLifts.length)
      + CHAIR_DAILY_SURCHARGE * openLifts.filter(({ type }) => type === "chair").length,
    upkeep: 60 + state.assets.reduce((sum, asset) => sum + ASSET_CATALOG[asset.id].upkeep, 0)
      + state.guns.length * ASSET_CATALOG.snow_guns.upkeep,
  };
}

export function dailyCosts(state: GameState): CostLines {
  return {
    ...(state.nightRecap?.costs ?? operatingCosts(state)),
    snowNight: state.dayIndex < state.seasonLength ? SNOW_NIGHT_COST[state.pendingSnow] : 0,
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

export function liquidNetWorth(state: Pick<GameState, "cash" | "loan" | "payables">): number {
  return state.cash - (state.loan ? payoffAmount(state.loan) : 0)
    - state.payables.reduce((sum, item) => sum + item.amount, 0);
}
