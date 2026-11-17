import { CREW_TALENTS, FOUNDERS, founderById } from "./content";
import { LIFT_PREVIEW_SLOTS, checkDescentValid } from "./descent";
import {
  chooseLift,
  currentWaitMin,
  liftCapacityPerHour,
  liftWaitMin,
  longestQueue,
  resetLiftQueues,
  stepLifts,
} from "./lifts";
import { createRng } from "./rng";
import {
  THAW_START_MIN,
  averageTrail,
  deriveSnow,
  experiencedSnow,
  readSnow,
  softenTrail,
  wearTrail,
} from "./snow";
import { SAT, daySatisfaction, type SatisfactionContext } from "./satisfaction";
import {
  DAY_END_MIN,
  DAY_START_MIN,
  applyOvernight,
  buildNightRecap,
  createInitialGuests,
  emptyDayStats,
  isOnHill,
  isWeekend,
  nextTalentName,
  planArrivals,
  readyStoryBeat,
  tickGuests,
} from "./sim";
import { defaultLifts, type GameState, type LiftSlot } from "./state";
import {
  BUILDING_COSTS,
  LIFT_BUILD_COST,
  LIFT_SPECS,
  MS_PER_GAME_MINUTE,
  type BuildingId,
  type FarePreset,
  type FounderId,
  type LiftType,
  type SnowPreset,
  type WeatherKind,
} from "./types";

/** Every rule is pure: `(state, ...args) => state`. It returns the same object when nothing changes. */

export function arrivalMood(
  buildings: BuildingId[],
  founderId: FounderId | null,
  weather: WeatherKind = "clear",
): number {
  let mood = 0.65;
  if (weather === "snow") mood += 0.06;
  if (weather === "thaw") mood -= 0.08;
  if (buildings.includes("warming_hut")) mood += 0.05;
  if (buildings.includes("lodge")) mood += 0.08;
  if (buildings.includes("cafe")) mood += 0.04;
  const founder = founderById(founderId);
  if (founder) mood += founder.arrivalMoodBonus;
  return Math.max(0, Math.min(0.95, mood));
}

/**
 * Queue input to satisfaction: today's measured mean wait so far, or the
 * current expected wait at the busiest lift before anyone has been dispatched.
 */
export function measuredWaitMin(state: GameState): number {
  const { dispatched, waitSumMin } = state.dayStats;
  return dispatched > 0 ? waitSumMin / dispatched : currentWaitMin(state);
}

/** Day-wide inputs to every guest's satisfaction, shared by the HUD, the Guests sheet and `openNight` so they cannot drift. */
export function satisfactionContext(
  state: Pick<
    GameState,
    "fare" | "buildings" | "founderId" | "weather" | "clockMin"
  >,
): SatisfactionContext {
  const founder = founderById(state.founderId);
  return {
    fare: state.fare,
    arrivalMood: arrivalMood(state.buildings, state.founderId, state.weather),
    snowExpectation: SAT.SNOW_EXPECTED + (founder?.snowExpectationPenalty ?? 0),
    now: state.clockMin,
  };
}

/** Satisfaction as `openNight` would record it right now; the HUD uses this. */
export function liveSatisfaction(state: GameState): number {
  return daySatisfaction(state.guests, satisfactionContext(state)).score;
}

export function openNight(state: GameState): GameState {
  const founder = founderById(state.founderId);
  const openLifts = state.lifts.filter((l) => l.confirmed).length;
  const avgQueueMin = measuredWaitMin(state);
  const ctx = satisfactionContext(state);
  const stats = { ...state.dayStats, avgQueueMin };
  const recap = buildNightRecap({
    stats,
    fare: state.fare,
    snowQuality: state.snowQuality,
    snowTrouble: readSnow(state.lifts).trouble,
    day: daySatisfaction(state.guests, ctx),
    arrivalMood: ctx.arrivalMood,
    openLiftCount: openLifts,
    founderFixedDelta: founder?.fixedCostDelta ?? 0,
  });
  const reputation = Math.round(
    state.reputation * 0.85 + recap.satisfaction * 0.15,
  );
  const pendingBeat = readyStoryBeat({
    dayIndex: state.dayIndex,
    liftsOpen: openLifts,
    completedRuns: state.dayStats.completedRuns,
    arrivals: state.dayStats.arrivals,
    snowDepth: state.snowDepth,
    daysWithoutSnow: state.daysWithoutSnow,
    reputation,
    buildings: state.buildings,
    lessonsBooked: state.talentsOwned.includes("school_day"),
    completedBeats: state.completedBeats,
  });
  return {
    ...state,
    phase: "night",
    paused: true,
    nightRecap: recap,
    pendingFare: state.fare,
    pendingSnow: state.snow,
    reputation,
    pendingBeat,
    beatAcknowledged: pendingBeat == null,
    dayStats: stats,
  };
}

