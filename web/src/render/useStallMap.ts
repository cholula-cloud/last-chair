/* eslint-disable react-hooks/refs -- parking slots must persist across frames within a day */
import { useMemo, useRef } from "react";
import type { Guest } from "@/game/types";
import { shoulderSpots, stallCenters } from "@/game/site";
import { SITE } from "./layout";
import { assignStalls, type StallSlot } from "./parking";

/** Stable guest → parking slot map for one day (resets when `dayIndex` changes). */
export function useStallMap(guests: readonly Guest[], dayIndex: number): Map<string, StallSlot> {
  const stalls = useMemo(() => stallCenters(SITE), []);
  const shoulder = useMemo(() => shoulderSpots(SITE), []);
  const holder = useRef({ day: -1, map: new Map<string, StallSlot>() });

  return useMemo(() => {
    const prev = holder.current.day === dayIndex ? holder.current.map : new Map<string, StallSlot>();
    const m = assignStalls(prev, guests, stalls, shoulder);
    holder.current = { day: dayIndex, map: m };
    return m;
  }, [guests, stalls, shoulder, dayIndex]);
}