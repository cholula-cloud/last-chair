import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { FOUNDERS } from "./content";
import { REFERENCE_TOPS } from "./descent";
import { dailyCosts, loanRate, morningCash } from "./economy";
import {
  apresRevenueFor, canDemolish, canTakeSummitLinkEquity, clearingCostFor, founderMods, isWarmWeek, loanRateFor,
} from "./founders";
import { acknowledgeBeat, arrivalMood, checkPlacement, openNight, pickFounder, satisfactionContext, skipToClose, takeLoan } from "./rules";
import { TERRAIN } from "./terrain";
import type { GameState } from "./state";
import { liftCost, type DayWeather, type FounderId } from "./types";
import { outlookFor } from "./weather";

const as = (id: FounderId): GameState => pickFounder(createBuiltHill(42), id);
const swap = (state: GameState, id: FounderId): GameState => ({ ...state, founderId: id });
const days = (kinds: DayWeather["kind"][]): DayWeather[] => kinds.map((kind) => ({ kind, wind: "calm" }));

describe("founder data", () => {
  it("writes a complete bonus and cost sentence for each founder", () => {
    expect(FOUNDERS).toHaveLength(6);
    for (const f of FOUNDERS) {
      for (const line of [f.bonus, f.constraint]) {
        expect(line).toMatch(/^[A-Z].*\.$/);
        expect(line).not.toMatch(/[—·]/);
      }
    }
  });

  it("gives no founder a modifier outside their own spec row", () => {
    expect(founderMods("tom").snowExpectationPenalty).toBe(0);
    for (const id of ["riley", "juniper", "marco", "tom", "amira"] as const) expect(founderMods(id).arrivalMoodBonus).toBe(0);
  });
});

describe("Elena: arrival mood and the warming hut lock", () => {
  it("arrives 0.08 happier and cannot demolish the warming hut", () => {
    expect(arrivalMood(["warming_hut"], "elena")).toBeCloseTo(0.78, 6);
    expect(arrivalMood(["warming_hut"], "riley")).toBeCloseTo(0.7, 6);
    expect(canDemolish({ founderId: "elena" }, "warming_hut")).toBe(false);
    expect(canDemolish({ founderId: "elena" }, "cafe")).toBe(true);
    expect(canDemolish({ founderId: "tom" }, "warming_hut")).toBe(true);
    expect(canDemolish({ founderId: null }, "warming_hut")).toBe(true);
  });
});

describe("Tom: loan rate and warm weeks", () => {
  it("pays 7% instead of 8% on the winter loan", () => {
    expect(loanRateFor("tom", 0.08)).toBe(0.07);
    expect(loanRate("elena")).toBe(0.08);
    const loanFor = (id: FounderId) => {
      const night = acknowledgeBeat(openNight(as(id)));
      const short = { ...night, cash: night.cash - morningCash(night) - 1 };
      return takeLoan(short).loan!;
    };
    expect(loanFor("tom").ratePerDay * 28 * loanFor("tom").principal).toBeCloseTo(700, 6);
    expect(loanFor("elena").ratePerDay * 28 * loanFor("elena").principal).toBeCloseTo(800, 6);
  });

  it("counts a warm week as a thaw day with three thaw days in the last seven", () => {
    const three = days(["thaw", "clear", "clear", "thaw", "clear", "clear", "thaw", "thaw"]);
    expect(isWarmWeek(three, 8)).toBe(true);
    const two = days(["thaw", "clear", "clear", "clear", "clear", "clear", "thaw", "thaw"]);
    expect(isWarmWeek(two, 8)).toBe(false);
    expect(isWarmWeek(days(["thaw", "thaw", "thaw", "clear"]), 4)).toBe(false);
  });

  it("lowers arrival mood by 0.075 in a warm week, for Tom only", () => {
    const mood = (id: FounderId, weatherDays: DayWeather[]) =>
      satisfactionContext({ ...swap(as("elena"), id), dayIndex: 8, weather: "thaw", weatherDays }).arrivalMood;
    const warm = days(["clear", "clear", "clear", "thaw", "clear", "clear", "thaw", "thaw"]);
    const cool = days(["clear", "clear", "clear", "clear", "clear", "clear", "thaw", "thaw"]);
    expect(mood("tom", cool) - mood("tom", warm)).toBeCloseTo(0.075, 6);
    expect(mood("riley", cool)).toBe(mood("riley", warm));
  });
});

