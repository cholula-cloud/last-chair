"use client";

import { FOUNDERS } from "@/game/content";
import { useGameStore } from "@/game/store";

export function FounderPick() {
  const phase = useGameStore((s) => s.phase);
  const pickFounder = useGameStore((s) => s.pickFounder);

  if (phase !== "setup") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0b1628]/90 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0f1d33] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5 sm:rounded-3xl">
        <h1 className="text-xl font-semibold text-white">Dutch Hill · Winter 1</h1>
        <p className="mt-2 text-sm text-slate-300">
          Pick a founder. Modifiers apply for the whole season — then open the
          hill.
        </p>
        <ul className="mt-4 space-y-2">
          {FOUNDERS.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => pickFounder(f.id)}
                className="flex w-full flex-col items-start rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left active:scale-[0.99]"
              >
                <span className="text-sm font-semibold text-white">
                  {f.name}
                  <span className="ml-2 font-normal text-slate-400">
                    {f.title}
                  </span>
                </span>
                <span className="mt-1 text-xs text-slate-300">{f.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
