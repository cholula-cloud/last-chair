"use client";

import { formatMoney } from "@/game/format";
import { useGameStore } from "@/game/store";

export function WinterReviewSheet() {
  const phase = useGameStore((s) => s.phase);
  const cash = useGameStore((s) => s.cash);
  const reputation = useGameStore((s) => s.reputation);
  const completedBeats = useGameStore((s) => s.completedBeats);
  const talentsOwned = useGameStore((s) => s.talentsOwned);
  const finishWinterReview = useGameStore((s) => s.finishWinterReview);
  const startNewSeason = useGameStore((s) => s.startNewSeason);

  if (phase !== "winter_review" && phase !== "mountain2") return null;

  if (phase === "mountain2") {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
        <div className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#0f1d33] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:rounded-3xl">
          <h2 className="text-lg font-semibold text-white">Tenney Mountain, NH</h2>
          <p className="mt-2 text-sm text-slate-300">
            Mountain 2 stub — caretaker idle income and full career map land in
            P2. Dutch Hill stays saved locally.
          </p>
          <button
            type="button"
            onClick={startNewSeason}
            className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-[#e85d26] text-base font-semibold text-white"
          >
            Replay Dutch Hill winter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#0f1d33] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:rounded-3xl">
        <h2 className="text-lg font-semibold text-white">Winter review</h2>
        <p className="mt-2 text-sm text-slate-300">
          You held one more winter in the sticks. Cash {formatMoney(cash)} · Rep {reputation} · Beats{" "}
          {completedBeats.length}/6 · Talents {talentsOwned.length}
        </p>
        <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm text-orange-100">
          Career pin unlocked: <strong>Tenney Mountain, NH</strong>
        </p>
        <button
          type="button"
          onClick={finishWinterReview}
          className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-[#e85d26] text-base font-semibold text-white"
        >
          Continue to mountain 2
        </button>
      </div>
    </div>
  );
}
