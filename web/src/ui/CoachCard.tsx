"use client";

import { useEffect } from "react";
import { activeTip, COACH_INTROS, TIPS } from "@/game/coach";
import { openingStep } from "@/game/rules";
import { founderById } from "@/game/content";
import { useGameStore } from "@/game/store";
import { useCoach } from "./coachStore";

/** Render in normal flow so even a compact night sheet keeps choices reachable. */
export function CoachCard({ slot }: { slot: "day" | "recap-problem" | "fare" | "snow" | "sleep" }) {
  const index = useCoach((s) => s.index);
  const step = useGameStore((s) => activeTip({ index, entered: null }, s));
  const founder = useGameStore((s) => s.founderId);
  const opening = useGameStore((s) => openingStep(s) ? "build" : "opening");
  const anchor = step === null ? null : TIPS[step][0];
  const visible = step !== null && (slot === "day" ? step < 6 : anchor === slot);
  useEffect(() => {
    if (!visible || step === null) return;
    const target = document.querySelector(`[data-coach="${step === 0 ? opening : anchor}"]`);
    target?.classList.add("coach-target");
    let elapsed = 0;
    let last = performance.now();
    const limit = step === 3 ? 45 : step === 4 ? 30 : step === 6 ? 20 : 0;
    const timer = limit ? window.setInterval(() => {
      const now = performance.now();
      const state = useGameStore.getState();
      if (!document.hidden && (state.phase === "night" || !state.paused)) elapsed += Math.min(now - last, 1000);
      last = now;
      if (elapsed >= limit * 1000) useCoach.getState().next(step);
    }, 500) : undefined;
    return () => { window.clearInterval(timer); target?.classList.remove("coach-target"); };
  }, [visible, anchor, step, opening]);
  if (!visible || step === null || !founder) return null;
  const name = founderById(founder)?.name ?? founder;
  return (
    <div className="panel pointer-events-auto my-1 max-w-md px-3 py-1 text-base leading-tight">
      <p role="status" aria-live="polite"><strong>{name}</strong> · {step === 0 ? COACH_INTROS[founder] : TIPS[step][1]}</p>
      <div className="flex gap-4">
        <button type="button" className="min-h-11 px-1 font-bold underline" onClick={() => useCoach.getState().next(step)}>Next</button>
        <button type="button" className="min-h-11 px-1 underline" onClick={() => useCoach.getState().skip()}>Skip tips</button>
      </div>
    </div>
  );
}
