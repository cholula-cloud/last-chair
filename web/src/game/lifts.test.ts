import { freshTrail } from "./snow";
import { describe, expect, it } from "vitest";
import { LIFT_PREVIEW_SLOTS } from "./descent";
import {
  PATROL_RADIO_CAPACITY,
  chooseLift,
  currentWaitMin,
  liftCapacityPerHour,
  resetLiftQueues,
  stepLifts,
} from "./lifts";
import * as rules from "./rules";
import { makeGuest } from "./sim";
import { createInitialState, migrate, toPersisted, type GameState, type LiftSlot } from "./state";
import { LIFT_SPECS, type Guest, type LiftType } from "./types";

const slot = (type: LiftType, queue: string[] = []): LiftSlot => ({
  type,
  anchor: LIFT_PREVIEW_SLOTS[0],
  confirmed: true,
  queue,
  dispatchCredit: 0,
  trail: freshTrail(),
});

const queued = (id: string): Guest => makeGuest({ id, label: id, state: "queue" });
const SURFACE_PER_HR = LIFT_SPECS.surface.capacityPerHour;

type RunOpts = {
  types: LiftType[];
  talents?: string[];
  minutes: number;
  /** Guests joining per game minute, as a function of elapsed minutes. */
  arrivals: (t: number) => number;
  step?: number;
};

/** Drive stepLifts directly with scheduled arrivals; returns every measured wait. */
function run(o: RunOpts) {
  const step = o.step ?? 0.5;
  let lifts = o.types.map((t) => slot(t));
  let guests: Guest[] = [];
  const waits: number[] = [];
  let carry = 0;
  let n = 0;
  for (let now = step; now <= o.minutes + 1e-9; now += step) {
    carry += o.arrivals(now) * step;
    while (carry >= 1) {
      guests = [...guests, queued(`g${n++}`)];
      carry -= 1;
    }
    const r = stepLifts(guests, lifts, o.talents ?? [], now, step);
    guests = r.guests;
    lifts = r.lifts;
    waits.push(...r.waits);
  }
  const avg = waits.reduce((a, b) => a + b, 0) / Math.max(1, waits.length);
  return { guests, lifts, waits, avg };
}

/** A burst of `perMin` guests/min for 7 minutes, like the opening rush. */
const burst = (perMin: number) => (t: number) => (t <= 7 ? perMin : 0);

