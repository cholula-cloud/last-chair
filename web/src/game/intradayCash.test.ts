import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { computeDayRevenue, makeGuest } from "./sim";
import {
  ticketBaseAmount,
  ticketSatisfactionBonus,
  settleOperatingDay,
  ticketBaseOnArrival,
} from "./intradayCash";
import { acknowledgeBeat, pickFounder, skipToClose, sleep } from "./rules";
import { morningCash } from "./economy";
import type { GameState } from "./state";

describe("ticket split", () => {
  it("base on arrival plus bonus at close equals computeDayRevenue", () => {
    const fare = "balanced" as const;
    const satisfaction = 72;
    const publicArrivals = 14;
    const baseEach = ticketBaseAmount(fare);
    const total = computeDayRevenue(fare, satisfaction, publicArrivals);
    const stats = {
      arrivals: publicArrivals,
      ticketBasePosted: baseEach * publicArrivals,
      schoolBusPosted: 0,
    };
    const bonus = ticketSatisfactionBonus(fare, satisfaction, stats, 0);
    expect(stats.ticketBasePosted + bonus).toBe(total);
  });

  it("charges school pupils the bus fare on arrival", () => {
    expect(ticketBaseOnArrival(makeGuest({ schoolPupil: true }), "balanced")).toBeGreaterThan(0);
    expect(ticketBaseOnArrival(makeGuest({ schoolPupil: true }), "balanced")).not.toBe(
      ticketBaseAmount("balanced"),
    );
  });
});

describe("settleOperatingDay", () => {
  const close = (state: GameState) => {
    let s = skipToClose(state);
    if (s.pendingBeat) s = acknowledgeBeat(s);
    return s;
  };

  it("matches legacy end cash after sleep on a built hill", () => {
    const start = pickFounder(createBuiltHill(9), "elena");
    const night = close({ ...start, paused: false });
    const beforeSleep = night.cash;
    const morning = sleep(night);
    expect(morning.cash).toBe(morningCash(night));
    expect(morning.cash).toBeGreaterThan(beforeSleep - 2000);
  });

  it("posts ticket base to cash before close", () => {
    const start = pickFounder(createBuiltHill(4), "elena");
    const running = { ...start, paused: false };
    const closed = close(running);
    expect((closed.dayStats.ticketBasePosted ?? 0)).toBeGreaterThan(0);
    expect(closed.nightRecap?.cashDelta).toBeTypeOf("number");
    expect(closed.cash).toBe(start.cash + (closed.nightRecap?.cashDelta ?? 0));
    expect(closed.dayStats.operatingSettled).toBe(true);
  });
});