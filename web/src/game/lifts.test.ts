import { addReferenceDescent, createBuiltHill } from "./__fixtures__/built-hill";
import { describe, expect, it } from "vitest";
import { REFERENCE_TOPS } from "./descent";
import {
  PATROL_RADIO_CAPACITY,
  chooseLift,
  currentWaitMin,
  liftCapacityPerHour,
  resetLiftQueues,
  rideMinutesForLift,
  stepLifts,
} from "./lifts";
import * as rules from "./rules";
import { makeGuest, tickGuests } from "./sim";
import { type GameState, type LiftSlot } from "./state";
import { defaultTrails } from "./trails";
import { TERRAIN } from "./terrain";
import { ARRIVE_WALK_MIN, LIFT_SPECS, MS_PER_GAME_MINUTE, type Guest, type LiftType } from "./types";
import { WIND_HOLD, isWindHeld } from "./weather";

const slot = (type: LiftType, queue: string[] = []): LiftSlot => ({
  type,
  anchor: REFERENCE_TOPS[type === "surface" ? 0 : 1],
  confirmed: true,
  queue,
  dispatchCredit: 0,
});

const queued = (id: string): Guest => makeGuest({ id, label: id, state: "queue" });
const SURFACE_PER_HR = LIFT_SPECS.surface.capacityPerHour;
const trail = (liftIndex: number, difficulty: "green" | "blue") => ({
  ...defaultTrails()[0], liftIndex, difficulty,
});

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
  const trails = o.types.map((_, i) => trail(i, "green"));
  for (let now = step; now <= o.minutes + 1e-9; now += step) {
    carry += o.arrivals(now) * step;
    while (carry >= 1) {
      guests = [...guests, queued(`g${n++}`)];
      carry -= 1;
    }
    const r = stepLifts(guests, lifts, trails, o.talents ?? [], now, step);
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
  it("holds chairs only from 10:30 until 13:00 on gusty days", () => {
    expect(isWindHeld("chair", "gusty", WIND_HOLD.fromMin - 0.5)).toBe(false);
    expect(isWindHeld("chair", "gusty", WIND_HOLD.fromMin)).toBe(true);
    expect(isWindHeld("chair", "gusty", WIND_HOLD.toMin - 0.5)).toBe(true);
    expect(isWindHeld("chair", "gusty", WIND_HOLD.toMin)).toBe(false);
    expect(isWindHeld("surface", "gusty", WIND_HOLD.fromMin)).toBe(false);
    expect(isWindHeld("chair", "calm", WIND_HOLD.fromMin)).toBe(false);
  });

  it("reroutes a chair queue to the surface lift until gusts ease", () => {
    const started = rules.pickFounder(createBuiltHill(7), "elena");
    const hill = addReferenceDescent(rules.placeLift({ ...started, lodgeTier: 2 }, {
      type: "chair", bottom: TERRAIN.base, top: REFERENCE_TOPS[1],
    }), 1);
    expect(hill.lifts[1]?.confirmed).toBe(true);
    const guests = Array.from({ length: 45 }, (_, n) => makeGuest({
      id: `g${n}`, state: "queue", liftIndex: 1, targetRuns: 20,
      joinedQueueAtMin: WIND_HOLD.fromMin - 0.5,
    }));
    const start = {
      ...hill,
      paused: false,
      clockMin: WIND_HOLD.fromMin - 0.5,
      guests,
      lifts: hill.lifts.map((lift, n) => n === 1 ? { ...lift, queue: guests.map((guest) => guest.id) } : lift),
    };
    const calm = { ...start, weatherDays: [{ kind: started.weather, wind: "calm" } as const] };
    const gusty = { ...start, weatherDays: [{ kind: started.weather, wind: "gusty" } as const] };
    const firstStep = rules.tick(gusty, 0.5 * MS_PER_GAME_MINUTE);
    expect(firstStep.lifts[1].queue).toEqual([]);
    expect(firstStep.lifts[1].confirmed).toBe(true);
    expect(firstStep.lifts[0].queue.length).toBeGreaterThan(0);

    const windowMs = (WIND_HOLD.toMin - WIND_HOLD.fromMin) * MS_PER_GAME_MINUTE;
    const endGusty = rules.tick(gusty, windowMs);
    const endCalm = rules.tick(calm, windowMs);
    expect(endGusty.dayStats.byLift[1].rides).toBe(0);
    expect(endCalm.dayStats.byLift[1].rides).toBeGreaterThan(0);
    const surfaceWait = (end: GameState) => {
      const { rides, waitSumMin } = end.dayStats.byLift[0];
      expect(rides).toBeGreaterThan(0);
      return waitSumMin / rides;
    };
    expect(surfaceWait(endGusty)).toBeGreaterThan(surfaceWait(endCalm));
    const reopened = rules.tick(endGusty, 30 * MS_PER_GAME_MINUTE);
    expect(reopened.dayStats.byLift[1].rides).toBeGreaterThan(0);
  });

  it("counts time spent waiting when a held chair is the only lift", () => {
    const { fromMin, toMin } = WIND_HOLD;
    const guest = makeGuest({ state: "arrive", stateSinceMin: fromMin - ARRIVE_WALK_MIN });
    const lifts = [slot("chair")];
    const trails = [trail(0, "green")];
    const clock = {
      now: fromMin, snowQuality: 0.55, lapOverheadMin: Infinity, lifts, trails,
      talentsOwned: [], wind: "gusty" as const,
    };
    const waiting = tickGuests([guest], clock);
    expect(waiting[0]).toMatchObject({ state: "queue", joinedQueueAtMin: fromMin });
    const held = stepLifts(waiting, lifts, trails, [], toMin - 0.5, 0.5, "gusty");
    const opened = stepLifts(held.guests, held.lifts, trails, [], toMin + 1.5, 2, "gusty");
    expect(held.byLift[0].rides).toBe(0);
    expect(opened.byLift[0].rides).toBe(1);
    expect(opened.guests[0].waitMin).toBe(toMin + 1.5 - fromMin);
  });

  it("dispatches in FIFO order", () => {
    let guests = Array.from({ length: 10 }, (_, i) => queued(`q${i}`));
    let lifts = [slot("surface")];
    const order: string[] = [];
    for (let now = 0.5; now <= 20; now += 0.5) {
      const r = stepLifts(guests, lifts, defaultTrails(), [], now, 0.5);
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
    const r = stepLifts(guests, lifts, [trail(0, "green"), trail(1, "green")], [], 1, 0);
    expect(r.guests.find((g) => g.id === "new")?.liftIndex).toBe(0);
    expect(r.lifts[0].queue).toEqual(["new"]);
    // Equal queue lengths: the faster chair has the shorter expected wait.
    expect(chooseLift([slot("surface", ["x"]), slot("chair", ["y"])], [], [trail(0, "green"), trail(1, "green")])).toBe(1);
    // Equal waits (both empty): the higher capacity wins.
    expect(chooseLift([slot("surface"), slot("chair")], [], [trail(0, "green"), trail(1, "green")])).toBe(1);
    // No open lift.
    expect(chooseLift([{ ...slot("surface"), confirmed: false }], [], [trail(0, "green")])).toBe(-1);
  });

  it("weighs trail skill against the queue and ride, and changes choice when a green opens", () => {
    const firstTimer = { ...queued("beginner"), persona: "first_timer" } as const;
    const regular = queued("regular");
    const lifts = [slot("surface"), slot("chair")];
    const blueChair = [trail(0, "green"), trail(1, "blue")];

    expect(chooseLift(lifts, [], blueChair, firstTimer)).toBe(0);
    expect(chooseLift(lifts, [], blueChair, regular)).toBe(1);
    expect(chooseLift(lifts, [], [...blueChair, trail(1, "green")], firstTimer)).toBe(1);
    expect(chooseLift([slot("surface", Array(20).fill("q")), slot("chair")], [], blueChair, firstTimer))
      .toBe(0);
    expect(chooseLift([slot("surface", Array(40).fill("q")), slot("chair")], [], blueChair, firstTimer))
      .toBe(1);
  });

  it("assigns eligible lifts on an exact tie deterministically and accounts for each dispatch", () => {
    const lifts = [slot("surface"), slot("surface")];
    const trails = [trail(0, "green"), trail(1, "green")];
    const guests = [queued("a"), queued("b")];
    const r = stepLifts(guests, lifts, trails, [], 2, 2);
    expect(r.guests.map((guest) => guest.liftIndex)).toEqual([1, 0]);
    expect(r.byLift).toEqual([{ rides: 1, waitSumMin: 0 }, { rides: 1, waitSumMin: 0 }]);
    expect(stepLifts(guests, lifts, trails, [], 2, 2)).toEqual(r);
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
        const r = stepLifts(guests, lifts, defaultTrails(), [], now, 0.5);
        guests = r.guests;
        lifts = r.lifts;
        const g = guests[0];
        if (g.state === "ride" && rideStart === undefined) rideStart = g.rideStartMin;
        if (g.state === "ski") skiAt = now;
      }
      expect(skiAt! - rideStart!).toBeCloseTo(rideMinutesForLift(slot(type)), 9);
    }
    expect(rideMinutesForLift(slot("surface"))).toBe(4);
    expect(rideMinutesForLift(slot("chair"))).toBe(3);
    const longerChair = { ...slot("chair"), anchor: REFERENCE_TOPS[0] };
    expect(rideMinutesForLift(longerChair)).toBeGreaterThan(3);
  });

  it("rides report elapsed/rideMinutes as progress and queues rank front-first", () => {
    let guests = ["a", "b", "c", "d"].map(queued);
    const r0 = stepLifts(guests, [slot("surface")], defaultTrails(), [], 0.1, 0.1);
    const p = r0.guests.map((g) => g.progress);
    expect(p[0]).toBeGreaterThan(p[1]);
    expect(p[1]).toBeGreaterThan(p[2]);
    expect(p[2]).toBeGreaterThan(p[3]);
    guests = [{ ...queued("r"), state: "ride", rideStartMin: 10, liftIndex: 0 }];
    const r1 = stepLifts(guests, [slot("surface")], defaultTrails(), [], 12, 0);
    expect(r1.guests[0].progress).toBeCloseTo(0.5, 10);
  });

  it("does not mutate its inputs", () => {
    const guests = [queued("a"), queued("b")];
    const lifts = [slot("surface")];
    const before = structuredClone({ guests, lifts });
    stepLifts(guests, lifts, defaultTrails(), [], 5, 1);
    expect({ guests, lifts }).toEqual(before);
  });
});

