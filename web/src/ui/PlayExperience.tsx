"use client";

import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatClock } from "@/game/sim";
import { useGameStore } from "@/game/store";
import { MountainScene } from "@/render/MountainScene";
import { GuestsSheet } from "@/ui/GuestsSheet";
import { NightRecapSheet } from "@/ui/NightRecapSheet";

export default function PlayExperience() {
  const [guestsOpen, setGuestsOpen] = useState(false);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const clockMin = useGameStore((s) => s.clockMin);
  const paused = useGameStore((s) => s.paused);
  const cash = useGameStore((s) => s.cash);
  const phase = useGameStore((s) => s.phase);
  const snowQuality = useGameStore((s) => s.snowQuality);
  const avgQueue = useGameStore((s) => s.dayStats.avgQueueMin);
  const togglePause = useGameStore((s) => s.togglePause);
  const skipToClose = useGameStore((s) => s.skipToClose);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        useGameStore.setState({ paused: true });
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0b1628] text-slate-100">
      <header
        className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
        style={{ pointerEvents: "none" }}
      >
        <div className="pointer-events-auto flex items-center justify-between gap-2 text-sm">
          <button
            type="button"
            onClick={togglePause}
            className="min-h-11 min-w-11 rounded-full border border-white/15 bg-black/40 px-3 text-xs font-semibold backdrop-blur"
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
        {phase === "day" && (
          <div className="pointer-events-auto flex justify-center gap-2 text-xs text-slate-300">
            <span className="rounded-full bg-black/35 px-2 py-1 backdrop-blur">
              Queue ~{avgQueue.toFixed(1)}m
            </span>
            <span className="rounded-full bg-black/35 px-2 py-1 backdrop-blur">
              Snow {Math.round(snowQuality * 100)}%
            </span>
          </div>
        )}
      </header>

      <Canvas
        className="touch-none"
        camera={{ position: [6, 5, 8], fov: 48 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <MountainScene />
      </Canvas>

      {phase === "day" && (
        <footer className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Link
            href="/"
            className="min-h-11 rounded-full border border-white/15 bg-black/50 px-4 text-xs font-medium text-slate-300 backdrop-blur"
          >
            ← Home
          </Link>
          <div className="flex gap-2">
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
      )}

      <GuestsSheet open={guestsOpen} onClose={() => setGuestsOpen(false)} />
      <NightRecapSheet />
    </div>
  );
}
