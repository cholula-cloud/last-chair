import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { canRepayLoan, constructionDraw, dailyCosts, liquidNetWorth, loanOffered, morningCash, payoffAmount } from "./economy";
import { migrate } from "./migrations";
import { acknowledgeBeat, buyBuilding, decideGroomerDown, decideSchoolContract, replyToSummitLink, finishWinterReview, openNight, pickFounder, repayLoan, setPendingSnow, sleep, startNewSeason, takeLoan } from "./rules";
import { SAVE_VERSION, toPersisted, type GameState } from "./state";

const opened = () => pickFounder(createBuiltHill(42), "elena");
const close = (state: GameState) => {
  const night = openNight(state);
  if (night.pendingBeat === "summit_link") return replyToSummitLink(night, "declined");
  if (night.pendingBeat === "school_bus") return decideSchoolContract(night, "declined");
  if (night.pendingBeat === "groomer_down") return decideGroomerDown(night, "go_without");
  return acknowledgeBeat(night);
};
const fund = (night: GameState, cash: number) => ({ ...night, cash: night.cash + cash - morningCash(night) });

describe("construction payments", () => {
  it("balances rounded draws and counts daily upkeep", () => {
    const { deposit, first, second } = constructionDraw(109);
    expect(deposit + first + second).toBe(109);
    expect(dailyCosts(opened())).toMatchObject({ fixed: 1095, founder: 0, liftOps: 180, upkeep: 60 });
    expect(dailyCosts({ ...opened(), lifts: [] }).liftOps).toBe(180);
    expect(dailyCosts(buyBuilding(opened(), "cafe")).upkeep).toBe(100);
  });

  it("adds staffing to fixed costs during February vacation", () => {
    const hill = opened();
    expect(dailyCosts({ ...hill, dayIndex: 20 }).fixed - dailyCosts({ ...hill, dayIndex: 19 }).fixed).toBe(550);
  });

  it("charges $480 up front and two $360 installments for a day-two café", () => {
    const day2 = sleep(close(opened()));
    const built = buyBuilding(day2, "cafe");
    expect(built.cash).toBe(day2.cash - 480);
    expect(built.payables).toEqual([
      { what: "cafe", amount: 360, dueDay: 2 },
      { what: "cafe", amount: 360, dueDay: 3 },
    ]);
    const night2 = close(built);
    expect(dailyCosts(night2)).toMatchObject({ constructionSpent: 480, draws: 360 });
    const resumed = migrate(JSON.parse(JSON.stringify(toPersisted(night2))), SAVE_VERSION);
    expect(resumed.reset).toBe(false);
    const day3 = sleep({ ...night2, ...resumed.state });
    expect(day3.cash).toBe(morningCash(night2));
    expect(day3.payables).toHaveLength(1);
    const night3 = close(day3);
    expect(dailyCosts(night3)).toMatchObject({ constructionSpent: 0, draws: 360 });
    const day4 = sleep(night3);
    expect(day4.cash).toBe(morningCash(night3));
    expect(day4.payables).toEqual([]);
  });

  it("keeps a final-night draw and deducts later obligations from net worth", () => {
    const base = opened();
    const last = { ...base, dayIndex: base.seasonLength, weather: base.weatherDays.at(-1)!.kind };
    const night = close(buyBuilding(last, "cafe"));
    const review = sleep(night);
    expect(review).toMatchObject({ outcome: "finished", cash: morningCash(night) });
    expect(dailyCosts(night)).toMatchObject({ draws: 360, snowNight: 0 });
    expect(review.payables).toHaveLength(1);
    expect(liquidNetWorth(review)).toBe(review.cash - 360);
  });
});