describe("lifts in the day tick", () => {
  const dayState = (guests: Guest[], seed = 3): GameState => ({
    ...rules.togglePause(rules.pickFounder(createBuiltHill(seed), "elena")),
    guests,
  });

  it("never puts a guest in two queues, and every queued guest is in exactly one", () => {
    for (let seed = 1; seed <= 4; seed++) {
      let s = rules.pickFounder(createBuiltHill(seed), "elena");
      s = rules.placeLift({ ...s, cash: 99999, lodgeTier: 2 }, {
        type: "chair", bottom: TERRAIN.base, top: REFERENCE_TOPS[1],
      });
      expect(s.lifts).toHaveLength(2);
      s = rules.togglePause(addReferenceDescent(s, 1));
      while (s.phase === "day") {
        s = rules.tick(s, MS_PER_GAME_MINUTE);
        const ids = s.lifts.flatMap((l) => l.queue);
        expect(new Set(ids).size).toBe(ids.length);
        const waiting = s.guests.filter((g) => g.state === "queue").map((g) => g.id);
        expect([...ids].sort()).toEqual(waiting.sort());
      }
    }
  });

  it("records measured waits in the day stats", () => {
    let s = dayState([queued("a"), queued("b"), queued("c")]);
    s = rules.tick(s, 2 * MS_PER_GAME_MINUTE);
    // Large ticks are simulated in sub-steps, so the first guest waits one dispatch interval.
    for (let i = 0; i < 12; i++) s = rules.tick(s, MS_PER_GAME_MINUTE);
    const { dispatched, waitSumMin, avgQueueMin, peakWaitMin, maxQueueLength, byLift } = s.dayStats;
    expect(dispatched).toBe(3);
    expect(byLift).toEqual([{ rides: dispatched, waitSumMin }]);
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
    const s = createBuiltHill(1);
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
    s = rules.tick(s, MS_PER_GAME_MINUTE);
    expect(s.lifts.flatMap((l) => l.queue).length).toBeGreaterThan(0);
    const night = rules.acknowledgeBeat(rules.skipToClose(s));
    const next = rules.sleep(night);
    expect(next.lifts.every((l) => l.queue.length === 0 && l.dispatchCredit === 0)).toBe(true);
    expect(next.dayStats).toMatchObject({ dispatched: 0, waitSumMin: 0, avgQueueMin: 0 });
    expect(resetLiftQueues(s.lifts).every((l) => l.queue.length === 0)).toBe(true);
  });
});

describe("skipToClose", () => {
  it("simulates the rest of the day instead of jumping the clock", async () => {
    const rules = await import("./rules");
    let s = rules.pickFounder(createBuiltHill(7), "elena");
    s = rules.skipToClose(s);
    expect(s.phase).toBe("night");
    expect(s.dayStats.dispatched).toBeGreaterThan(0);
    expect(s.dayStats.completedRuns).toBeGreaterThan(0);
    expect(s.nightRecap).not.toBeNull();
  });
});