/**
 * Minutes a guest finishing a run expects before the next one starts skiing:
 * the wait at the best open lift (counting their own turn) plus its ride time.
 */
function lapOverheadMin(lifts: GameState["lifts"], talentsOwned: string[]): number {
  const li = chooseLift(lifts, talentsOwned);
  if (li < 0) return Infinity;
  const lift = lifts[li];
  const perGuestMin = 60 / liftCapacityPerHour(lift.type, talentsOwned);
  return liftWaitMin(lift, talentsOwned) + perGuestMin + LIFT_SPECS[lift.type].rideMinutes;
}

/** Longest slice of game time simulated in one step, so coarse ticks still measure waits to within it. */
const MAX_STEP_MIN = 0.5;

export function tick(state: GameState, deltaMs: number): GameState {
  if (state.phase !== "day" || state.paused) return state;

  const addMin = deltaMs / MS_PER_GAME_MINUTE;
  const steps = Math.max(1, Math.ceil(addMin / MAX_STEP_MIN));
  const stepMin = addMin / steps;

  let { clockMin, guests, lifts } = state;
  let {
    completedRuns,
    dispatched,
    waitSumMin,
    maxQueueLength,
    peakWaitMin,
    guestsArrived,
    turnedAway,
    peakOnHill,
  } = state.dayStats;
  for (let k = 0; k < steps; k++) {
    clockMin += stepMin;
    const moved = tickGuests(guests, {
      now: clockMin,
      snowQuality: state.snowQuality,
      snowByLift: lifts.map((l) => experiencedSnow(l.trail)),
      lapOverheadMin: lapOverheadMin(lifts, state.talentsOwned),
    });
    const runsByLift = lifts.map(() => 0);
    moved.forEach((g, i) => {
      const was = guests[i];
      completedRuns += g.runs - was.runs;
      if (g.runs > was.runs) {
        const li = Math.min(lifts.length - 1, was.liftIndex ?? 0);
        runsByLift[li] += g.runs - was.runs;
      }
      if (was.state === "pending" && g.state !== "pending") guestsArrived += 1;
      // Sent home from the line at closing before a single ride.
      if (was.state === "queue" && g.state === "depart" && g.runs === 0) turnedAway += 1;
    });
    // Traffic scrapes the trail of the lift each run came down; thaw afternoons soften the low end.
    const thawing = state.weather === "thaw" && clockMin >= THAW_START_MIN;
    lifts = lifts.map((l, li) => {
      let trail = wearTrail(l.trail, runsByLift[li]);
      if (thawing) trail = softenTrail(trail, stepMin);
      return trail === l.trail ? l : { ...l, trail };
    });
    const step = stepLifts(moved, lifts, state.talentsOwned, clockMin, stepMin);
    guests = step.guests;
    lifts = step.lifts;
    for (const w of step.waits) {
      dispatched += 1;
      waitSumMin += w;
      peakWaitMin = Math.max(peakWaitMin, w);
    }
    maxQueueLength = Math.max(maxQueueLength, longestQueue(lifts));
    peakOnHill = Math.max(peakOnHill, guests.filter(isOnHill).length);
  }
  // The camera follows a guest only while they are on the hill.
  const followed = state.followId
    ? guests.find((g) => g.id === state.followId)
    : undefined;

  const next: GameState = {
    ...state,
    clockMin,
    guests,
    lifts,
    followId: followed && followed.state !== "gone" ? state.followId : null,
    ...deriveSnow(lifts),
    dayStats: {
      ...state.dayStats,
      guestsArrived,
      runsPerGuest: guestsArrived > 0 ? completedRuns / guestsArrived : 0,
      turnedAway,
      peakOnHill,
      completedRuns,
      dispatched,
      waitSumMin,
      maxQueueLength,
      peakWaitMin,
      avgQueueMin: dispatched > 0 ? waitSumMin / dispatched : 0,
    },
  };
  return clockMin >= DAY_END_MIN
    ? openNight({ ...next, clockMin: DAY_END_MIN })
    : next;
}

export function togglePause(state: GameState): GameState {
  return { ...state, paused: !state.paused };
}

export function openNightIfReady(state: GameState): GameState {
  if (state.phase !== "day" || state.clockMin < DAY_END_MIN) return state;
  return openNight(state);
}

