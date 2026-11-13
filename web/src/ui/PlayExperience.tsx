"use client";

import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { computeSatisfaction, formatClock } from "@/game/sim";
import { useGameStore } from "@/game/store";
import { MountainScene } from "@/render/MountainScene";
import { BuildSheet } from "@/ui/BuildSheet";
import { GuestsSheet } from "@/ui/GuestsSheet";
import { NightRecapSheet } from "@/ui/NightRecapSheet";

export default function PlayExperience() {
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);
  const [hydrated, setHydrated] = useState(() =>
    useGameStore.persist.hasHydrated(),
  );

  const dayIndex = useGameStore((s) => s.dayIndex);
  const clockMin = useGameStore((s) => s.clockMin);
  const paused = useGameStore((s) => s.paused);
  const cash = useGameStore((s) => s.cash);
  const phase = useGameStore((s) => s.phase);
  const fare = useGameStore((s) => s.fare);
  const snowQuality = useGameStore((s) => s.snowQuality);
  const avgQueue = useGameStore((s) => s.dayStats.avgQueueMin);
  const togglePause = useGameStore((s) => s.togglePause);
  const skipToClose = useGameStore((s) => s.skipToClose);
  const buildMode = useGameStore((s) => s.buildMode);
  const setBuildMode = useGameStore((s) => s.setBuildMode);

  const mood = useMemo(
    () => Math.round(computeSatisfaction(fare, snowQuality, avgQueue)),
    [fare, snowQuality, avgQueue],
  );

  useEffect(() => {
    const unsub = useGameStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    void useGameStore.persist.rehydrate();
    return unsub;
  }, []);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        useGameStore.setState({ paused: true });
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  useEffect(() => {
    if (buildOpen) setBuildMode(true);
  }, [buildOpen, setBuildMode]);

  const showStartHint = hydrated && phase === "day" && paused && dayIndex === 1;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0b1628] text-slate-100">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center justify-between gap-2 text-sm">
          <button
            type="button"
            onClick={togglePause}
            className="min-h-11 min-w-11 rounded-full border border-white/15 bg-black/40 px-3 text-xs font-semibold backdrop-blur"
            aria-label={paused ? "Resume day" : "Pause day"}
          >
            {paused ? "▶" : "❚❚"}
          </button>
          <span className="rounded-full border border-white/10 bg-black/40 px-3 py-2 font-medium backdrop-blur">
            Day {dayIndex} · {formatClock(clockMin)}
          </span>
          <span className="rounded-full border border-white/10 bg-black/40 px-3 py-2 font-medium backdrop-blur">
            ${cash.toLocaleString()}
          </span>
        </div>
      </header>

      <Canvas
        className="touch-none"
        camera={{ position: [6, 5, 8], fov: 48 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <MountainScene />
      </Canvas>

      {showStartHint && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/25 px-6 text-center">
          <p className="rounded-2xl border border-white/15 bg-black/50 px-5 py-4 text-sm font-medium text-white backdrop-blur">
            Tap ▶ to open Dutch Hill for the day
          </p>
        </div>
      )}

      {phase === "day" && (
        <>
          <OpsStrip avgQueue={avgQueue} snowQuality={snowQuality} mood={mood} />
          <footer className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-2 px-3 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))]">
            <Link
              href="/"
              className="min-h-11 rounded-full border border-white/15 bg-black/50 px-4 text-xs font-medium text-slate-300 backdrop-blur"
            >
              ← Home
            </Link>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setBuildOpen(true)}
                className={`min-h-12 rounded-full border px-5 text-sm font-semibold backdrop-blur ${
                  buildMode
                    ? "border-orange-400 bg-orange-500/30 text-white"
                    : "border-white/15 bg-black/50 text-white"
                }`}
              >
                Build
              </button>
              <button
                type="button"
                onClick={() => setGuestsOpen(true)}
                className="min-h-12 rounded-full border border-white/15 bg-black/50 px-5 text-sm font-semibold backdrop-blur"
              >
                Guests
              </button>
              <button
                type="button"
                onClick={skipToClose}
                className="min-h-12 rounded-full bg-[#e85d26] px-5 text-sm font-semibold text-white"
              >
                Close hill
              </button>
            </div>
          </footer>
        </>
      )}

      <GuestsSheet open={guestsOpen} onClose={() => setGuestsOpen(false)} />
      <BuildSheet
        open={buildOpen}
        onClose={() => {
          setBuildOpen(false);
          if (!useGameStore.getState().liftConfirmed) {
            setBuildMode(false);
          }
        }}
      />
      <NightRecapSheet />
    </div>
  );
}

function OpsStrip({
  avgQueue,
  snowQuality,
  mood,
}: {
  avgQueue: number;
  snowQuality: number;
  mood: number;
}) {
  const moodIcon = mood >= 70 ? "😊" : mood >= 50 ? "🙂" : "😐";
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        className="pointer-events-auto flex w-full max-w-lg flex-wrap items-center justify-center gap-2 text-xs text-slate-200"
        role="status"
        aria-label="Mountain operations"
      >
        <span className="min-h-11 rounded-full border border-white/10 bg-black/55 px-3 py-2 backdrop-blur">
          Queue ~{avgQueue.toFixed(1)}m
        </span>
        <span className="min-h-11 rounded-full border border-white/10 bg-black/55 px-3 py-2 backdrop-blur">
          Snow {Math.round(snowQuality * 100)}%
        </span>
        <span className="min-h-11 rounded-full border border-white/10 bg-black/55 px-3 py-2 backdrop-blur">
          {moodIcon} Mood {mood}%
        </span>
      </div>
    </div>
  );
}
