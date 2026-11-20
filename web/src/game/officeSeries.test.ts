import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { constructionPayables, LOAN_TERMS, morningCash, payoffAmount } from "./economy";
import {
  bestDayBy,
  cashTrendSeries,
  constructionSeries,
  loanSeries,
  revCostSeries,
  revenueSourcesSeries,
} from "./officeSeries";
import { acknowledgeBeat, pickFounder, skipToClose, sleep } from "./rules";
import type { GameState } from "./state";

function runDays(days: number): GameState {
  let s = pickFounder(createBuiltHill(7), "elena");
  for (let i = 0; i < days; i++) {
    s = sleep(acknowledgeBeat(skipToClose(s)));
  }
  return s;
}

describe("officeSeries money selectors", () => {
  it("handles an empty history honestly", () => {
    const s = pickFounder(createBuiltHill(3), "elena");
    expect(revCostSeries(s.dayHistory)).toEqual([]);
    expect(revenueSourcesSeries(s.dayHistory)).toEqual([]);
    expect(cashTrendSeries(s)).toEqual([{ day: 1, cash: Math.round(morningCash(s)), projected: true }]);
    expect(constructionSeries(s)).toEqual({ points: [], totalPaid: 0, totalScheduled: 0 });
    expect(loanSeries(s)).toEqual({ points: [], totalBorrowed: 0, totalRepaid: 0, currentPayoff: 0, active: false });
    expect(bestDayBy([], (x: { day: number }) => x.day)).toBeNull();
  });

  it("extracts revenue, costs, sources, and cash trend across settled days", () => {
    const s = runDays(4);
    const rc = revCostSeries(s.dayHistory);
    expect(rc).toHaveLength(4);
    for (let i = 0; i < rc.length; i++) {
      expect(rc[i].day).toBe(i + 1);
      expect(rc[i].revenue - rc[i].costs).toBe(rc[i].net);
    }

    const sources = revenueSourcesSeries(s.dayHistory);
    expect(sources).toHaveLength(4);
    for (const p of sources) {
      expect(p.tickets + p.venues + p.schoolBus).toBe(p.total);
    }

    const cash = cashTrendSeries(s);
    expect(cash).toHaveLength(5);
    expect(cash[0].projected).toBeUndefined();
    expect(cash[4]).toEqual({ day: 5, cash: Math.round(morningCash(s)), projected: true });

    const best = bestDayBy(rc, (p) => p.net);
    expect(best?.value).toBe(Math.max(...rc.map((p) => p.net)));
  });

  it("combines settled construction installments and upcoming payables", () => {
    const base = runDays(2);
    const withPayables: GameState = {
      ...base,
      dayHistory: base.dayHistory.map((d, i) => (i === 1 ? { ...d, constructionDue: 600 } : d)),
      payables: constructionPayables(2000, 3, "cafe"),
    };
    const timeline = constructionSeries(withPayables);
    expect(timeline.totalPaid).toBe(600);
    expect(timeline.totalScheduled).toBe(1200);
    expect(timeline.points).toEqual([
      { day: 2, paid: 600, scheduled: 0 },
      { day: 3, paid: 0, scheduled: 600 },
      { day: 4, paid: 0, scheduled: 600 },
    ]);
  });

  it("tracks loan drawdown, repayment, and current payoff balance", () => {
    const base = runDays(2);
    const loan = { principal: LOAN_TERMS.principal, balance: LOAN_TERMS.principal + 40, ratePerDay: 0.08 / 28, takenDay: 1 };
    const withLoan: GameState = {
      ...base,
      loan,
      loanTaken: true,
      dayHistory: base.dayHistory.map((d, i) =>
        i === 0
          ? { ...d, recap: { ...d.recap, loanReceived: LOAN_TERMS.principal } }
          : { ...d, recap: { ...d.recap, loanRepaid: 2000 } },
      ),
    };
    const ls = loanSeries(withLoan);
    expect(ls.active).toBe(true);
    expect(ls.totalBorrowed).toBe(LOAN_TERMS.principal);
    expect(ls.totalRepaid).toBe(2000);
    expect(ls.currentPayoff).toBe(Math.round(payoffAmount(loan)));
    expect(ls.points).toHaveLength(2);
  });
});
