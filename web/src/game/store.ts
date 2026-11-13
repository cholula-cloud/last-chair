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
  tickGuests,
  type NightRecap,
} from "./sim";
import type { FarePreset, GamePhase, Guest, SnowPreset } from "./types";
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
};

type GameStore = PersistedSlice & {
  nightRecap: NightRecap | null;
  dayStats: ReturnType<typeof emptyDayStats>;
  liftOpen: boolean;
  tick: (deltaMs: number) => void;
  togglePause: () => void;
  skipToClose: () => void;
  openNightIfReady: () => void;
  setPendingFare: (f: FarePreset) => void;
  setPendingSnow: (s: SnowPreset) => void;
  sleep: () => void;
  setFollowId: (id: string | null) => void;
  resetDay: () => void;
  setBuildMode: (on: boolean) => void;
  setLiftAnchor: (anchor: LiftAnchor) => void;
  confirmLift: () => void;
};

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
      guests: createInitialGuests(22),
      followId: null,
      nightRecap: null,
      dayStats: { arrivals: 22, completedRuns: 0, avgQueueMin: 2.5 },
      pendingFare: "balanced",
      pendingSnow: "mid",
      liftOpen: true,
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
        set({ liftConfirmed: true, buildMode: false, liftOpen: true });
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
        set({
          phase: "day",
          paused: true,
          cash: overnight.cash,
          fare: state.pendingFare,
          snow: state.pendingSnow,
          snowQuality: overnight.snowQuality,
          clockMin: DAY_START_MIN,
          dayIndex: state.dayIndex + 1,
          nightRecap: null,
          guests: createInitialGuests(20 + Math.floor(Math.random() * 8)),
          dayStats: {
            arrivals: 22,
            completedRuns: 0,
            avgQueueMin: 2.5,
          },
        });
      },
      resetDay: () =>
        set({
          clockMin: DAY_START_MIN,
          phase: "day",
          paused: true,
          guests: createInitialGuests(22),
          nightRecap: null,
        }),
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
      name: "last-chair-v0",
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
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<PersistedSlice> | undefined;
        if (!p) return current;
        if (p.phase === "night") {
          return { ...current, ...p, nightRecap: null, phase: "day" };
        }
        return { ...current, ...p };
      },
    },
  ),
);

export function useClockLabel(): string {
  return formatClock(useGameStore((s) => s.clockMin));
}
