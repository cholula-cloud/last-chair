"use client";

import type { ReactNode } from "react";
import { formatMoney } from "@/game/format";
import { nextTalentName } from "@/game/sim";
import { storyBeatCopy, useGameStore } from "@/game/store";
import {
  FARE_LABELS,
  SNOW_LABELS,
  type FarePreset,
  type SnowPreset,
} from "@/game/types";

const fareOptions: FarePreset[] = ["cheap", "balanced", "expensive"];
const snowOptions: SnowPreset[] = ["minimal", "mid", "high"];

function satisfactionEmoji(score: number): string {
  if (score >= 75) return "😊";
  if (score >= 55) return "🙂";
  if (score >= 40) return "😐";
  return "😠";
}

export function NightRecapSheet() {
  const phase = useGameStore((s) => s.phase);
  const recap = useGameStore((s) => s.nightRecap);
  const pendingFare = useGameStore((s) => s.pendingFare);
  const pendingSnow = useGameStore((s) => s.pendingSnow);
  const pendingBeat = useGameStore((s) => s.pendingBeat);
  const beatAcknowledged = useGameStore((s) => s.beatAcknowledged);
  const setPendingFare = useGameStore((s) => s.setPendingFare);
  const setPendingSnow = useGameStore((s) => s.setPendingSnow);
  const acknowledgeBeat = useGameStore((s) => s.acknowledgeBeat);
  const sleep = useGameStore((s) => s.sleep);
  const talentsOwned = useGameStore((s) => s.talentsOwned);
  const nextTalent = nextTalentName(talentsOwned);

  if (phase !== "night" || !recap) return null;

  const beat = storyBeatCopy(pendingBeat);
  const canSleep = !pendingBeat || beatAcknowledged;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0f1d33] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl"
      role="dialog"
      aria-label="Night recap"
    >
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
      <h2 className="text-lg font-semibold text-white">Closing recap</h2>
      <p className="mt-2 text-sm text-slate-300">
        {recap.arrivals} skiers · {satisfactionEmoji(recap.satisfaction)}{" "}
        {Math.round(recap.satisfaction)}% happy ·{" "}
        <span
          className={
            recap.cashDelta >= 0 ? "text-emerald-400" : "text-rose-400"
          }
        >
          {formatMoney(recap.cashDelta, { signed: true })}
        </span>
      </p>
      <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-orange-200">
        {recap.problem}
      </p>

      {beat && !beatAcknowledged && (
        <div className="mt-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-3 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-sky-300">
            Mountain Radio · {beat.title}
          </p>
          <p className="mt-2 text-sm text-slate-100">{beat.radio}</p>
          <button
            type="button"
            onClick={acknowledgeBeat}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-sky-500/30 text-sm font-semibold text-white"
          >
            Got it
          </button>
        </div>
      )}

      <div className="mt-5 space-y-4">
        <PresetBlock title="Fare">
          <PresetRow
            options={fareOptions}
            labels={FARE_LABELS}
            value={pendingFare}
            onPick={setPendingFare}
          />
        </PresetBlock>
        <PresetBlock title="Snow & service">
          <PresetRow
            options={snowOptions}
            labels={SNOW_LABELS}
            value={pendingSnow}
            onPick={setPendingSnow}
          />
        </PresetBlock>
      </div>

      {nextTalent && (
        <p className="mt-4 text-xs text-slate-400">
          Tomorrow the crew learns: <span className="text-slate-200">{nextTalent}</span>
        </p>
      )}

      {!canSleep && (
        <p id="sleep-hint" className="mt-6 text-center text-xs text-sky-200">
          Read the radio message above, then tap Got it.
        </p>
      )}
      <button
        type="button"
        disabled={!canSleep}
        aria-describedby={canSleep ? undefined : "sleep-hint"}
        onClick={sleep}
        className={`${canSleep ? "mt-6" : "mt-2"} flex h-14 w-full items-center justify-center rounded-2xl bg-[#e85d26] text-base font-semibold text-white disabled:opacity-40 active:scale-[0.98]`}
      >
        Sleep — next morning
      </button>
    </div>
  );
}

function PresetBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
        {title}
      </p>
      {children}
    </div>
  );
}

function PresetRow<T extends string>({
  options,
  labels,
  value,
  onPick,
}: {
  options: T[];
  labels: Record<T, string>;
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onPick(opt)}
          className={`min-h-14 rounded-xl border px-2 py-2 text-sm font-medium transition ${
            value === opt
              ? "border-orange-400 bg-orange-500/20 text-white"
              : "border-white/10 bg-white/5 text-slate-300"
          }`}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}