describe("fail-soft", () => {
  it("offers the loan before the first negative morning and retains a full repayment after reload", () => {
    const night = setPendingSnow(close(opened()), "minimal");
    expect(loanOffered(fund(night, 0))).toBe(false);
    const short = fund(night, -1);
    expect(loanOffered(short)).toBe(true);
    const loan = takeLoan(short);
    expect(loan.nightRecap?.loanReceived).toBe(10_000);
    expect(morningCash(loan)).toBe(9999);
    expect(takeLoan(loan)).toBe(loan);
    expect(canRepayLoan(loan)).toBe(false);

    const enough = fund(close(sleep(loan)), 15_000);
    const paid = repayLoan(enough);
    expect(morningCash(paid)).toBe(15_000 - payoffAmount(enough.loan!));
    expect(paid.loan).toBeNull();
    expect(paid.loanTaken).toBe(true);
    const reloaded = migrate(JSON.parse(JSON.stringify(toPersisted(paid))), SAVE_VERSION);
    expect(reloaded).toMatchObject({
      reset: false, state: { nightRecap: { loanRepaid: payoffAmount(enough.loan!) } },
    });
    expect(loanOffered(fund(paid, -1))).toBe(false);
  });

  it("accrues exactly 8% simple interest across 28 Sleeps", () => {
    let night = takeLoan(fund(close(opened()), -1));
    // Isolate loan interest from bankruptcy on days this fixture closes without skiing.
    for (let i = 1; i < 28; i++) night = close(sleep(fund(night, 1000)));
    const review = sleep(night);
    expect(review.phase).toBe("winter_review");
    expect(review.loan?.balance).toBe(10_800);
  });

  it("accrues interest on the principal left after a partial repayment", () => {
    const first = takeLoan(fund(close(opened()), -1));
    const next = fund(close(sleep(first)), 15_000);
    const partPaid = repayLoan(next, 4000);
    expect(partPaid.loan?.principal).toBe(6000);
    expect(partPaid.nightRecap?.loanRepaid).toBe(4000);
    expect(dailyCosts(partPaid).interest).toBeCloseTo(6000 * 0.08 / 28, 8);
  });

  it("resets the streak after a nonnegative morning and closes after three negative mornings", () => {
    const first = sleep(fund(close(opened()), -100));
    const second = sleep(fund(close(first), -100));
    expect(second).toMatchObject({ phase: "day", debtMornings: 2 });
    expect(sleep(fund(close(second), 0))).toMatchObject({ outcome: "playing", debtMornings: 0 });
    const bankrupt = sleep(fund(close(second), -100));
    expect(bankrupt).toMatchObject({ phase: "winter_review", outcome: "bankrupt", debtMornings: 3 });
    expect(finishWinterReview(bankrupt)).toBe(bankrupt);
    expect(startNewSeason(bankrupt)).toMatchObject({ dayIndex: 1, outcome: "playing", debtMornings: 0 });
  });

  it("keeps a legacy recap's agreed cash result and an old lodge upgrade fully paid", () => {
    const old = close({ ...opened(), cash: -50, lodgeUpgrade: { toTier: 2, nightsRemaining: 1 } });
    const migrated = migrate(toPersisted(old), 4);
    expect(migrated).toMatchObject({
      reset: false, state: {
        payables: [], loan: null, loanTaken: false, debtMornings: 1,
        nightRecap: { cashDelta: old.nightRecap!.cashDelta, costs: null, revenue: null },
      },
    });
    const night = { ...old, ...migrated.state };
    expect(sleep(night).cash).toBe(morningCash(night));
  });

  it("keeps terminal saves recoverable by checking the phase against the outcome", () => {
    const saved = toPersisted(opened());
    for (const [phase, outcome] of [["winter_review", "playing"], ["mountain2", "bankrupt"], ["day", "finished"]]) {
      expect(migrate({ ...saved, phase, outcome }, SAVE_VERSION)).toMatchObject({ reset: true, reason: "outcome" });
    }
    expect(migrate({ ...saved, phase: "winter_review", outcome: "bankrupt" }, SAVE_VERSION).reset).toBe(false);
    expect(migrate({ ...saved, phase: "mountain2" }, 4)).toMatchObject({
      reset: false, state: { phase: "mountain2", outcome: "finished" },
    });
  });
});
