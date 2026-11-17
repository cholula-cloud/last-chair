import { describe, expect, it } from "vitest";
import { LIFT_PREVIEW_SLOTS } from "./descent";
import { PERSONAS } from "./personas";
import { createRng } from "./rng";
import * as rules from "./rules";
import { createInitialGuests, emptyDayStats, makeGuest, planArrivals } from "./sim";
import { createInitialState, type GameState } from "./state";
import { DAY_END_MIN, DAY_START_MIN, LIFT_CLOSE_MIN } from "./types";

const WEEKDAY = 2;
const SATURDAY = 6;

/** A fresh day at 06:00 with the whole roster pending, for a given weekday index and lift set. */
function freshDay(seed: number, dayIndex: number, chair = false): GameState {
  const base = rules.pickFounder(createInitialState(seed), "elena");
  const rng = createRng(seed * 7919 + 13);
  const rand = () => rng.next();
  const arrivals = planArrivals({
    dayIndex,
    fare: "balanced",
    snowQuality: base.snowQuality,
    weather: "clear",
    buildings: base.buildings,
    talentsOwned: [],
    founderId: "elena",
    rand,
  });
  const lifts = chair
    ? [
        ...base.lifts,
        { type: "chair" as const, anchor: LIFT_PREVIEW_SLOTS[1], confirmed: true, queue: [], dispatchCredit: 0 },
      ]
    : base.lifts;
  return {
    ...base,
    dayIndex,
    clockMin: DAY_START_MIN,
    lifts,
    guests: createInitialGuests(arrivals, rand, dayIndex === SATURDAY),
    dayStats: { ...emptyDayStats(), arrivals },
    paused: false,
  };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const seeds = Array.from({ length: 20 }, (_, i) => i + 1);

describe("guest day script", () => {
  it("nobody is on the hill before their arrival minute, and every roster guest arrives", () => {
    for (const seed of [1, 2, 3]) {
      let s = freshDay(seed, WEEKDAY);
      while (s.phase === "day") {
        s = rules.tick(s, 1000);
        for (const g of s.guests) {
          if (g.state !== "pending") expect(g.arriveAtMin).toBeLessThanOrEqual(s.clockMin);
          else expect(g.arriveAtMin).toBeGreaterThan(s.clockMin - 0.5 - 1e-9);
        }
      }
      expect(s.dayStats.guestsArrived).toBe(s.dayStats.arrivals);
      expect(s.guests).toHaveLength(s.dayStats.arrivals);
    }
  });

  it("has everyone gone or walking out at close, with no lift loading after 15:45", () => {
    for (const dayIndex of [WEEKDAY, SATURDAY]) {
      for (const seed of seeds) {
        let s = freshDay(seed, dayIndex);
        let lastRideStart = 0;
        while (s.phase === "day") {
          s = rules.tick(s, 2000);
          for (const g of s.guests) {
            if (g.state === "ride") lastRideStart = Math.max(lastRideStart, g.rideStartMin ?? 0);
          }
        }
        expect(s.clockMin).toBe(DAY_END_MIN);
        const where = `day ${dayIndex} seed ${seed}`;
        expect(s.guests.every((g) => g.state === "gone" || g.state === "depart"), where).toBe(true);
        expect(lastRideStart, where).toBeLessThanOrEqual(LIFT_CLOSE_MIN);
        expect(s.lifts.every((l) => l.queue.length === 0), where).toBe(true);
      }
    }
  });

  it("skipToClose reaches the same end state as ticking through the day", () => {
    const skipped = rules.skipToClose(freshDay(4, SATURDAY));
    expect(skipped.guests.every((g) => g.state === "gone" || g.state === "depart")).toBe(true);
    expect(skipped.dayStats.completedRuns).toBe(skipped.guests.reduce((n, g) => n + g.runs, 0));
  });

  it("completedRuns is the sum of per-guest runs, and runsPerGuest is its mean", () => {
    for (const seed of seeds) {
      const s = rules.skipToClose(freshDay(seed, SATURDAY));
      const sum = s.guests.reduce((n, g) => n + g.runs, 0);
      expect(s.dayStats.completedRuns).toBe(sum);
      expect(s.dayStats.runsPerGuest).toBeCloseTo(sum / s.guests.length, 10);
    }
  });

  it("regulars ski more runs than first-timers, inside each persona's run range", () => {
    const all = seeds.flatMap((seed) => rules.skipToClose(freshDay(seed, WEEKDAY, true)).guests);
    const runsOf = (p: "first_timer" | "regular") =>
      all.filter((g) => g.persona === p).map((g) => g.runs);
    expect(mean(runsOf("regular"))).toBeGreaterThan(mean(runsOf("first_timer")) + 2);
    // With a chair and short queues, runs are limited by energy and targets, not the clock.
    expect(mean(runsOf("regular"))).toBeGreaterThanOrEqual(6);
    expect(mean(runsOf("regular"))).toBeLessThanOrEqual(10);
    expect(mean(runsOf("first_timer"))).toBeGreaterThanOrEqual(3);
    expect(mean(runsOf("first_timer"))).toBeLessThanOrEqual(6);
    for (const g of all) {
      expect(g.runs).toBeLessThanOrEqual(PERSONAS[g.persona].targetRuns[1]);
      expect(g.runs).toBeGreaterThan(0);
    }
  });

  it("a guest never skis more runs than their target or energy allows", () => {
    for (const g of rules.skipToClose(freshDay(8, SATURDAY, true)).guests) {
      const byEnergy = Math.ceil(1 / PERSONAS[g.persona].energyPerRun - 1e-9);
      expect(g.runs).toBeLessThanOrEqual(Math.min(g.targetRuns, byEnergy));
    }
  });

  it("sends guests home from a late line, counting turned-away guests who never rode", () => {
    const queued = (id: string, runs: number) =>
      makeGuest({ id, state: "queue", runs, arriveAtMin: 14 * 60 });
    const s: GameState = {
      ...freshDay(1, WEEKDAY),
      clockMin: LIFT_CLOSE_MIN - 1,
      guests: [queued("a", 0), queued("b", 3)],
      lifts: freshDay(1, WEEKDAY).lifts.map((l) => ({ ...l, queue: ["a", "b"], dispatchCredit: 0 })),
    };
    const out = rules.tick(s, 1000);
    expect(out.guests.map((g) => g.state)).toEqual(["depart", "depart"]);
    expect(out.lifts.every((l) => l.queue.length === 0)).toBe(true);
    // Only the guest who never rode counts as turned away.
    expect(out.dayStats.turnedAway).toBe(1);
  });

  it("a skier who cannot finish another lap before close goes home instead of queueing", () => {
    // 15:40 and a run just ending: wait + ride + run would end after 15:45.
    const s: GameState = {
      ...freshDay(2, WEEKDAY),
      clockMin: 15 * 60 + 38,
      guests: [makeGuest({ id: "late", state: "ski", stateSinceMin: 15 * 60 + 20, targetRuns: 9 })],
    };
    const out = rules.tick(s, 1000);
    expect(out.guests[0].state).toBe("depart");
    expect(out.guests[0].runs).toBe(1);
  });

  it("clears the follow target when the followed guest goes home", () => {
    const s: GameState = {
      ...freshDay(3, WEEKDAY),
      clockMin: 15 * 60 + 50,
      followId: "x",
      guests: [makeGuest({ id: "x", state: "depart", stateSinceMin: 15 * 60 + 47 })],
    };
    expect(rules.tick(s, 500).followId).toBeNull();
    expect(rules.tick({ ...s, guests: [makeGuest({ id: "x", state: "ski", stateSinceMin: 15 * 60 + 49 })] }, 500).followId).toBe("x");
  });

  it("is deterministic for a given seed and differs across seeds", () => {
    const a = rules.skipToClose(freshDay(5, SATURDAY));
    const b = rules.skipToClose(freshDay(5, SATURDAY));
    expect(a).toEqual(b);
    expect(rules.skipToClose(freshDay(6, SATURDAY)).dayStats).not.toEqual(a.dayStats);
  });

  it("tracks the day stats: peak on the hill and arrivals", () => {
    const s = rules.skipToClose(freshDay(7, SATURDAY));
    expect(s.dayStats.peakOnHill).toBeGreaterThan(5);
    expect(s.dayStats.peakOnHill).toBeLessThanOrEqual(s.guests.length);
    expect(s.dayStats.guestsArrived).toBe(s.dayStats.arrivals);
  });
});

describe("lift capacity against the arrival curve", () => {
  const avgWait = (dayIndex: number, chair: boolean) =>
    mean(seeds.map((seed) => rules.skipToClose(freshDay(seed, dayIndex, chair)).dayStats.avgQueueMin));

  it("one surface lift gives short weekday waits and long Saturday waits", () => {
    const weekday = avgWait(WEEKDAY, false);
    const saturday = avgWait(SATURDAY, false);
    expect(weekday).toBeGreaterThan(0.5);
    expect(weekday).toBeLessThan(3);
    expect(saturday).toBeGreaterThan(5);
    expect(saturday).toBeLessThan(14);
  });

  it("adding a chair clearly cuts the wait on both days", () => {
    expect(avgWait(SATURDAY, true)).toBeLessThan(avgWait(SATURDAY, false) / 5);
    expect(avgWait(WEEKDAY, true)).toBeLessThan(avgWait(WEEKDAY, false) / 2);
  });
});