/**
 * Fast-forward the rest of the day through the real simulation, so skipping
 * produces the same kind of day (queues, waits, runs) as watching it.
 */
export function skipToClose(state: GameState): GameState {
  if (state.phase !== "day") return state;
  const STEP_MIN = 4;
  let s: GameState = { ...state, paused: false };
  while (s.phase === "day") {
    s = tick(s, STEP_MIN * MS_PER_GAME_MINUTE);
  }
  return s;
}

export function setPendingFare(state: GameState, fare: FarePreset): GameState {
  return { ...state, pendingFare: fare };
}

export function setPendingSnow(state: GameState, snow: SnowPreset): GameState {
  return { ...state, pendingSnow: snow };
}

export function setFollowId(state: GameState, id: string | null): GameState {
  return { ...state, followId: id };
}

export function setBuildMode(state: GameState, on: boolean): GameState {
  return { ...state, buildMode: on };
}

export function setSelectedLiftType(state: GameState, type: LiftType): GameState {
  return { ...state, selectedLiftType: type };
}

export function setSelectedSlotIndex(state: GameState, index: number): GameState {
  return { ...state, selectedSlotIndex: index };
}

export function confirmLift(state: GameState): GameState {
  const slot = LIFT_PREVIEW_SLOTS[state.selectedSlotIndex];
  if (!slot || !checkDescentValid(slot)) return state;
  const type = state.selectedLiftType;
  const cost = state.lifts.some((l) => l.confirmed && l.type === type)
    ? 400
    : LIFT_BUILD_COST[type];
  if (state.cash < cost) return state;

  const existingIdx = state.lifts.findIndex(
    (l) => l.anchor.x === slot.x && l.anchor.z === slot.z && l.type === type,
  );
  let lifts = [...state.lifts];
  const place = (i: number): LiftSlot => ({
    type,
    anchor: slot,
    confirmed: true,
    queue: lifts[i]?.queue ?? [],
    dispatchCredit: lifts[i]?.dispatchCredit ?? 0,
    // A new run starts with the hill's average snow, so the means do not jump.
    trail:
      lifts[i]?.trail ??
      averageTrail(state.lifts.filter((l) => l.confirmed).map((l) => l.trail)),
  });
  if (existingIdx >= 0) lifts[existingIdx] = place(existingIdx);
  else if (lifts.length < 2) lifts = [...lifts, place(lifts.length)];
  else {
    const i = type === "chair" ? 1 : 0;
    lifts[i] = place(i);
  }

  return { ...state, lifts, cash: state.cash - cost, buildMode: false };
}

export function buyBuilding(state: GameState, id: BuildingId): GameState {
  if (state.buildings.includes(id)) return state;
  if (id === "lodge" && !state.buildings.includes("warming_hut")) return state;
  if (id === "warming_hut") return state;
  const cost = BUILDING_COSTS[id];
  if (state.cash < cost) return state;
  return {
    ...state,
    buildings: [...state.buildings, id],
    cash: state.cash - cost,
    gunsVisible: id === "snow_guns" ? true : state.gunsVisible,
  };
}

export function pickFounder(state: GameState, id: FounderId): GameState {
  if (!FOUNDERS.some((f) => f.id === id)) return state;
  const rng = createRng(state.rngState);
  const rand = () => rng.next();
  const arrivals = planArrivals({
    dayIndex: 1,
    fare: "balanced",
    snowQuality: 0.55,
    weather: "clear",
    buildings: ["warming_hut"],
    talentsOwned: [],
    founderId: id,
    rand,
  });
  return {
    ...state,
    founderId: id,
    phase: "day",
    paused: true,
    guests: createInitialGuests(arrivals, rand, false),
    dayStats: { ...emptyDayStats(), arrivals },
    lifts: resetLiftQueues(state.lifts),
    morningHeadline: `${founderById(id)?.name ?? "Founder"} takes the keys to Dutch Hill.`,
    talentToast: `Crew will learn overnight: ${nextTalentName([]) ?? "—"}`,
    rngState: rng.state(),
  };
}

export function acknowledgeBeat(state: GameState): GameState {
  if (!state.pendingBeat) {
    return state.beatAcknowledged ? state : { ...state, beatAcknowledged: true };
  }
  return {
    ...state,
    completedBeats: [...state.completedBeats, state.pendingBeat],
    pendingBeat: null,
    beatAcknowledged: true,
    reputation: state.reputation + 2,
  };
}

