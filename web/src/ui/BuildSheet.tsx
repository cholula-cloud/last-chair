"use client";

import { formatMoney } from "@/game/format";
import {
  LIFT_PREVIEW_SLOTS,
  checkDescentValid,
  type LiftSlot,
} from "@/game/descent";
import { useGameStore } from "@/game/store";
import {
  BUILDING_COSTS,
  BUILDING_LABELS,
  LIFT_BUILD_COST,
  LIFT_LABELS,
  type BuildingId,
  type LiftType,
} from "@/game/types";

const BUILD_OPTIONS: BuildingId[] = ["lodge", "cafe", "shop", "snow_guns"];

export function BuildSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const buildMode = useGameStore((s) => s.buildMode);
  const selectedSlotIndex = useGameStore((s) => s.selectedSlotIndex);
  const selectedLiftType = useGameStore((s) => s.selectedLiftType);
  const lifts = useGameStore((s) => s.lifts);
  const buildings = useGameStore((s) => s.buildings);
  const cash = useGameStore((s) => s.cash);
  const setBuildMode = useGameStore((s) => s.setBuildMode);
  const setSelectedSlotIndex = useGameStore((s) => s.setSelectedSlotIndex);
  const setSelectedLiftType = useGameStore((s) => s.setSelectedLiftType);
  const confirmLift = useGameStore((s) => s.confirmLift);
  const buyBuilding = useGameStore((s) => s.buyBuilding);

  if (!open) return null;

  const slot = LIFT_PREVIEW_SLOTS[selectedSlotIndex] ?? LIFT_PREVIEW_SLOTS[0];
  const valid = slot ? checkDescentValid(slot) : false;
  const liftCost =
    lifts.some((l) => l.confirmed && l.type === selectedLiftType)
      ? 400
      : LIFT_BUILD_COST[selectedLiftType];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0f1d33]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Build</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 min-w-11 rounded-full text-slate-400"
          aria-label="Close build sheet"
        >
          ✕
        </button>
      </div>

      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        Lift type
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["surface", "chair"] as LiftType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSelectedLiftType(t)}
            className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${
              selectedLiftType === t
                ? "border-orange-400 bg-orange-500/20 text-white"
                : "border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            {LIFT_LABELS[t]}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-slate-300">
        Pick a lift top — green means skiers can reach the base.
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
        {LIFT_PREVIEW_SLOTS.map((s, i) => (
          <SlotButton
            key={`${s.x}-${s.z}`}
            slot={s}
            selected={i === selectedSlotIndex}
            onPick={() => setSelectedSlotIndex(i)}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={!valid || cash < liftCost}
        onClick={() => {
          confirmLift();
          onClose();
        }}
        className="mt-5 flex h-14 w-full items-center justify-center rounded-2xl bg-[#e85d26] text-base font-semibold text-white disabled:opacity-40 active:scale-[0.98]"
      >
        Place {LIFT_LABELS[selectedLiftType]} · {formatMoney(liftCost)}
      </button>

      <p className="mt-5 text-xs font-medium uppercase tracking-wider text-slate-400">
        Village & snow
      </p>
      <div className="mt-2 space-y-2">
        {BUILD_OPTIONS.map((id) => {
          const owned = buildings.includes(id);
          const cost = BUILDING_COSTS[id];
          return (
            <button
              key={id}
              type="button"
              disabled={owned || cash < cost}
              onClick={() => buyBuilding(id)}
              className="flex min-h-12 w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200 disabled:opacity-50"
            >
              <span>
                {BUILDING_LABELS[id]}
                {owned ? " · built" : ""}
              </span>
              <span className="font-semibold">{owned ? "✓" : formatMoney(cost)}</span>
            </button>
          );
        })}
      </div>

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
  slot: LiftSlot;
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
      <span className="block text-sm">{slot.label}</span>
      <span className="mt-0.5 block font-normal text-slate-400">
        {valid ? "Valid run" : "No run"}
      </span>
    </button>
  );
}
