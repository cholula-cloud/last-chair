"use client";

import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney } from "@/game/format";
import { liveSatisfaction } from "@/game/rules";
import { formatClock, weekdayLabel } from "@/game/sim";
import { useGameStore } from "@/game/store";
import { MountainScene } from "@/render/MountainScene";
import { BuildSheet } from "@/ui/BuildSheet";
import { FounderPick } from "@/ui/FounderPick";
import { GuestsSheet } from "@/ui/GuestsSheet";
import { NightRecapSheet } from "@/ui/NightRecapSheet";
import { WinterReviewSheet } from "@/ui/WinterReviewSheet";

export default function PlayExperience() {
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const dayIndex = useGameStore((s) => s.dayIndex);
  const seasonLength = useGameStore((s) => s.seasonLength);
  const clockMin = useGameStore((s) => s.clockMin);
  const paused = useGameStore((s) => s.paused);
  const cash = useGameStore((s) => s.cash);
  const phase = useGameStore((s) => s.phase);
  const snowQuality = useGameStore((s) => s.snowQuality);
  const snowDepth = useGameStore((s) => s.snowDepth);
  const avgQueue = useGameStore((s) => s.dayStats.avgQueueMin);
  const weather = useGameStore((s) => s.weather);
  const morningHeadline = useGameStore((s) => s.morningHeadline);
  const talentToast = useGameStore((s) => s.talentToast);
  const togglePause = useGameStore((s) => s.togglePause);
  const skipToClose = useGameStore((s) => s.skipToClose);
  const buildMode = useGameStore((s) => s.buildMode);
  const setBuildMode = useGameStore((s) => s.setBuildMode);

  const mood = useGameStore((s) => Math.round(liveSatisfaction(s)));

  useEffect(() => {
    const persist = useGameStore.persist;
    const onReady = () => setHydrated(true);
    const unsub = persist.onFinishHydration(onReady);
    void persist.rehydrate();
    if (persist.hasHydrated()) queueMicrotask(onReady);
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

  useEffect(() => {
    if (!talentToast) return;
    const t = window.setTimeout(
      () => useGameStore.setState({ talentToast: null }),
      5000,
    );
    return () => window.clearTimeout(t);
  }, [talentToast]);

  const showStartHint =
    hydrated && phase === "day" && paused && dayIndex === 1;

  const weatherLabel =
    weather === "snow" ? "Snow" : weather === "thaw" ? "Thaw" : "Clear";

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
            Day {dayIndex}/{seasonLength} · {weekdayLabel(dayIndex)} ·{" "}
            {formatClock(clockMin)}
          </span>
          <span className="rounded-full border border-white/10 bg-black/40 px-3 py-2 font-medium backdrop-blur">
            {formatMoney(cash)}
          </span>
        </div>
        {phase === "day" && (
          <p className="pointer-events-none mx-auto max-w-lg truncate rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-center text-[11px] text-slate-200 backdrop-blur">
            {weatherLabel} · {morningHeadline}
          </p>
        )}
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

      {talentToast && phase === "day" && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center px-4">
          <p className="rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-xs text-slate-200 backdrop-blur">
            {talentToast}
          </p>
        </div>
      )}

      {phase === "day" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <OpsStrip
            avgQueue={avgQueue}
            snowQuality={snowQuality}
            snowDepth={snowDepth}
            mood={mood}
          />
          <footer className="pointer-events-auto flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/"
              className="flex min-h-11 items-center rounded-full border border-white/15 bg-black/50 px-4 text-xs font-medium text-slate-300 backdrop-blur"
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
        </div>
      )}

      <GuestsSheet open={guestsOpen} onClose={() => setGuestsOpen(false)} />
      <BuildSheet
        open={buildOpen}
        onClose={() => {
          setBuildOpen(false);
          setBuildMode(false);
        }}
      />
      <NightRecapSheet />
      <FounderPick />
      <WinterReviewSheet />
    </div>
  );
}

function OpsStrip({
  avgQueue,
  snowQuality,
  snowDepth,
  mood,
}: {
  avgQueue: number;
  snowQuality: number;
  snowDepth: number;
  mood: number;
}) {
  const moodIcon = mood >= 70 ? "😊" : mood >= 50 ? "🙂" : "😐";
  return (
    <div className="flex justify-center">
      <div
        className="pointer-events-auto flex w-full max-w-lg flex-wrap items-center justify-center gap-2 text-xs text-slate-200"
        role="status"
        aria-label="Mountain operations"
      >
        <span className="flex min-h-11 items-center whitespace-nowrap rounded-full border border-white/10 bg-black/55 px-3 py-2 backdrop-blur">
          Queue ~{avgQueue.toFixed(1)}m
        </span>
        <span className="flex min-h-11 items-center whitespace-nowrap rounded-full border border-white/10 bg-black/55 px-3 py-2 backdrop-blur">
          Cover {Math.round(snowQuality * 100)}% · depth{" "}
          {Math.round(snowDepth * 100)}%
        </span>
        <span className="flex min-h-11 items-center whitespace-nowrap rounded-full border border-white/10 bg-black/55 px-3 py-2 backdrop-blur">
          {moodIcon} Mood {mood}%
        </span>
      </div>
    </div>
  );
}
