"use client";

import { formatMoney } from "@/game/format";
import {
  LIFT_PREVIEW_SLOTS,
  checkDescentValid,
  type LiftSlot,
} from "@/game/descent";
import { isSlotInUse } from "@/game/rules";
import { useGameStore } from "@/game/store";
import {
  BUILDING_COSTS,
  BUILDING_LABELS,
  LIFT_BUILD_COST,
  LIFT_LABELS,
  type BuildingId,
  type LiftType,
} from "@/game/types";
import { CheckIcon, LiftIcon } from "@/ui/kit/icons";
import { PaperSheet } from "@/ui/kit/PaperSheet";
import { PlateHeading, PriceTag, PrimaryButton } from "@/ui/kit/parts";

const BUILD_OPTIONS: BuildingId[] = ["lodge", "cafe", "shop", "snow_guns"];

const BUILDING_NOTES: Record<BuildingId, string> = {
  warming_hut: "Somewhere to thaw out",
  lodge: "Bigger base, warmer guests",
  cafe: "Hot food between laps",
  shop: "Wax, gloves, souvenirs",
  snow_guns: "Make snow on dry weeks",
};

const LIFT_NOTES: Record<LiftType, string> = {
  surface: "T-bar up the hill",
  chair: "Seats two, gentler ride",
};

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
  const inUse = slot ? isSlotInUse(lifts, slot, selectedLiftType) : false;
  const valid = slot ? checkDescentValid(slot) : false;
  const liftCostFor = (t: LiftType) =>
    lifts.some((l) => l.confirmed && l.type === t) ? 400 : LIFT_BUILD_COST[t];
  const liftCost = liftCostFor(selectedLiftType);
  const short = liftCost - cash;

  return (
    <PaperSheet
      title="Build"
      subtitle={
        <>
          Cash on hand{" "}
          <span className="num font-semibold text-pine">
            {formatMoney(cash)}
          </span>
        </>
      }
      onClose={onClose}
      closeLabel="Close build sheet"
      wide
    >
      <div className="short:grid short:grid-cols-2 short:gap-6">
        <div>
          <PlateHeading>Lift</PlateHeading>
          <div className="grid grid-cols-2 gap-2">
            {(["surface", "chair"] as LiftType[]).map((t) => {
              const on = selectedLiftType === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelectedLiftType(t)}
                  className={`press flex min-h-[76px] flex-col items-start justify-between gap-1.5 rounded-xl border-2 p-2.5 text-left ${
                    on
                      ? "border-amber bg-[#fff6ec]"
                      : "border-ink/15 bg-paper-deep/60"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[0.95rem] font-bold text-ink">
                    <LiftIcon size={18} />
                    {LIFT_LABELS[t]}
                  </span>
                  <span className="text-[0.78rem] text-ink-soft">
                    {LIFT_NOTES[t]}
                  </span>
                  <PriceTag>
                    {liftCostFor(t) === 0
                      ? "Free"
                      : formatMoney(liftCostFor(t))}
                  </PriceTag>
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-[0.88rem] text-ink-soft">
            Pick where the lift unloads. Skiers need a run from there back to
            the base.
          </p>
          <div
            role="group"
            aria-label="Lift top"
            className="mt-2 grid grid-cols-3 gap-2"
          >
            {LIFT_PREVIEW_SLOTS.map((s, i) => (
              <SlotButton
                key={`${s.x}-${s.z}`}
                slot={s}
                selected={i === selectedSlotIndex}
                inUse={isSlotInUse(lifts, s, selectedLiftType)}
                onPick={() => setSelectedSlotIndex(i)}
              />
            ))}
          </div>

          <PrimaryButton
            className="mt-3"
            disabled={!valid || inUse || cash < liftCost}
            aria-describedby="lift-reason"
            onClick={() => {
              confirmLift();
              onClose();
            }}
          >
            Place {LIFT_LABELS[selectedLiftType]} · {formatMoney(liftCost)}
          </PrimaryButton>
          <p
            id="lift-reason"
            className={`mt-1.5 text-center text-[0.8rem] font-medium ${valid && !inUse && short <= 0 ? "text-pine" : "text-barn"}`}
          >
            {inUse
              ? `${slot?.label} already has a lift. Pick another top.`
              : !valid
              ? "No run from this top. Pick another."
              : short > 0
                ? `Need ${formatMoney(short)} more.`
                : "Run reaches the base. Ready to place."}
          </p>
        </div>
        <div>
          <PlateHeading>Village &amp; snow</PlateHeading>
          <ul className="space-y-2">
            {BUILD_OPTIONS.map((id) => {
              const owned = buildings.includes(id);
              const cost = BUILDING_COSTS[id];
              const need = cost - cash;
              return (
                <li key={id}>
                  <button
                    type="button"
                    disabled={owned || need > 0}
                    onClick={() => buyBuilding(id)}
                    className="press flex min-h-[60px] w-full items-center gap-3 rounded-xl border border-ink/15 bg-white/40 px-3 py-2 text-left enabled:hover:border-ink/30 disabled:bg-paper-deep/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.95rem] font-bold text-ink">
                        {BUILDING_LABELS[id]}
                      </span>
                      <span
                        className={`block text-[0.78rem] ${owned ? "font-semibold text-pine" : need > 0 ? "font-medium text-barn" : "text-ink-soft"}`}
                      >
                        {owned
                          ? "Built"
                          : need > 0
                            ? `Need ${formatMoney(need)} more`
                            : BUILDING_NOTES[id]}
                      </span>
                    </span>
                    {owned ? (
                      <span className="flex size-8 items-center justify-center rounded-full bg-pine text-paper">
                        <CheckIcon size={18} />
                      </span>
                    ) : (
                      <PriceTag muted={need > 0}>{formatMoney(cost)}</PriceTag>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <label className="mt-4 flex min-h-11 items-center gap-3 text-[0.9rem] text-ink">
            <input
              type="checkbox"
              checked={buildMode}
              onChange={(e) => setBuildMode(e.target.checked)}
              className="size-5 accent-[var(--pine)]"
            />
            Show placement preview on the mountain
          </label>
        </div>
      </div>
    </PaperSheet>
  );
}

function SlotButton({
  slot,
  selected,
  inUse,
  onPick,
}: {
  slot: LiftSlot;
  selected: boolean;
  inUse: boolean;
  onPick: () => void;
}) {
  const valid = checkDescentValid(slot);
  const ring = inUse
    ? "border-ink/10 bg-paper-deep/40 opacity-70"
    : selected
    ? valid
      ? "border-pine bg-[#e6f0e9]"
      : "border-barn bg-[#f8e6e1]"
    : "border-ink/15 bg-paper-deep/60";
  return (
    <button
      type="button"
      aria-pressed={selected && !inUse}
      disabled={inUse}
      onClick={onPick}
      className={`press flex min-h-14 flex-col items-center justify-center rounded-xl border-2 px-2 py-1.5 ${ring}`}
    >
      <span className="text-[0.95rem] font-bold text-ink">{slot.label}</span>
      <span
        className={`text-[0.75rem] font-semibold ${inUse ? "text-ink-soft" : valid ? "text-pine" : "text-barn"}`}
      >
        {inUse ? "In use" : valid ? "Valid run" : "No run"}
      </span>
    </button>
  );
}