describe("lift server", () => {
  it("dispatches in FIFO order", () => {
    let guests = Array.from({ length: 10 }, (_, i) => queued(`q${i}`));
    let lifts = [slot("surface")];
    const order: string[] = [];
    for (let now = 0.5; now <= 20; now += 0.5) {
      const r = stepLifts(guests, lifts, [], now, 0.5);
      for (const g of r.guests) {
        const before = guests.find((x) => x.id === g.id);
        if (before?.state === "queue" && g.state === "ride") order.push(g.id);
      }
      guests = r.guests;
      lifts = r.lifts;
    }
    expect(order).toEqual(Array.from({ length: 10 }, (_, i) => `q${i}`));
  });

  it("serves a saturated queue at the lift's capacity per hour", () => {
    for (const type of ["surface", "chair"] as const) {
      const r = run({ types: [type], minutes: 60, arrivals: (t) => (t <= 0.5 ? 400 : 0) });
      const dispatched = r.waits.length;
      expect(Math.abs(dispatched - LIFT_SPECS[type].capacityPerHour)).toBeLessThanOrEqual(1);
    }
  });

  it("measures the wait as the time between joining and dispatch", () => {
    const step = 0.1;
    const r = run({ types: ["surface"], minutes: 3, step, arrivals: (t) => (t <= step ? 30 : 0) });
    const g = r.guests.find((x) => x.id === "g0")!;
    expect(g.joinedQueueAtMin).toBeCloseTo(step, 9);
    expect(r.waits[0]).toBeCloseTo((g.rideStartMin ?? 0) - (g.joinedQueueAtMin ?? 0), 9);
    // One guest dispatches per 60/capacity min; the first waits that long, to within a step.
    expect(Math.abs(r.waits[0] - 60 / SURFACE_PER_HR)).toBeLessThanOrEqual(step);
    // The next guest waits one dispatch interval longer.
    expect(r.waits[1] - r.waits[0]).toBeCloseTo(60 / SURFACE_PER_HR, 0);
  });

  it("an idle lift dispatches the next arrival at once", () => {
    const r = run({ types: ["surface"], minutes: 30, arrivals: (t) => (Math.abs(t - 20) < 0.01 ? 2 : 0) });
    expect(r.waits).toEqual([0]);
  });

  it("doubling arrivals at fixed capacity raises the average wait", () => {
    const base = run({ types: ["surface"], minutes: 60, arrivals: burst(3) });
    const doubled = run({ types: ["surface"], minutes: 60, arrivals: burst(6) });
    expect(base.waits.length).toBeGreaterThan(0);
    expect(doubled.avg).toBeGreaterThan(base.avg);
    // Steady demand too: 1.5 guests/min is past the surface lift's hourly capacity (46), 3.0 is further past it.
    const heavy = run({ types: ["surface"], minutes: 120, arrivals: () => 1.5 });
    const over = run({ types: ["surface"], minutes: 120, arrivals: () => 3.0 });
    expect(heavy.avg).toBeGreaterThan(0);
    expect(over.avg).toBeGreaterThan(heavy.avg);
  });

  it("adding a chair lowers the average wait for the same arrivals", () => {
    const one = run({ types: ["surface"], minutes: 60, arrivals: burst(4) });
    const two = run({ types: ["surface", "chair"], minutes: 60, arrivals: burst(4) });
    expect(two.avg).toBeLessThan(one.avg);
    expect(two.waits.length).toBe(one.waits.length);
  });

  it("sends a joining guest to the lift with the shortest expected wait", () => {
    const busyIds = ["a", "b", "c", "d", "e"];
    const lifts = [slot("surface"), slot("chair", busyIds)];
    const guests = [...busyIds.map(queued), queued("new")];
    const r = stepLifts(guests, lifts, [], 1, 0);
    expect(r.guests.find((g) => g.id === "new")?.liftIndex).toBe(0);
    expect(r.lifts[0].queue).toEqual(["new"]);
    // Equal queue lengths: the faster chair has the shorter expected wait.
    expect(chooseLift([slot("surface", ["x"]), slot("chair", ["y"])], [])).toBe(1);
    // Equal waits (both empty): the higher capacity wins.
    expect(chooseLift([slot("surface"), slot("chair")], [])).toBe(1);
    // No open lift.
    expect(chooseLift([{ ...slot("surface"), confirmed: false }], [])).toBe(-1);
  });

  it("patrol_radio raises throughput by 5%", () => {
    const sat = (talents: string[]) =>
      run({ types: ["surface"], talents, minutes: 120, arrivals: (t) => (t <= 0.5 ? 400 : 0) })
        .waits.length;
    const base = sat([]);
    const radio = sat(["patrol_radio"]);
    expect(liftCapacityPerHour("surface", ["patrol_radio"])).toBeCloseTo(
      SURFACE_PER_HR * PATROL_RADIO_CAPACITY,
      10,
    );
    expect(radio - base).toBeGreaterThanOrEqual(4);
    expect(radio - base).toBeLessThanOrEqual(6);
  });

  it("a ride lasts the lift's rideMinutes", () => {
    for (const type of ["surface", "chair"] as const) {
      let guests = [queued("g")];
      let lifts = [slot(type)];
      let rideStart: number | undefined;
      let skiAt: number | undefined;
      for (let now = 0.5; now <= 20 && skiAt === undefined; now += 0.5) {
        const r = stepLifts(guests, lifts, [], now, 0.5);
        guests = r.guests;
        lifts = r.lifts;
        const g = guests[0];
        if (g.state === "ride" && rideStart === undefined) rideStart = g.rideStartMin;
        if (g.state === "ski") skiAt = now;
      }
      expect(skiAt! - rideStart!).toBeCloseTo(LIFT_SPECS[type].rideMinutes, 9);
    }
  });

  it("rides report elapsed/rideMinutes as progress and queues rank front-first", () => {
    let guests = ["a", "b", "c", "d"].map(queued);
    const r0 = stepLifts(guests, [slot("surface")], [], 0.1, 0.1);
    const p = r0.guests.map((g) => g.progress);
    expect(p[0]).toBeGreaterThan(p[1]);
    expect(p[1]).toBeGreaterThan(p[2]);
    expect(p[2]).toBeGreaterThan(p[3]);
    guests = [{ ...queued("r"), state: "ride", rideStartMin: 10, liftIndex: 0 }];
    const r1 = stepLifts(guests, [slot("surface")], [], 12, 0);
    expect(r1.guests[0].progress).toBeCloseTo(0.5, 10);
  });

  it("does not mutate its inputs", () => {
    const guests = [queued("a"), queued("b")];
    const lifts = [slot("surface")];
    const before = structuredClone({ guests, lifts });
    stepLifts(guests, lifts, [], 5, 1);
    expect({ guests, lifts }).toEqual(before);
  });
});

