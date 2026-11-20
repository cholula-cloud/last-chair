"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings, type Settings } from "@/ui/settingsStore";

export type ReduceMotionPref = "system" | "on" | "off";

export type MoodSample = { clockMin: number; mood: number };

let systemReducedMotion = false;
let reduceMotionPref: ReduceMotionPref = "system";
const motionListeners = new Set<() => void>();

function syncMotionPref(pref: ReduceMotionPref) {
  reduceMotionPref = pref;
  motionListeners.forEach((l) => l());
}

function syncSystemReduced(matches: boolean) {
  systemReducedMotion = matches;
  motionListeners.forEach((l) => l());
}

/** Non-React reduced-motion read (frame loops, scroll behavior). */
export const motionPref = {
  get(): boolean {
    return resolveReducedMotion(reduceMotionPref, systemReducedMotion);
  },
};

export function resolveReducedMotion(pref: ReduceMotionPref, systemReduced = systemReducedMotion): boolean {
  if (pref === "on") return true;
  if (pref === "off") return false;
  return systemReduced;
}

export function reduceMotionLabel(pref: ReduceMotionPref): string {
  return pref === "system" ? "system" : pref;
}

export function cycleReduceMotion(pref: ReduceMotionPref): ReduceMotionPref {
  if (pref === "system") return "on";
  if (pref === "on") return "off";
  return "system";
}

/** Mood at or just before `targetMin` from a time-ordered sample buffer. */
export function moodAt(samples: MoodSample[], targetMin: number): number | null {
  let best: MoodSample | null = null;
  for (const s of samples) {
    if (s.clockMin > targetMin) break;
    best = s;
  }
  return best?.mood ?? null;
}

/**
 * Fires when mood moved ≥5 pts in the last 10 game minutes; at most once per 30 game minutes.
 */
export function moodPulse(
  samples: MoodSample[],
  nowMin: number,
  lastPulseMin: number | null,
): { delta: number } | null {
  if (lastPulseMin != null && nowMin - lastPulseMin < 30) return null;
  const then = moodAt(samples, nowMin - 10);
  const now = moodAt(samples, nowMin);
  if (then == null || now == null) return null;
  const delta = now - then;
  if (Math.abs(delta) < 5) return null;
  return { delta };
}

/** Ease-out count between endpoints; `t` is elapsed ms, `duration` defaults to 600. */
export function countUp(from: number, to: number, t: number, duration = 600): number {
  if (t <= 0) return from;
  if (t >= duration) return to;
  const u = t / duration;
  const eased = 1 - (1 - u) ** 3;
  return from + (to - from) * eased;
}

export function useReducedMotion(): boolean {
  const pref = useSettings((s) => s.reduceMotion);
  const [reduced, setReduced] = useState(() => resolveReducedMotion(pref, systemReducedMotion));

  useEffect(() => {
    syncMotionPref(pref);
    const update = () => setReduced(resolveReducedMotion(reduceMotionPref, systemReducedMotion));
    motionListeners.add(update);
    update();
    return () => {
      motionListeners.delete(update);
    };
  }, [pref]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let query: MediaQueryList;
    try {
      query = window.matchMedia("(prefers-reduced-motion: reduce)");
    } catch {
      syncSystemReduced(false);
      return;
    }
    const onChange = () => {
      syncSystemReduced(query.matches);
    };
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** Animated money value for night recap; lands on `to` exactly. */
export function useCashCountUp(from: number, to: number, enabled: boolean): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced || !enabled ? to : from);
  const startRef = useRef<number | null>(null);
  const targetRef = useRef(to);

  useEffect(() => {
    targetRef.current = to;
    let frame = 0;
    const tick = () => {
      if (reduced || !enabled) {
        startRef.current = null;
        setValue(to);
        return;
      }
      if (startRef.current == null) {
        startRef.current = performance.now();
        setValue(from);
      }
      const elapsed = performance.now() - (startRef.current ?? 0);
      const next = countUp(from, targetRef.current, elapsed);
      setValue(next);
      if (elapsed < 600) frame = requestAnimationFrame(tick);
      else setValue(targetRef.current);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to, enabled, reduced]);

  return value;
}

export function applyReduceMotionFromSettings(settings: Pick<Settings, "reduceMotion">): void {
  if (typeof document === "undefined") return;
  const on = resolveReducedMotion(settings.reduceMotion, systemReducedMotion);
  document.documentElement.dataset.reduceMotion = String(on);
}

/** Ring buffer of mood samples; exposes pulse delta for the HUD mood chip. */
export function useMoodPulseTracker(mood: number, clockMin: number) {
  const samplesRef = useRef<MoodSample[]>([]);
  const lastPulseRef = useRef<number | null>(null);
  const [delta, setDelta] = useState<number | null>(null);
  const [pulseTick, setPulseTick] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const samples = samplesRef.current;
    const last = samples.at(-1);
    if (!last || last.clockMin !== clockMin) {
      samples.push({ clockMin, mood });
      if (samples.length > 180) samples.shift();
    } else if (last.mood !== mood) {
      last.mood = mood;
    }
    const hit = moodPulse(samples, clockMin, lastPulseRef.current);
    if (!hit) return;
    lastPulseRef.current = clockMin;
    setDelta(hit.delta);
    setPulseTick((k) => k + 1);
    const ms = reduced ? 900 : 1400;
    const t = window.setTimeout(() => setDelta(null), ms);
    return () => clearTimeout(t);
  }, [mood, clockMin, reduced]);

  return { delta, pulseTick, reduced };
}