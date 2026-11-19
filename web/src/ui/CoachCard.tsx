"use client";

import { useEffect, useRef } from "react";
import { activeTip, COACH_INTROS, TIPS } from "@/game/coach";
import { openingStep } from "@/game/rules";
import { founderById } from "@/game/content";
import { useGameStore } from "@/game/store";
import { useSettings } from "./settingsStore";
import { useCoach } from "./coachStore";

/** Render in normal flow so even a compact night sheet keeps choices reachable. */
export function CoachCard({ slot }: { slot: "day" | "recap-problem" | "fare" | "snow" | "sleep" }) {
  const card = useRef<HTMLDivElement>(null);
  const index = useCoach((s) => s.index);
  const step = useGameStore((s) => activeTip({ index, entered: null }, s));
  const founder = useGameStore((s) => s.founderId);
  const opening = useGameStore((s) => openingStep(s) ? "build" : "opening");
  const anchor = step === null ? null : TIPS[step][0];
  const enabled = useSettings(s => s.tips);
  const visible = enabled && step !== null && (slot === "day" ? step < 6 : anchor === slot);
  useEffect(() => {
    if (!visible || step === null) return;
    const target = document.querySelector(`[data-coach="${step === 0 ? opening : anchor}"]`);
    target?.classList.add("coach-target");
    const panel = card.current;
    // Keep opening instructions together under the clock. Later day tips point to the HUD.
    let resize: ResizeObserver | undefined;
    if (slot === "day" && step > 0 && panel && target) {
      const align = () => {
        const bounds = target.getBoundingClientRect();
        panel.style.position = "fixed";
        panel.style.width = "min(22rem, calc(100vw - 24px))";
        const width = panel.offsetWidth;
        const height = panel.offsetHeight;
        const left = Math.max(12, Math.min(window.innerWidth - width - 12, bounds.x + bounds.width / 2 - width / 2));
        const above = bounds.top - height - 12;
        panel.style.left = left + "px";
        const pointsDown = above >= 70 && bounds.top < window.innerHeight;
        panel.style.top = (pointsDown ? above : 68) + "px";
        panel.dataset.pointsDown = String(pointsDown);
        panel.style.setProperty("--coach-arrow", Math.max(10, Math.min(width - 20, bounds.x + bounds.width / 2 - left - 6)) + "px");
      };
      align();
      resize = new ResizeObserver(align);
      resize.observe(panel);
      resize.observe(document.documentElement);
    }
    let onScreen = false;
    const intersection = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; });
    if (panel) intersection.observe(panel);
    let elapsed = 0;
    let last = performance.now();
    const limit = step === 3 ? 45 : step === 4 ? 30 : step === 6 ? 20 : 0;
    const timer = limit ? window.setInterval(() => {
      const now = performance.now();
      const state = useGameStore.getState();
      if (onScreen && !document.hidden && (state.phase === "night" || !state.paused)) elapsed += Math.min(now - last, 1000);
      last = now;
      if (elapsed >= limit * 1000) useCoach.getState().next(step);
    }, 500) : undefined;
    return () => {
      intersection.disconnect();
      resize?.disconnect();
      if (panel && slot === "day") {
        panel.removeAttribute("style");
        delete panel.dataset.pointsDown;
      }
      window.clearInterval(timer);
      target?.classList.remove("coach-target");
    };
  }, [visible, anchor, step, opening, slot]);
  if (!visible || step === null || !founder) return null;
  const name = founderById(founder)?.name ?? founder;
  return (
    <div ref={card} className="coach-card panel pointer-events-auto my-1 max-w-md px-3 py-1 text-base leading-tight">
      <p role="status" aria-live="polite"><strong>{name}</strong> · {step === 0 ? COACH_INTROS[founder] : TIPS[step][1]}</p>
      <div className="flex gap-4">
        <button type="button" className="min-h-11 min-w-11 px-1 font-bold underline" onClick={() => useCoach.getState().next(step)}>Next</button>
        <button type="button" className="min-h-11 min-w-11 px-1 underline" onClick={() => useCoach.getState().skip()}>Skip tips</button>
      </div>
    </div>
  );
}
