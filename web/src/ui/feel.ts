"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { audio } from "@/audio/engine";
import { mixGains } from "@/audio/mix";
import { lodgeTierUnlocks } from "@/game/base";
import { useGameStore } from "@/game/store";
import { useSettings } from "@/ui/settingsStore";

/** The pop shown on build confirm and lodge tier-up. `seq` changes on every pop so the same text can repeat. */
type PopStore = { seq: number; label: string; fire: (label: string) => void; clear: () => void };

export const usePop = create<PopStore>((set, get) => ({
  seq: 0,
  label: "",
  fire: (label) => set({ seq: get().seq + 1, label }),
  clear: () => set({ label: "" }),
}));

/** A build was confirmed: thunk and pop. */
export function buildConfirmed(label: string): void {
  audio.play("thunk");
  usePop.getState().fire(label);
}

/** The radio card arrived: the three-note sting. */
export function radioArrived(): void {
  if (useSettings.getState().radioEnabled) audio.play("sting");
}

function applyMix(): void {
  const prefs = useSettings.getState();
  audio.setMix(mixGains({ ...prefs, soundOn: !prefs.muted, ambienceVolume: prefs.musicVolume }));
}

/** Presses on real controls get a tap. Disabled ones stay silent. */
function isPressable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const el = target.closest("button, [role='button'], a[href], summary");
  return !!el && !(el as HTMLButtonElement).disabled && el.getAttribute("aria-disabled") !== "true";
}

/**
 * Wires the sound layer once for the whole page: unlocks audio on the first gesture, suspends it
 * when the tab hides, follows the sound settings, plays UI taps, switches the wind bed with the
 * phase and chimes when a lodge tier completes. Mount it once, above the title screen.
 */
export function useFeel(playing: boolean): void {
  useEffect(() => {
    // iOS counts pointerup, touchend, click and keydown as activation. pointerdown alone is not enough.
    const unlock = () => { if (!useSettings.getState().muted) audio.unlock(); };
    const events = ["pointerup", "touchend", "click", "keydown"] as const;
    for (const name of events) window.addEventListener(name, unlock, { capture: true, passive: true });
    const onDown = (e: PointerEvent) => {
      if (e.isPrimary && isPressable(e.target)) audio.play("tap");
    };
    window.addEventListener("pointerdown", onDown, { capture: true, passive: true });

    const onVisibility = () => audio.setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();

    applyMix();
    const offSettings = useSettings.subscribe((next, prev) => {
      applyMix();
      if (prev.muted && !next.muted && navigator.userActivation?.isActive) unlock();
    });

    return () => {
      for (const name of events) window.removeEventListener(name, unlock, { capture: true });
      window.removeEventListener("pointerdown", onDown, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
      offSettings();
      audio.setHidden(true);
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const bedFor = (phase: string) => phase === "day" || phase === "setup" ? "day" : "night";
    audio.setBed(bedFor(useGameStore.getState().phase));
    const offGame = useGameStore.subscribe((s, prev) => {
      if (s.phase !== prev.phase) audio.setBed(bedFor(s.phase));
      // A lodge upgrade finishes overnight, one day on. A save loading a later day does not count.
      if (s.lodgeTier > prev.lodgeTier && s.seasonSeed === prev.seasonSeed && s.mountainId === prev.mountainId && s.dayIndex === prev.dayIndex + 1) {
        audio.play("chime");
        const unlocks = lodgeTierUnlocks(s.lodgeTier).slice(0, 3).join(", ");
        const detail = unlocks ? `${unlocks}${lodgeTierUnlocks(s.lodgeTier).length > 3 ? "…" : ""}` : "More pads out front";
        usePop.getState().fire(`Lodge tier ${s.lodgeTier} — ${detail}`);
      }
    });

    return () => {
      offGame();
      audio.setBed(null);
      usePop.getState().clear();
    };
  }, [playing]);
}
