import { liftLength, type LiftLine } from "./descent";
import type { LiftSlot } from "./state";
import { TERRAIN, type Terrain } from "./terrain";
import { isOverSkill, pickTrailIndex, type TrailRun } from "./trails";
import { LIFT_SPECS, type Guest, type LiftType } from "./types";

/** Patrol Radio talent: honest effect on lift throughput. */
export const PATROL_RADIO_CAPACITY = 1.05;
const LOAD_MIN = 0.5;
const SPEED_FPM: Record<LiftType, number> = { surface: 345, chair: 333 };
const SKILL_AVOID_MIN = 30;
const SURFACE_BEGINNER_MIN = 2;

/** Game minutes to load and ride this line, rounded to the nearest tenth. */
export function rideMinutes(type: LiftType, line: LiftLine, terrain: Terrain = TERRAIN): number {
  const lengthFt = liftLength(line) * terrain.horizontalFeetPerUnit;
  return Math.round(10 * (LOAD_MIN + lengthFt / SPEED_FPM[type])) / 10;
}

export function rideMinutesForLift(lift: LiftSlot): number {
  return rideMinutes(lift.type, { bottom: lift.bottom ?? TERRAIN.base, top: lift.anchor });
}

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

/** Wait plus ride for another lap on a specific lift. */
export function lapOverheadForLift(
  lifts: readonly LiftSlot[],
  talentsOwned: string[],
  liftIndex: number,
): number {
  const lift = lifts[liftIndex];
  if (!lift?.confirmed) return Infinity;
  const perGuestMin = 60 / liftCapacityPerHour(lift.type, talentsOwned);
  return liftWaitMin(lift, talentsOwned) + perGuestMin + rideMinutesForLift(lift);
}

type LiftGuest = Pick<Guest, "id" | "persona" | "runs">;

function preferredParity(guest: LiftGuest): number {
  let hash = guest.runs;
  for (let i = 0; i < guest.id.length; i++) {
    hash = Math.imul(hash, 31) + guest.id.charCodeAt(i);
  }
  return hash & 1;
}

/** Choose by expected queue and ride time, adjusted for the guest's skiable trails. */
export function chooseLift(
  lifts: readonly LiftSlot[],
  talentsOwned: string[],
  guest?: LiftGuest,
  trails: readonly TrailRun[] = [],
): number {
  let best = -1;
  let bestScore = Infinity;
  let bestCap = 0;
  const parity = guest ? preferredParity(guest) : 0;
  lifts.forEach((l, i) => {
    if (!l.confirmed) return;
    const hasSuitableTrail = guest && trails.some((trail) =>
      trail.open && trail.liftIndex === i && !isOverSkill(guest.persona, trail.difficulty),
    );
    const skillPenalty = guest && !hasSuitableTrail ? SKILL_AVOID_MIN : 0;
    const surfacePenalty = guest?.persona === "first_timer" && l.type === "surface"
      ? SURFACE_BEGINNER_MIN : 0;
    const score = liftWaitMin(l, talentsOwned) + rideMinutesForLift(l) + skillPenalty + surfacePenalty;
    const cap = liftCapacityPerHour(l.type, talentsOwned);
    const winsTie = cap > bestCap || (cap === bestCap && i % 2 === parity && best % 2 !== parity);
    if (score < bestScore || (score === bestScore && winsTie)) {
      best = i;
      bestScore = score;
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
  byLift: { rides: number; waitSumMin: number }[];
};

/**
 * Advance every lift by `addMin` game minutes ending at clock `now`.
 * Guests in state "queue" that are in no lift queue join the lift with the
 * lowest expected time and skill cost. Each lift then dispatches from the front of its
 * FIFO queue as its credit allows, and riders who have ridden long enough
 * move on to "ski". Pure: inputs are not mutated.
 */
export function stepLifts(
  guests: Guest[],
  lifts: LiftSlot[],
  trails: readonly TrailRun[],
  talentsOwned: string[],
  now: number,
  addMin: number,
): LiftStepResult {
  const index = new Map(guests.map((g, i) => [g.id, i]));
  const out = guests.slice();
  const seen = new Set<string>();
  const next: LiftSlot[] = lifts.map((l) => ({
    ...l,
    queue: l.confirmed ? l.queue.filter((id) => {
      const i = index.get(id);
      if (i === undefined || out[i].state !== "queue" || seen.has(id)) return false;
      seen.add(id);
      return true;
    }) : [],
  }));

  // Join.
  out.forEach((g, i) => {
    if (g.state !== "queue" || seen.has(g.id)) return;
    const li = chooseLift(next, talentsOwned, g, trails);
    if (li < 0) return;
    next[li].queue.push(g.id);
    seen.add(g.id);
    out[i] = { ...g, liftIndex: li, joinedQueueAtMin: now };
  });

  // Dispatch.
  const waits: number[] = [];
  const byLift = next.map(() => ({ rides: 0, waitSumMin: 0 }));
  next.forEach((lift, li) => {
    if (!lift.confirmed) return;
    let credit =
      lift.dispatchCredit + (addMin * liftCapacityPerHour(lift.type, talentsOwned)) / 60;
    while (credit >= 1 && lift.queue.length > 0) {
      const id = lift.queue.shift() as string;
      const gi = index.get(id) as number;
      const g = out[gi];
      const wait = now - (g.joinedQueueAtMin ?? now);
      waits.push(wait);
      byLift[li].rides += 1;
      byLift[li].waitSumMin += wait;
      out[gi] = {
        ...g,
        state: "ride",
        liftIndex: li,
        rideStartMin: now,
        progress: 0,
        waitMin: g.waitMin + wait,
        waitCount: g.waitCount + 1,
      };
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
  const rideTimes = next.map(rideMinutesForLift);
  out.forEach((g, i) => {
    if (g.state !== "ride") return;
    const rideMin = rideTimes[g.liftIndex ?? 0] ?? rideTimes[0] ?? LOAD_MIN;
    const start = g.rideStartMin ?? now - g.progress * rideMin;
    const elapsed = now - start;
    if (elapsed >= rideMin - 1e-9) {
      const rest = { ...g };
      delete rest.rideStartMin;
      const li = g.liftIndex ?? 0;
      const trailIndex = pickTrailIndex(g.persona, trails, li, g.id, g.runs);
      out[i] = { ...rest, state: "ski", trailIndex, progress: 0, stateSinceMin: now };
    } else {
      out[i] = { ...g, rideStartMin: start, progress: elapsed / rideMin };
    }
  });

  return { guests: out, lifts: next, waits, byLift };
}
