/* eslint-disable react-hooks/refs -- parking slots must persist across frames within a day */
import { useMemo, useRef } from "react";
import type { Guest } from "@/game/types";
import { shoulderSpots } from "@/game/site";
import { useGameStore } from "@/game/store";
import { SITE } from "./layout";
import { assignStalls, expandedStallCenters, type StallSlot } from "./parking";

/** Stable guest → parking slot map for one day (resets when `dayIndex` changes). */
export function useStallMap(guests: readonly Guest[], dayIndex: number): Map<string, StallSlot> {
  const tier = useGameStore((state) => state.lodgeTier);
  const stalls = useMemo(() => expandedStallCenters(SITE, tier), [tier]);
  const shoulder = useMemo(() => shoulderSpots(SITE), []);
  const holder = useRef({ day: -1, map: new Map<string, StallSlot>() });

  return useMemo(() => {
    const prev = holder.current.day === dayIndex ? holder.current.map : new Map<string, StallSlot>();
    const m = assignStalls(prev, guests, stalls, shoulder, SITE.arrival.stalls);
    holder.current = { day: dayIndex, map: m };
    return m;
  }, [guests, stalls, shoulder, dayIndex]);
}