describe("Riley: overnight repair and SummitLink", () => {
  it("runs one lift for $153 instead of $180 and cannot take SummitLink equity", () => {
    expect(dailyCosts(as("elena")).liftOps).toBe(180);
    expect(dailyCosts(as("riley")).liftOps).toBe(153);
    expect(canTakeSummitLinkEquity({ founderId: "riley" })).toBe(false);
    expect(canTakeSummitLinkEquity({ founderId: "marco" })).toBe(true);
  });
});

describe("Amira: forecast and snow expectation", () => {
  it("sees two days ahead and trusts tomorrow's forecast more", () => {
    const amira = as("amira");
    const elena = swap(amira, "elena");
    expect(outlookFor(amira, 2)).not.toBeNull();
    expect(outlookFor(elena, 2)).toBeNull();
    const truth = amira.weatherDays[amira.dayIndex].kind;
    expect(outlookFor(amira, 1)![truth]).toBeGreaterThanOrEqual(0.7);
    expect(outlookFor(elena, 1)![truth]).toBeGreaterThanOrEqual(0.5);
    expect(outlookFor(amira, 1)![truth]).toBeGreaterThan(outlookFor(elena, 1)![truth]);
  });

  it("expects snow quality 0.60 instead of 0.55", () => {
    expect(satisfactionContext(as("amira")).snowExpectation).toBeCloseTo(0.6, 6);
    expect(satisfactionContext(as("elena")).snowExpectation).toBeCloseTo(0.55, 6);
  });
});

describe("Juniper: reputation drift and clearing cost", () => {
  const nightFor = (id: FounderId) => openNight(swap({ ...as("elena"), reputation: 40 }, id));

  it("adds 0.5 reputation each night before rounding", () => {
    for (const [id, drift] of [["juniper", 0.5], ["tom", 0]] as const) {
      const night = nightFor(id);
      expect(night.reputation).toBe(Math.round(40 * 0.85 + night.nightRecap!.satisfaction * 0.15 + drift));
    }
    const capped = openNight(swap({ ...as("elena"), reputation: 100 }, "juniper"));
    expect(capped.reputation).toBeLessThanOrEqual(100);
  });

  it("prices a chair at $2,900 instead of $2,500 and clearing 15% higher", () => {
    const check = (id: FounderId | null) => checkPlacement(
      { lifts: [], cash: 50_000, lodgeTier: 2, founderId: id }, "chair", { bottom: TERRAIN.base, top: REFERENCE_TOPS[1] });
    const line = { bottom: TERRAIN.base, top: REFERENCE_TOPS[1] };
    expect(liftCost("chair", line)).toBe(2500);
    expect(check("elena")).toMatchObject({ ok: true, cost: 2500 });
    expect(check("juniper")).toMatchObject({ ok: true, cost: 2900 });
    expect(clearingCostFor("juniper", 1000)).toBe(1150);
    expect(clearingCostFor("elena", 1000)).toBe(1000);
  });
});

describe("Marco: apres revenue and fixed cost", () => {
  it("earns 10% more from venues and pays $80 more a day", () => {
    expect(apresRevenueFor("marco", 9)).toBeCloseTo(9.9, 6);
    expect(apresRevenueFor("elena", 9)).toBe(9);
    expect(dailyCosts(as("marco")).founder).toBe(80);
    expect(dailyCosts(as("elena")).founder).toBe(0);
  });

  it("books venue receipts 10% higher over a played day", () => {
    const day = (id: FounderId) => skipToClose(swap({ ...as("elena"), cash: 20_000 }, id));
    const total = (s: GameState) => Object.values(s.dayStats.venueRevenue).reduce((a, b) => a + (b ?? 0), 0);
    const marco = total(day("marco"));
    const other = total(day("riley"));
    expect(other).toBeGreaterThan(0);
    expect(marco / other).toBeCloseTo(1.1, 6);
  });
});
