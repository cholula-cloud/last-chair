"use client";

import { useEffect, useRef, useState } from "react";
import { createRng } from "@/game/rng";
import { useGameStore } from "@/game/store";
import { useSettings } from "./settingsStore";

type Cue = "tap" | "build" | "radio" | "tier";

/** Synthesized wind and short instrument notes. The audio device opens only inside a gesture. */
export function HillSound({ playing }: { playing: boolean }) {
  const inGame = useRef(playing);
  const refresh = useRef<(() => void) | null>(null);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    inGame.current = playing;
    refresh.current?.();
  }, [playing]);

  useEffect(() => {
    let ctx: AudioContext | undefined;
    let ambient: GainNode | undefined;
    let effects: GainNode | undefined;
    let master: GainNode | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const levels = () => {
      if (!ctx || !ambient || !effects || !master) return;
      const prefs = useSettings.getState();
      const now = ctx.currentTime;
      master.gain.setTargetAtTime(prefs.muted || document.hidden ? 0 : prefs.masterVolume / 100, now, 0.012);
      effects.gain.setTargetAtTime(prefs.effectsVolume / 100, now, 0.012);
      const night = useGameStore.getState().phase !== "day";
      ambient.gain.setTargetAtTime(inGame.current ? prefs.musicVolume / 100 * (night ? 0.036 : 0.06) : 0, now, 0.2);
    };
    refresh.current = levels;
    function unlock() {
      if (useSettings.getState().muted || !window.AudioContext) return;
      try {
        if (!ctx) {
          ctx = new AudioContext();
          master = ctx.createGain();
          effects = ctx.createGain();
          ambient = ctx.createGain();
          ambient.gain.value = 0;
          master.gain.value = 0;
          master.connect(ctx.destination);
          effects.connect(master);
          ambient.connect(master);
          const wind = ctx.createBufferSource();
          const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
          const samples = buffer.getChannelData(0);
          const windNoise = createRng(1968);
          let last = 0;
          for (let i = 0; i < samples.length; i++) {
            last = (last + (windNoise.next() - 0.5) * 0.13) / 1.02;
            samples[i] = last * (0.8 + 0.2 * Math.sin(2 * Math.PI * i / samples.length));
          }
          wind.buffer = buffer;
          wind.loop = true;
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 1400;
          wind.connect(filter).connect(ambient);
          wind.start();
          levels();
        }
        if (ctx.state === "suspended") void ctx.resume().catch(() => {});
      } catch { /* Audio devices can be unavailable while the game keeps running. */ }
    }
    function cue(kind: Cue) {
      if (!ctx || !effects || ctx.state !== "running" || document.hidden || useSettings.getState().muted) return;
      const notes = { tap: [420], build: [115, 64], radio: [523, 659, 784], tier: [392, 494, 587, 784] }[kind];
      for (const [i, hz] of notes.entries()) {
        const start = ctx.currentTime + i * (kind === "build" ? 0.04 : 0.09);
        const duration = kind === "tap" ? 0.045 : 0.16;
        const oscillator = ctx.createOscillator();
        oscillator.type = kind === "build" || kind === "radio" ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(hz, start);
        if (kind === "build") oscillator.frequency.exponentialRampToValueAtTime(hz / 2, start + duration);
        const envelope = ctx.createGain();
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(kind === "build" ? 0.22 : 0.12, start + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(envelope).connect(effects);
        oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
        oscillator.start(start);
        oscillator.stop(start + duration);
      }
    }
    const tap = (event: MouseEvent) => {
      // Touch browsers may grant audio activation on release rather than pointerdown.
      if (event.isTrusted) unlock();
      if (event.target instanceof Element && event.target.closest("button:not(:disabled),summary")) cue("tap");
    };
    const notify = (message: string) => {
      setFeedback(message);
      clearTimeout(timer);
      timer = setTimeout(() => setFeedback(""), 1800);
    };
    const unlisten = useGameStore.subscribe((s, previous) => {
      if (!inGame.current || s.seasonSeed !== previous.seasonSeed) return;
      if (s.phase !== previous.phase) levels();
      if (s.phase === "night" && previous.phase === "day" && useSettings.getState().radioEnabled &&
          (s.pendingBeat || s.surpriseLog.length > previous.surpriseLog.length)) cue("radio");
      if (s.lodgeTier > previous.lodgeTier) {
        cue("tier");
        notify(`Lodge Tier ${s.lodgeTier} is open`);
      } else if (s.phase === "day" && previous.phase === "day" && (
        s.lifts.length > previous.lifts.length || s.trails.length > previous.trails.length ||
        s.assets.length > previous.assets.length || s.guns.length > previous.guns.length ||
        (s.lodgeUpgrade && !previous.lodgeUpgrade))) {
        cue("build");
        notify(s.lodgeUpgrade && !previous.lodgeUpgrade ? "Lodge work started" : "Construction confirmed");
      }
    });
    const unsubPrefs = useSettings.subscribe((prefs, previous) => {
      if (previous.muted && !prefs.muted && navigator.userActivation?.isActive) unlock();
      levels();
    });
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("click", tap, true);
    document.addEventListener("visibilitychange", levels);
    return () => {
      clearTimeout(timer);
      refresh.current = null;
      unlisten();
      unsubPrefs();
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("click", tap, true);
      document.removeEventListener("visibilitychange", levels);
      if (ctx) void ctx.close().catch(() => {});
    };
  }, []);
  return playing && feedback ? <div role="status" className="arrive chip pointer-events-none fixed left-1/2 top-[18%] z-[60] -translate-x-1/2 px-4 py-2 text-center font-bold">{feedback}</div> : null;
}
