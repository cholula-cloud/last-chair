import { CREW_TALENTS, FOUNDERS, founderById } from "./content";
import { LIFT_PREVIEW_SLOTS, checkDescentValid } from "./descent";
import { createRng } from "./rng";
import {
  DAY_END_MIN,
  DAY_START_MIN,
  applyOvernight,
  buildNightRecap,
  createInitialGuests,
  nextTalentName,
  planArrivals,
  readyStoryBeat,
  tickGuests,
} from "./sim";
import { defaultLifts, type GameState, type LiftSlot } from "./state";
import {
  BUILDING_COSTS,
  LIFT_BUILD_COST,
  MS_PER_GAME_MINUTE,
  type BuildingId,
  type FarePreset,
  type FounderId,
  type LiftType,
  type SnowPreset,
} from "./types";

/** Every rule is pure: `(state, ...args) => state`. It returns the same object when nothing changes. */

export function arrivalMood(
  buildings: BuildingId[],
  founderId: FounderId | null,
): number {
  let mood = 0.65;
  if (buildings.includes("warming_hut")) mood += 0.05;
  if (buildings.includes("lodge")) mood += 0.08;
  if (buildings.includes("cafe")) mood += 0.04;
  const founder = founderById(founderId);
  if (founder) mood += founder.arrivalMoodBonus;
  return Math.min(0.95, mood);
}

export function openNight(state: GameState): GameState {
  const founder = founderById(state.founderId);
  const openLifts = state.lifts.filter((l) => l.confirmed).length;
  const queueCount = state.guests.filter((g) => g.state === "queue").length;
  const avgQueueMin = Math.max(
    1.2,
    2 +
      queueCount * 0.15 -
      (state.talentsOwned.includes("patrol_radio") ? 0.3 : 0),
  );
  const recap = buildNightRecap(
    { ...state.dayStats, avgQueueMin },
    state.fare,
    state.snowQuality,
    avgQueueMin,
    arrivalMood(state.buildings, state.founderId),
    founder?.snowExpectationPenalty ?? 0,
    openLifts,
    founder?.fixedCostDelta ?? 0,
  );
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
    dayStats: { ...state.dayStats, avgQueueMin },
  };
}

export function tick(state: GameState, deltaMs: number): GameState {
  if (state.phase !== "day" || state.paused) return state;

  const rng = createRng(state.rngState);
  const addMin = deltaMs / MS_PER_GAME_MINUTE;
  const clockMin = state.clockMin + addMin;
  const guests = tickGuests(state.guests, addMin / 8, () => rng.next());
  const completedRuns = guests.filter((g) => g.state === "depart").length;
  const queueCount = guests.filter((g) => g.state === "queue").length;
  const avgQueueMin = Math.max(
    1.2,
    2 +
      queueCount * 0.12 -
      (state.talentsOwned.includes("patrol_radio") ? 0.3 : 0),
  );
  const next: GameState = {
    ...state,
    clockMin,
    guests,
    dayStats: { ...state.dayStats, completedRuns, avgQueueMin },
    rngState: rng.state(),
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

export function skipToClose(state: GameState): GameState {
  if (state.phase !== "day") return state;
  return openNightIfReady({ ...state, clockMin: DAY_END_MIN });
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
  const next: LiftSlot = { type, anchor: slot, confirmed: true };
  if (existingIdx >= 0) lifts[existingIdx] = next;
  else if (lifts.length < 2) lifts = [...lifts, next];
  else lifts[type === "chair" ? 1 : 0] = next;

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
    guests: createInitialGuests(arrivals, rand),
    dayStats: { arrivals, completedRuns: 0, avgQueueMin: 2.5 },
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
    snowQuality: state.snowQuality,
    snowDepth: state.snowDepth,
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
    snowQuality: overnight.snowQuality,
    snowDepth: overnight.snowDepth,
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
    guests: createInitialGuests(arrivals, rand),
    dayStats: { arrivals, completedRuns: 0, avgQueueMin: 2.5 },
    rngState: rng.state(),
  };
}

export function finishWinterReview(state: GameState): GameState {
  return { ...state, phase: "mountain2" };
}

export function startNewSeason(state: GameState): GameState {
  const rng = createRng(state.rngState);
  // PR 4: the 22 arrivals are hardcoded; they should come from planArrivals.
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
    founderId: state.founderId ?? "elena",
    guests: createInitialGuests(22, () => rng.next()),
    dayStats: { arrivals: 22, completedRuns: 0, avgQueueMin: 2.5 },
    talentToast: null,
    rngState: rng.state(),
  };
}

export function nextTalentHint(state: GameState): string | null {
  return nextTalentName(state.talentsOwned);
}
