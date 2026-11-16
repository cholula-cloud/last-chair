"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { checkDescentValid, type LiftAnchor } from "./descent";
import {
  applyOvernight,
  buildNightRecap,
  createInitialGuests,
  DAY_END_MIN,
  DAY_START_MIN,
  emptyDayStats,
  formatClock,
  rollNextDayArrivals,
  tickGuests,
  type NightRecap,
} from "./sim";
import type {
  DayStats,
  FarePreset,
  GamePhase,
  Guest,
  SnowPreset,
} from "./types";
import { MS_PER_GAME_MINUTE } from "./types";

const DEFAULT_LIFT: LiftAnchor = { x: -1.2, z: 0.2 };

type PersistedSlice = {
  dayIndex: number;
  clockMin: number;
  phase: GamePhase;
  paused: boolean;
  cash: number;
  fare: FarePreset;
  snow: SnowPreset;
  snowQuality: number;
  guests: Guest[];
  followId: string | null;
  pendingFare: FarePreset;
  pendingSnow: SnowPreset;
  liftAnchor: LiftAnchor;
  liftConfirmed: boolean;
  buildMode: boolean;
  nightRecap: NightRecap | null;
  dayStats: DayStats;
};

type GameStore = PersistedSlice & {
  tick: (deltaMs: number) => void;
  togglePause: () => void;
  skipToClose: () => void;
  openNightIfReady: () => void;
  setPendingFare: (f: FarePreset) => void;
  setPendingSnow: (s: SnowPreset) => void;
  sleep: () => void;
  setFollowId: (id: string | null) => void;
  setBuildMode: (on: boolean) => void;
  setLiftAnchor: (anchor: LiftAnchor) => void;
  confirmLift: () => void;
};

const dayOneArrivals = rollNextDayArrivals(1, "balanced");

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      dayIndex: 1,
      clockMin: DAY_START_MIN,
      phase: "day",
      paused: true,
      cash: 12000,
      fare: "balanced",
      snow: "mid",
      snowQuality: 0.55,
      guests: createInitialGuests(dayOneArrivals),
      followId: null,
      nightRecap: null,
      dayStats: { arrivals: dayOneArrivals, completedRuns: 0, avgQueueMin: 2.5 },
      pendingFare: "balanced",
      pendingSnow: "mid",
      liftAnchor: DEFAULT_LIFT,
      liftConfirmed: true,
      buildMode: false,
      togglePause: () => set((s) => ({ paused: !s.paused })),
      setFollowId: (id) => set({ followId: id }),
      setPendingFare: (f) => set({ pendingFare: f }),
      setPendingSnow: (s) => set({ pendingSnow: s }),
      setBuildMode: (on) => set({ buildMode: on }),
      setLiftAnchor: (anchor) => set({ liftAnchor: anchor }),
      confirmLift: () => {
        const anchor = get().liftAnchor;
        if (!checkDescentValid(anchor)) return;
        set({ liftConfirmed: true, buildMode: false });
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
        const queueCount = state.guests.filter((g) => g.state === "queue").length;
        const avgQueueMin = 2 + queueCount * 0.15;
        const recap = buildNightRecap(
          { ...state.dayStats, avgQueueMin },
          state.fare,
          state.snowQuality,
          avgQueueMin,
        );
        set({
          phase: "night",
          paused: true,
          nightRecap: recap,
          pendingFare: state.fare,
          pendingSnow: state.snow,
        });
      },
      sleep: () => {
        const state = get();
        if (state.phase !== "night" || !state.nightRecap) return;
        const afterCash = state.cash + state.nightRecap.cashDelta;
        const overnight = applyOvernight(state.pendingSnow, afterCash);
        const nextDayIndex = state.dayIndex + 1;
        const arrivals = rollNextDayArrivals(nextDayIndex, state.pendingFare);
        set({
          phase: "day",
          paused: true,
          cash: overnight.cash,
          fare: state.pendingFare,
          snow: state.pendingSnow,
          snowQuality: overnight.snowQuality,
          clockMin: DAY_START_MIN,
          dayIndex: nextDayIndex,
          nightRecap: null,
          guests: createInitialGuests(arrivals),
          dayStats: {
            arrivals,
            completedRuns: 0,
            avgQueueMin: 2.5,
          },
        });
      },
      tick: (deltaMs) => {
        const state = get();
        if (state.phase !== "day" || state.paused) return;

        const addMin = deltaMs / MS_PER_GAME_MINUTE;
        let clockMin = state.clockMin + addMin;
        const guests = tickGuests(state.guests, addMin / 8);
        const completedRuns = guests.filter((g) => g.state === "depart").length;
        const queueCount = guests.filter((g) => g.state === "queue").length;
        const avgQueueMin = 2 + queueCount * 0.12;

        if (clockMin >= DAY_END_MIN) {
          clockMin = DAY_END_MIN;
          const recap = buildNightRecap(
            {
              arrivals: state.dayStats.arrivals,
              completedRuns,
              avgQueueMin,
            },
            state.fare,
            state.snowQuality,
            avgQueueMin,
          );
          set({
            clockMin,
            guests,
            phase: "night",
            paused: true,
            nightRecap: recap,
            pendingFare: state.fare,
            pendingSnow: state.snow,
            dayStats: { ...state.dayStats, completedRuns, avgQueueMin },
          });
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
      name: "last-chair-save-v0",
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
        guests: state.guests,
        followId: state.followId,
        pendingFare: state.pendingFare,
        pendingSnow: state.pendingSnow,
        liftAnchor: state.liftAnchor,
        liftConfirmed: state.liftConfirmed,
        buildMode: state.buildMode,
        nightRecap: state.phase === "night" ? state.nightRecap : null,
        dayStats: state.dayStats,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<PersistedSlice> | undefined;
        if (!p) return current;
        const merged = { ...current, ...p };
        if (p.phase === "night" && !p.nightRecap) {
          const avgQueueMin = p.dayStats?.avgQueueMin ?? 2.5;
          const recap = buildNightRecap(
            {
              arrivals: p.dayStats?.arrivals ?? merged.guests.length,
              completedRuns: p.dayStats?.completedRuns ?? 0,
              avgQueueMin,
            },
            p.fare ?? merged.fare,
            p.snowQuality ?? merged.snowQuality,
            avgQueueMin,
          );
          return { ...merged, nightRecap: recap, paused: true };
        }
        return merged;
      },
    },
  ),
);

export function useClockLabel(): string {
  return formatClock(useGameStore((s) => s.clockMin));
}
