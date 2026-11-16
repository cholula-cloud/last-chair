"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CREW_TALENTS, FOUNDERS, STORY_BEATS, founderById } from "./content";
import {
  LIFT_PREVIEW_SLOTS,
  checkDescentValid,
  type LiftAnchor,
} from "./descent";
import {
  SEASON_LENGTH,
  applyOvernight,
  buildNightRecap,
  createInitialGuests,
  DAY_END_MIN,
  DAY_START_MIN,
  emptyDayStats,
  formatClock,
  nextTalentName,
  planArrivals,
  readyStoryBeat,
  tickGuests,
  type NightRecap,
} from "./sim";
import type {
  BuildingId,
  FarePreset,
  FounderId,
  GamePhase,
  Guest,
  LiftType,
  SnowPreset,
  StoryBeatId,
  WeatherKind,
} from "./types";
import {
  BUILDING_COSTS,
  LIFT_BUILD_COST,
  MS_PER_GAME_MINUTE,
} from "./types";

export type LiftSlot = {
  type: LiftType;
  anchor: LiftAnchor;
  confirmed: boolean;
};

type PersistedSlice = {
  dayIndex: number;
  clockMin: number;
  phase: GamePhase;
  paused: boolean;
  cash: number;
  fare: FarePreset;
  snow: SnowPreset;
  snowQuality: number;
  snowDepth: number;
  guests: Guest[];
  followId: string | null;
  pendingFare: FarePreset;
  pendingSnow: SnowPreset;
  buildMode: boolean;
  founderId: FounderId | null;
  buildings: BuildingId[];
  lifts: LiftSlot[];
  selectedLiftType: LiftType;
  selectedSlotIndex: number;
  talentsOwned: string[];
  completedBeats: StoryBeatId[];
  pendingBeat: StoryBeatId | null;
  beatAcknowledged: boolean;
  weather: WeatherKind;
  morningHeadline: string;
  daysWithoutSnow: number;
  reputation: number;
  gunsVisible: boolean;
  groomVisible: boolean;
  seasonLength: number;
};

type GameStore = PersistedSlice & {
  nightRecap: NightRecap | null;
  dayStats: ReturnType<typeof emptyDayStats>;
  talentToast: string | null;
  tick: (deltaMs: number) => void;
  togglePause: () => void;
  skipToClose: () => void;
  openNightIfReady: () => void;
  setPendingFare: (f: FarePreset) => void;
  setPendingSnow: (s: SnowPreset) => void;
  sleep: () => void;
  setFollowId: (id: string | null) => void;
  setBuildMode: (on: boolean) => void;
  setSelectedLiftType: (t: LiftType) => void;
  setSelectedSlotIndex: (i: number) => void;
  confirmLift: () => void;
  buyBuilding: (id: BuildingId) => void;
  pickFounder: (id: FounderId) => void;
  acknowledgeBeat: () => void;
  finishWinterReview: () => void;
  startNewSeason: () => void;
  nextTalentHint: () => string | null;
};

const DEFAULT_LIFTS: LiftSlot[] = [
  {
    type: "surface",
    anchor: LIFT_PREVIEW_SLOTS[0] ?? { x: -1.2, z: 0.2 },
    confirmed: true,
  },
];

function arrivalMood(buildings: BuildingId[], founderId: FounderId | null): number {
  let mood = 0.65;
  if (buildings.includes("warming_hut")) mood += 0.05;
  if (buildings.includes("lodge")) mood += 0.08;
  if (buildings.includes("cafe")) mood += 0.04;
  const founder = founderById(founderId);
  if (founder) mood += founder.arrivalMoodBonus;
  return Math.min(0.95, mood);
}