export function sleep(state: GameState): GameState {
  if (state.phase !== "night" || !state.nightRecap) return state;
  if (state.pendingBeat && !state.beatAcknowledged) return state;

  const overnight = applyOvernight({
    snow: state.pendingSnow,
    cash: state.cash + state.nightRecap.cashDelta,
    trails: state.lifts.map((l) => l.trail),
    dayIndex: state.dayIndex,
    buildings: state.buildings,
    talentsOwned: state.talentsOwned,
    daysWithoutSnow: state.daysWithoutSnow,
  });
  const learned = CREW_TALENTS.find((x) => x.name === overnight.talentLearned);
  const talentsOwned = learned
    ? [...state.talentsOwned, learned.id]
    : state.talentsOwned;
  const carried: GameState = {
    ...state,
    paused: true,
    cash: overnight.cash,
    fare: state.pendingFare,
    snow: state.pendingSnow,
    lifts: state.lifts.map((l, i) => ({ ...l, trail: overnight.trails[i] ?? l.trail })),
    snowQuality: overnight.snowQuality,
    snowDepth: overnight.snowDepth,
    gunReach: overnight.gunReach,
    groomVisible: overnight.groomVisible,
    weather: overnight.weather,
    morningHeadline: overnight.morningHeadline,
    daysWithoutSnow: overnight.daysWithoutSnow,
    talentsOwned,
    nightRecap: null,
    pendingBeat: null,
  };

  const nextDay = state.dayIndex + 1;
  if (nextDay > state.seasonLength) {
    return {
      ...carried,
      phase: "winter_review",
      gunsVisible: overnight.gunsFired || state.gunsVisible,
      talentToast: overnight.talentLearned
        ? `Crew learned: ${overnight.talentLearned}`
        : null,
      completedBeats: state.completedBeats.includes("winter_review")
        ? state.completedBeats
        : [...state.completedBeats, "winter_review"],
    };
  }

  // Roll next-day arrivals at sleep (fare and weather apply).
  const rng = createRng(state.rngState);
  const rand = () => rng.next();
  const arrivals = planArrivals({
    dayIndex: nextDay,
    fare: state.pendingFare,
    snowQuality: overnight.snowQuality,
    weather: overnight.weather,
    buildings: state.buildings,
    talentsOwned,
    founderId: state.founderId,
    rand,
  });
  return {
    ...carried,
    phase: "day",
    gunsVisible: overnight.gunsFired || state.buildings.includes("snow_guns"),
    talentToast: overnight.talentLearned
      ? `Crew learned: ${overnight.talentLearned}. Next: ${overnight.nextTalentHint ?? "—"}`
      : overnight.nextTalentHint
        ? `Tomorrow the crew learns: ${overnight.nextTalentHint}`
        : null,
    clockMin: DAY_START_MIN,
    dayIndex: nextDay,
    beatAcknowledged: true,
    guests: createInitialGuests(arrivals, rand, isWeekend(nextDay)),
    dayStats: { ...emptyDayStats(), arrivals },
    lifts: resetLiftQueues(carried.lifts),
    rngState: rng.state(),
  };
}

export function finishWinterReview(state: GameState): GameState {
  return { ...state, phase: "mountain2" };
}

export function startNewSeason(state: GameState): GameState {
  const rng = createRng(state.rngState);
  const rand = () => rng.next();
  const founderId = state.founderId ?? "elena";
  const arrivals = planArrivals({
    dayIndex: 1,
    fare: "balanced",
    snowQuality: 0.55,
    weather: "clear",
    buildings: ["warming_hut"],
    talentsOwned: [],
    founderId,
    rand,
  });
  return {
    ...state,
    dayIndex: 1,
    clockMin: DAY_START_MIN,
    phase: "day",
    paused: true,
    cash: 12000,
    fare: "balanced",
    snow: "mid",
    snowQuality: 0.55,
    snowDepth: 0.45,
    gunReach: 0,
    lifts: defaultLifts(),
    buildings: ["warming_hut"],
    talentsOwned: [],
    completedBeats: [],
    pendingBeat: null,
    beatAcknowledged: true,
    weather: "clear",
    morningHeadline: "New winter — Dutch Hill again.",
    daysWithoutSnow: 0,
    reputation: 40,
    gunsVisible: false,
    groomVisible: false,
    nightRecap: null,
    founderId,
    guests: createInitialGuests(arrivals, rand, false),
    dayStats: { ...emptyDayStats(), arrivals },
    talentToast: null,
    rngState: rng.state(),
  };
}

export function nextTalentHint(state: GameState): string | null {
  return nextTalentName(state.talentsOwned);
}