describe("lifts in the day tick", () => {
  const dayState = (guests: Guest[], seed = 3): GameState => ({
    ...rules.togglePause(rules.pickFounder(createInitialState(seed), "elena")),
    guests,
  });

  it("never puts a guest in two queues, and every queued guest is in exactly one", () => {
    for (let seed = 1; seed <= 4; seed++) {
      let s = rules.pickFounder(createInitialState(seed), "elena");
      s = rules.setSelectedLiftType(rules.setSelectedSlotIndex(s, 1), "chair");
      s = rules.confirmLift({ ...s, cash: 99999 });
      expect(s.lifts).toHaveLength(2);
      s = rules.togglePause(s);
      while (s.phase === "day") {
        s = rules.tick(s, 500);
        const ids = s.lifts.flatMap((l) => l.queue);
        expect(new Set(ids).size).toBe(ids.length);
        const waiting = s.guests.filter((g) => g.state === "queue").map((g) => g.id);
        expect([...ids].sort()).toEqual(waiting.sort());
      }
    }
  });

  it("records measured waits in the day stats", () => {
    let s = dayState([queued("a"), queued("b"), queued("c")]);
    s = rules.tick(s, 1000);
    // Large ticks are simulated in sub-steps, so the first guest waits one dispatch interval.
    for (let i = 0; i < 12; i++) s = rules.tick(s, 500);
    const { dispatched, waitSumMin, avgQueueMin, peakWaitMin, maxQueueLength } = s.dayStats;
    expect(dispatched).toBe(3);
    expect(avgQueueMin).toBeCloseTo(waitSumMin / dispatched, 10);
    expect(peakWaitMin).toBeGreaterThanOrEqual(avgQueueMin);
    expect(maxQueueLength).toBeGreaterThanOrEqual(1);
    expect(maxQueueLength).toBeLessThanOrEqual(3);
  });

  it("a coarse tick measures the same waits as fine ticks, to within a sub-step", () => {
    const guests = Array.from({ length: 8 }, (_, i) => queued(`q${i}`));
    const coarse = rules.tick(dayState(guests), 4000).dayStats;
    let fine = dayState(guests);
    for (let i = 0; i < 16; i++) fine = rules.tick(fine, 250);
    expect(coarse.dispatched).toBe(fine.dayStats.dispatched);
    expect(Math.abs(coarse.avgQueueMin - fine.dayStats.avgQueueMin)).toBeLessThan(0.5);
  });

  it("HUD current wait is 0 with an empty queue, and is queue length over capacity otherwise", () => {
    const s = createInitialState(1);
    expect(currentWaitMin(s)).toBe(0);
    const busy = { ...s, lifts: [slot("surface", ["a", "b", "c", "d", "e", "f", "g"])] };
    expect(currentWaitMin(busy)).toBeCloseTo(7 / (SURFACE_PER_HR / 60), 10);
    const two = { ...busy, lifts: [...busy.lifts, slot("chair", ["x"])] };
    expect(currentWaitMin(two)).toBeCloseTo(7 / (SURFACE_PER_HR / 60), 10);
    const radio = { ...busy, talentsOwned: ["patrol_radio"] };
    expect(currentWaitMin(radio)).toBeLessThan(currentWaitMin(busy));
  });

  it("a new day starts with empty queues", () => {
    let s = dayState(["a", "b", "c", "d", "e", "f"].map(queued), 5);
    s = rules.tick(s, 500);
    expect(s.lifts.flatMap((l) => l.queue).length).toBeGreaterThan(0);
    const night = rules.acknowledgeBeat(rules.skipToClose(s));
    const next = rules.sleep(night);
    expect(next.lifts.every((l) => l.queue.length === 0 && l.dispatchCredit === 0)).toBe(true);
    expect(next.dayStats).toMatchObject({ dispatched: 0, waitSumMin: 0, avgQueueMin: 0 });
    expect(resetLiftQueues(s.lifts).every((l) => l.queue.length === 0)).toBe(true);
  });
});

describe("saves from before the lift server", () => {
  it("load with empty queues and zero accumulators, and queued guests rejoin", () => {
    const base = toPersisted(
      rules.togglePause(rules.pickFounder(createInitialState(9), "elena")),
    );
    const old = JSON.parse(JSON.stringify(base));
    for (const l of old.lifts) {
      delete l.queue;
      delete l.dispatchCredit;
    }
    old.dayStats = { arrivals: 20, completedRuns: 3, avgQueueMin: 2.5 };
    old.guests = [{ ...old.guests[0], state: "queue", progress: 0.4 }];
    const m = migrate(old, 1);
    expect(m.lifts.every((l) => l.queue.length === 0 && l.dispatchCredit === 0)).toBe(true);
    expect(m.dayStats).toMatchObject({
      arrivals: 20,
      completedRuns: 3,
      dispatched: 0,
      waitSumMin: 0,
      maxQueueLength: 0,
      peakWaitMin: 0,
    });
    const s = rules.tick({ ...createInitialState(1), ...m, paused: false }, 100);
    expect(s.lifts[0].queue.length + s.guests.filter((g) => g.state === "ride").length).toBe(1);
  });
});

describe("skipToClose", () => {
  it("simulates the rest of the day instead of jumping the clock", async () => {
    const { createInitialState } = await import("./state");
    const rules = await import("./rules");
    let s = rules.pickFounder(createInitialState(7), "elena");
    s = rules.skipToClose(s);
    expect(s.phase).toBe("night");
    expect(s.dayStats.dispatched).toBeGreaterThan(0);
    expect(s.dayStats.completedRuns).toBeGreaterThan(0);
    expect(s.nightRecap).not.toBeNull();
  });
});
