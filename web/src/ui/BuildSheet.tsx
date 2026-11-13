"use client";

import {
  LIFT_PREVIEW_SLOTS,
  checkDescentValid,
  type LiftAnchor,
} from "@/game/descent";
import { useGameStore } from "@/game/store";

export function BuildSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const buildMode = useGameStore((s) => s.buildMode);
  const liftAnchor = useGameStore((s) => s.liftAnchor);
  const liftConfirmed = useGameStore((s) => s.liftConfirmed);
  const setBuildMode = useGameStore((s) => s.setBuildMode);
  const setLiftAnchor = useGameStore((s) => s.setLiftAnchor);
  const confirmLift = useGameStore((s) => s.confirmLift);

  if (!open) return null;

  const valid = checkDescentValid(liftAnchor);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 max-h-[75vh] rounded-t-3xl border border-white/10 bg-[#0f1d33]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Build lift</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 min-w-11 rounded-full text-slate-400"
          aria-label="Close build sheet"
        >
          ✕
        </button>
      </div>

      <p className="text-sm text-slate-300">
        Pick a lift top — green means skiers can reach the base. Red blocks
        placement.
      </p>

      <div
        className={`mt-3 rounded-xl border px-3 py-3 text-sm font-medium ${
          valid
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
            : "border-rose-500/40 bg-rose-500/10 text-rose-200"
        }`}
      >
        {valid
          ? "Valid descent — trail reaches lodge zone."
          : "Invalid — no viable run to base from this top."}
      </div>

      <p className="mt-4 text-xs font-medium uppercase tracking-wider text-slate-400">
        Lift top (tap)
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {LIFT_PREVIEW_SLOTS.map((slot) => (
          <SlotButton
            key={`${slot.x}-${slot.z}`}
            slot={slot}
            selected={
              slot.x === liftAnchor.x && slot.z === liftAnchor.z
            }
            onPick={() => setLiftAnchor(slot)}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={!valid}
        onClick={() => {
          confirmLift();
          onClose();
        }}
        className="mt-5 flex h-14 w-full items-center justify-center rounded-2xl bg-[#e85d26] text-base font-semibold text-white disabled:opacity-40 active:scale-[0.98]"
      >
        {liftConfirmed ? "Update lift" : "Place lift"}
      </button>

      <label className="mt-4 flex min-h-11 items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={buildMode}
          onChange={(e) => setBuildMode(e.target.checked)}
          className="size-5 rounded border-white/20"
        />
        Show placement preview on mountain
      </label>
    </div>
  );
}

function SlotButton({
  slot,
  selected,
  onPick,
}: {
  slot: LiftAnchor;
  selected: boolean;
  onPick: () => void;
}) {
  const valid = checkDescentValid(slot);
  return (
    <button
      type="button"
      onClick={onPick}
      className={`min-h-14 rounded-xl border px-2 py-2 text-xs font-semibold ${
        selected
          ? valid
            ? "border-emerald-400 bg-emerald-500/20 text-white"
            : "border-rose-400 bg-rose-500/20 text-white"
          : "border-white/10 bg-white/5 text-slate-300"
      }`}
    >
      {valid ? "OK" : "✕"} · ({slot.x.toFixed(1)}, {slot.z.toFixed(1)})
    </button>
  );
}