function openNight(
  state: PersistedSlice & { dayStats: ReturnType<typeof emptyDayStats> },
) {
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
    clockMin: state.clockMin,
    guests: state.guests,
    phase: "night" as const,
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

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      dayIndex: 1,
      clockMin: DAY_START_MIN,
      phase: "setup",
      paused: true,
      cash: 12000,
      fare: "balanced",
      snow: "mid",
      snowQuality: 0.55,
      snowDepth: 0.45,
      guests: [],
      followId: null,
      nightRecap: null,
      dayStats: emptyDayStats(),
      pendingFare: "balanced",
      pendingSnow: "mid",
      buildMode: false,
      founderId: null,
      buildings: ["warming_hut"],
      lifts: DEFAULT_LIFTS,
      selectedLiftType: "surface",
      selectedSlotIndex: 0,
      talentsOwned: [],
      completedBeats: [],
      pendingBeat: null,
      beatAcknowledged: true,
      weather: "clear",
      morningHeadline: "Dutch Hill opens — one limping surface lift.",
      daysWithoutSnow: 0,
      reputation: 40,
      gunsVisible: false,
      groomVisible: false,
      seasonLength: SEASON_LENGTH,
      talentToast: null,

      togglePause: () => set((s) => ({ paused: !s.paused })),
      setFollowId: (id) => set({ followId: id }),
      setPendingFare: (f) => set({ pendingFare: f }),
      setPendingSnow: (s) => set({ pendingSnow: s }),
      setBuildMode: (on) => set({ buildMode: on }),
      setSelectedLiftType: (t) => set({ selectedLiftType: t }),
      setSelectedSlotIndex: (i) => set({ selectedSlotIndex: i }),

      pickFounder: (id) => {
        if (!FOUNDERS.some((f) => f.id === id)) return;
        const arrivals = planArrivals({
          dayIndex: 1,
          fare: "balanced",
          snowQuality: 0.55,
          weather: "clear",
          buildings: ["warming_hut"],
          talentsOwned: [],
          founderId: id,
        });
        set({
          founderId: id,
          phase: "day",
          paused: true,
          guests: createInitialGuests(arrivals),
          dayStats: { arrivals, completedRuns: 0, avgQueueMin: 2.5 },
          morningHeadline: `${founderById(id)?.name ?? "Founder"} takes the keys to Dutch Hill.`,
          talentToast: `Crew will learn overnight: ${nextTalentName([]) ?? "—"}`,
        });
      },

      confirmLift: () => {
        const state = get();
        const slot = LIFT_PREVIEW_SLOTS[state.selectedSlotIndex];
        if (!slot || !checkDescentValid(slot)) return;
        const cost =
          state.lifts.some((l) => l.confirmed && l.type === state.selectedLiftType)
            ? 400
            : LIFT_BUILD_COST[state.selectedLiftType];
        if (state.cash < cost) return;

        const existingIdx = state.lifts.findIndex(
          (l) =>
            l.anchor.x === slot.x &&
            l.anchor.z === slot.z &&
            l.type === state.selectedLiftType,
        );
        let lifts = [...state.lifts];
        const next: LiftSlot = {
          type: state.selectedLiftType,
          anchor: slot,
          confirmed: true,
        };
        if (existingIdx >= 0) lifts[existingIdx] = next;
        else if (lifts.length < 2) lifts = [...lifts, next];
        else lifts[state.selectedLiftType === "chair" ? 1 : 0] = next;

        set({
          lifts,
          cash: state.cash - cost,
          buildMode: false,
        });
      },

      buyBuilding: (id) => {
        const state = get();
        if (state.buildings.includes(id)) return;
        if (id === "lodge" && !state.buildings.includes("warming_hut")) return;
        if (id === "warming_hut") return;
        const cost = BUILDING_COSTS[id];
        if (state.cash < cost) return;
        const buildings = [...state.buildings, id];
        set({
          buildings,
          cash: state.cash - cost,
          gunsVisible: id === "snow_guns" ? true : state.gunsVisible,
        });
      },

      skipToClose: () => {
        const state = get();
        if (state.phase !== "day") return;
        set({ clockMin: DAY_END_MIN });
        state.openNightIfReady();
      },

      openNightIfReady: () => {
        const state = get();
        if (state.phase !== "day" || state.clockMin < DAY_END_MIN) return;
        set(openNight(state));
      },

      acknowledgeBeat: () => {
        const state = get();
        if (!state.pendingBeat) {
          set({ beatAcknowledged: true });
          return;
        }
        set({
          completedBeats: [...state.completedBeats, state.pendingBeat],
          pendingBeat: null,
          beatAcknowledged: true,
          reputation: state.reputation + 2,
        });
      },

      sleep: () => {
        const state = get();
        if (state.phase !== "night" || !state.nightRecap) return;
        if (state.pendingBeat && !state.beatAcknowledged) return;

        const afterCash = state.cash + state.nightRecap.cashDelta;
        const overnight = applyOvernight({
          snow: state.pendingSnow,
          cash: afterCash,
          snowQuality: state.snowQuality,
          snowDepth: state.snowDepth,
          dayIndex: state.dayIndex,
          buildings: state.buildings,
          talentsOwned: state.talentsOwned,
          daysWithoutSnow: state.daysWithoutSnow,
        });

        const learned = CREW_TALENTS.find(
          (x) => x.name === overnight.talentLearned,
        );
        const talentsOwned = learned
          ? [...state.talentsOwned, learned.id]
          : state.talentsOwned;

        const nextDay = state.dayIndex + 1;
        if (nextDay > state.seasonLength) {
          set({
            phase: "winter_review",
            paused: true,
            cash: overnight.cash,
            fare: state.pendingFare,
            snow: state.pendingSnow,
            snowQuality: overnight.snowQuality,
            snowDepth: overnight.snowDepth,
            gunsVisible: overnight.gunsFired || state.gunsVisible,
            groomVisible: overnight.groomVisible,
            weather: overnight.weather,
            morningHeadline: overnight.morningHeadline,
            daysWithoutSnow: overnight.daysWithoutSnow,
            talentsOwned,
            talentToast: overnight.talentLearned
              ? `Crew learned: ${overnight.talentLearned}`
              : null,
            nightRecap: null,
            pendingBeat: null,
            completedBeats: state.completedBeats.includes("winter_review")
              ? state.completedBeats
              : [...state.completedBeats, "winter_review"],
          });
          return;
        }

        // Honest preview: roll next-day arrivals at sleep (fare/weather apply)
        const arrivals = planArrivals({
          dayIndex: nextDay,
          fare: state.pendingFare,
          snowQuality: overnight.snowQuality,
          weather: overnight.weather,
          buildings: state.buildings,
          talentsOwned,
          founderId: state.founderId,
        });

        set({
          phase: "day",
          paused: true,
          cash: overnight.cash,
          fare: state.pendingFare,
          snow: state.pendingSnow,
          snowQuality: overnight.snowQuality,
          snowDepth: overnight.snowDepth,
          gunsVisible: overnight.gunsFired || state.buildings.includes("snow_guns"),
          groomVisible: overnight.groomVisible,
          weather: overnight.weather,
          morningHeadline: overnight.morningHeadline,
          daysWithoutSnow: overnight.daysWithoutSnow,
          talentsOwned,
          talentToast: overnight.talentLearned
            ? `Crew learned: ${overnight.talentLearned}. Next: ${overnight.nextTalentHint ?? "—"}`
            : overnight.nextTalentHint
              ? `Tomorrow the crew learns: ${overnight.nextTalentHint}`
              : null,
          clockMin: DAY_START_MIN,
          dayIndex: nextDay,
          nightRecap: null,
          pendingBeat: null,
          beatAcknowledged: true,
          guests: createInitialGuests(arrivals),
          dayStats: {
            arrivals,
            completedRuns: 0,
            avgQueueMin: 2.5,
          },
        });
      },

      finishWinterReview: () => set({ phase: "mountain2" }),

      startNewSeason: () => {
        const founderId = get().founderId ?? "elena";
        set({
          dayIndex: 1,
          clockMin: DAY_START_MIN,
          phase: "day",
          paused: true,
          cash: 12000,
          fare: "balanced",
          snow: "mid",
          snowQuality: 0.55,
          snowDepth: 0.45,
          lifts: DEFAULT_LIFTS,
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
          guests: createInitialGuests(22),
          dayStats: { arrivals: 22, completedRuns: 0, avgQueueMin: 2.5 },
          talentToast: null,
        });
      },

      nextTalentHint: () => nextTalentName(get().talentsOwned),

      tick: (deltaMs) => {
        const state = get();
        if (state.phase !== "day" || state.paused) return;

        const addMin = deltaMs / MS_PER_GAME_MINUTE;
        let clockMin = state.clockMin + addMin;
        const guests = tickGuests(state.guests, addMin / 8);
        const completedRuns = guests.filter((g) => g.state === "depart").length;
        const queueCount = guests.filter((g) => g.state === "queue").length;
        const avgQueueMin = Math.max(
          1.2,
          2 +
            queueCount * 0.12 -
            (state.talentsOwned.includes("patrol_radio") ? 0.3 : 0),
        );

        if (clockMin >= DAY_END_MIN) {
          clockMin = DAY_END_MIN;
          set(
            openNight({
              ...state,
              clockMin,
              guests,
              dayStats: {
                ...state.dayStats,
                completedRuns,
                avgQueueMin,
              },
            }),
          );
          return;
        }

        set({
          clockMin,
          guests,
          dayStats: { ...state.dayStats, completedRuns, avgQueueMin },
        });
      },
    }),
    {
      name: "last-chair-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedSlice => ({
        dayIndex: state.dayIndex,
        clockMin: state.clockMin,
        phase: state.phase,
        paused: state.paused,
        cash: state.cash,
        fare: state.fare,
        snow: state.snow,
        snowQuality: state.snowQuality,
        snowDepth: state.snowDepth,
        guests: state.guests,
        followId: state.followId,
        pendingFare: state.pendingFare,
        pendingSnow: state.pendingSnow,
        buildMode: state.buildMode,
        founderId: state.founderId,
        buildings: state.buildings,
        lifts: state.lifts,
        selectedLiftType: state.selectedLiftType,
        selectedSlotIndex: state.selectedSlotIndex,
        talentsOwned: state.talentsOwned,
        completedBeats: state.completedBeats,
        pendingBeat: state.pendingBeat,
        beatAcknowledged: state.beatAcknowledged,
        weather: state.weather,
        morningHeadline: state.morningHeadline,
        daysWithoutSnow: state.daysWithoutSnow,
        reputation: state.reputation,
        gunsVisible: state.gunsVisible,
        groomVisible: state.groomVisible,
        seasonLength: state.seasonLength,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<PersistedSlice> | undefined;
        if (!p) return current;
        if (p.phase === "night") {
          return {
            ...current,
            ...p,
            nightRecap: null,
            phase: "day" as const,
            pendingBeat: null,
            beatAcknowledged: true,
          };
        }
        if (p.phase === "setup" || !p.founderId) {
          return { ...current, ...p, phase: "setup" as const };
        }
        return { ...current, ...p };
      },
    },
  ),
);

export function useClockLabel(): string {
  return formatClock(useGameStore((s) => s.clockMin));
}

export function storyBeatCopy(id: StoryBeatId | null) {
  if (!id) return null;
  return STORY_BEATS.find((b) => b.id === id) ?? null;
}
