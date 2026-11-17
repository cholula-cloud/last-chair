import type { LiftSlot } from "./state";
import { LIFT_SPECS, type Guest, type LiftType } from "./types";

/** Patrol Radio talent: honest effect on lift throughput. */
export const PATROL_RADIO_CAPACITY = 1.05;

export function liftCapacityPerHour(type: LiftType, talentsOwned: string[]): number {
  const base = LIFT_SPECS[type].capacityPerHour;
  return talentsOwned.includes("patrol_radio") ? base * PATROL_RADIO_CAPACITY : base;
}

/** Minutes a guest at the back of this lift's queue would wait right now. */
export function liftWaitMin(lift: LiftSlot, talentsOwned: string[]): number {
  return lift.queue.length / (liftCapacityPerHour(lift.type, talentsOwned) / 60);
}

/** Expected wait at the busiest confirmed lift (the HUD queue reading); 0 with empty queues. */
export function currentWaitMin(state: {
  lifts: LiftSlot[];
  talentsOwned: string[];
}): number {
  let worst = 0;
  for (const l of state.lifts) {
    if (l.confirmed) worst = Math.max(worst, liftWaitMin(l, state.talentsOwned));
  }
  return worst;
}

/** Lift with the shortest expected wait; ties go to the higher capacity, then the lower index. -1 if none is open. */
export function chooseLift(lifts: LiftSlot[], talentsOwned: string[]): number {
  let best = -1;
  let bestWait = Infinity;
  let bestCap = 0;
  lifts.forEach((l, i) => {
    if (!l.confirmed) return;
    const wait = liftWaitMin(l, talentsOwned);
    const cap = liftCapacityPerHour(l.type, talentsOwned);
    if (wait < bestWait || (wait === bestWait && cap > bestCap)) {
      best = i;
      bestWait = wait;
      bestCap = cap;
    }
  });
  return best;
}

/** Empty every queue and dispatch accumulator (a new day starts with fresh guests). */
export function resetLiftQueues(lifts: LiftSlot[]): LiftSlot[] {
  return lifts.map((l) => ({ ...l, queue: [], dispatchCredit: 0 }));
}

export function longestQueue(lifts: LiftSlot[]): number {
  return lifts.reduce((m, l) => Math.max(m, l.queue.length), 0);
}

export type LiftStepResult = {
  guests: Guest[];
  lifts: LiftSlot[];
  /** Measured waits (game minutes) of the guests dispatched in this step. */
  waits: number[];
};

/**
 * Advance every lift by `addMin` game minutes ending at clock `now`.
 * Guests in state "queue" that are in no lift queue join the lift with the
 * shortest expected wait. Each lift then dispatches from the front of its
 * FIFO queue as its credit allows, and riders who have ridden long enough
 * move on to "ski". Pure: inputs are not mutated.
 */
export function stepLifts(
  guests: Guest[],
  lifts: LiftSlot[],
  talentsOwned: string[],
  now: number,
  addMin: number,
): LiftStepResult {
  const index = new Map(guests.map((g, i) => [g.id, i]));
  const out = guests.slice();
  const seen = new Set<string>();
  const next: LiftSlot[] = lifts.map((l) => ({
    ...l,
    queue: l.queue.filter((id) => {
      const i = index.get(id);
      if (i === undefined || out[i].state !== "queue" || seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
  }));

  // Join.
  out.forEach((g, i) => {
    if (g.state !== "queue" || seen.has(g.id)) return;
    const li = chooseLift(next, talentsOwned);
    if (li < 0) return;
    next[li].queue.push(g.id);
    seen.add(g.id);
    out[i] = { ...g, liftIndex: li, joinedQueueAtMin: now };
  });

  // Dispatch.
  const waits: number[] = [];
  next.forEach((lift, li) => {
    if (!lift.confirmed) return;
    let credit =
      lift.dispatchCredit + (addMin * liftCapacityPerHour(lift.type, talentsOwned)) / 60;
    while (credit >= 1 && lift.queue.length > 0) {
      const id = lift.queue.shift() as string;
      const gi = index.get(id) as number;
      const g = out[gi];
      waits.push(now - (g.joinedQueueAtMin ?? now));
      out[gi] = { ...g, state: "ride", liftIndex: li, rideStartMin: now, progress: 0 };
      credit -= 1;
    }
    // An idle lift does not bank capacity beyond the next guest.
    lift.dispatchCredit = lift.queue.length === 0 ? Math.min(credit, 1) : credit;
  });

  // Queue order drives the render's ranking: front of the line has the most progress.
  next.forEach((lift) => {
    const n = lift.queue.length;
    lift.queue.forEach((id, pos) => {
      const gi = index.get(id) as number;
      out[gi] = { ...out[gi], progress: (n - pos) / (n + 1) };
    });
  });

  // Rides end after the lift's ride time.
  out.forEach((g, i) => {
    if (g.state !== "ride") return;
    const type = (next[g.liftIndex ?? 0] ?? next[0])?.type ?? "surface";
    const rideMin = LIFT_SPECS[type].rideMinutes;
    const start = g.rideStartMin ?? now - g.progress * rideMin;
    const elapsed = now - start;
    if (elapsed >= rideMin - 1e-9) {
      const rest = { ...g };
      delete rest.rideStartMin;
      out[i] = { ...rest, state: "ski", progress: 0, stateSinceMin: now };
    } else {
      out[i] = { ...g, rideStartMin: start, progress: elapsed / rideMin };
    }
  });

  return { guests: out, lifts: next, waits };
}
