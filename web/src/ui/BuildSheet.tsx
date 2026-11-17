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
import { Sheet } from "@/ui/kit/Sheet";
import { PriceTag, PrimaryButton, SectionHeading } from "@/ui/kit/parts";

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
    <Sheet
      title="Build"
      subtitle={
        <>
          Cash on hand{" "}
          <span className="display text-[1.05rem] tabular-nums">
            {formatMoney(cash)}
          </span>
        </>
      }
      onClose={onClose}
      closeLabel="Close build sheet"
      wide
    >
      <div className="short:grid short:grid-cols-2 short:gap-4">
        <div className="panel px-3.5 pb-4 pt-3.5 short:self-start">
          <SectionHeading>Lift</SectionHeading>
          <div className="grid grid-cols-2 gap-2.5">
            {(["surface", "chair"] as LiftType[]).map((t) => {
              const on = selectedLiftType === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelectedLiftType(t)}
                  className="key press flex min-h-[92px] flex-col items-start justify-between gap-1.5 p-2.5 text-left"
                >
                  <span className="flex items-center gap-1.5 text-[1rem] font-extrabold">
                    <LiftIcon size={20} />
                    {LIFT_LABELS[t]}
                    {on && <CheckIcon size={16} />}
                  </span>
                  <span data-muted className="text-[0.8rem] font-bold leading-tight">
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

          <p className="mt-4 text-[0.9rem] font-bold text-ink-soft">
            Pick where the lift unloads. Skiers need a run from there back to
            the base.
          </p>
          <div
            role="group"
            aria-label="Lift top"
            className="mt-2.5 grid grid-cols-3 gap-2.5"
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
            className="mt-4"
            disabled={!valid || inUse || cash < liftCost}
            aria-describedby="lift-reason"
            onClick={() => {
              confirmLift();
              onClose();
            }}
          >
            Place {LIFT_LABELS[selectedLiftType]} for {formatMoney(liftCost)}
          </PrimaryButton>
          <p
            id="lift-reason"
            className={`mt-2.5 text-center text-[0.85rem] font-extrabold ${valid && !inUse && short <= 0 ? "text-sign-green" : "text-barn-deep"}`}
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
        <div className="mt-4 panel px-3.5 pb-4 pt-3.5 short:mt-0 short:self-start">
          <SectionHeading>Village &amp; snow</SectionHeading>
          <ul className="space-y-2.5">
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
                    className="key press flex min-h-[60px] w-full items-center gap-3 px-3 py-2 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[1rem] font-extrabold">
                        {BUILDING_LABELS[id]}
                      </span>
                      <span
                        className={`block text-[0.82rem] ${owned ? "font-extrabold text-sign-green" : need > 0 ? "font-extrabold text-barn-deep" : "font-bold text-ink-soft"}`}
                      >
                        {owned
                          ? "Built"
                          : need > 0
                            ? `Need ${formatMoney(need)} more`
                            : BUILDING_NOTES[id]}
                      </span>
                    </span>
                    {owned ? (
                      <span className="flex size-8 items-center justify-center rounded-full border-2 border-ink bg-sign-green text-white">
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

          <label className="mt-4 flex min-h-11 items-center gap-3 text-[0.92rem] font-bold">
            <input
              type="checkbox"
              checked={buildMode}
              onChange={(e) => setBuildMode(e.target.checked)}
              className="check"
            />
            Show placement preview on the mountain
          </label>
        </div>
      </div>
    </Sheet>
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
  return (
    <button
      type="button"
      aria-pressed={selected && !inUse}
      disabled={inUse}
      onClick={onPick}
      data-tone={valid ? undefined : "bad"}
      className="key press flex min-h-14 flex-col items-center justify-center px-2 py-1.5"
    >
      <span className="flex items-center gap-1 text-[1rem] font-extrabold">
        {slot.label}
        {selected && !inUse && <CheckIcon size={14} />}
      </span>
      <span
        data-muted
        className={`text-[0.78rem] font-extrabold ${(selected && !inUse) || inUse ? "" : valid ? "!text-sign-green" : "!text-barn-deep"}`}
      >
        {inUse ? "In use" : valid ? "Valid run" : "No run"}
      </span>
    </button>
  );
}
