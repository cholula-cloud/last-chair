"use client";

import { formatFeet, formatMoney } from "@/game/format";
import { liftLength, liftVertical, placementReason } from "@/game/descent";
import { checkPlacement } from "@/game/rules";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { CheckIcon, LiftIcon } from "@/ui/kit/icons";
import { PrimaryButton } from "@/ui/kit/parts";
import {
  cancelPlacement,
  finishPlacement,
  usePlacementDraft,
} from "@/ui/placementDraft";
import { LIFT_LABELS, type LiftType } from "@/game/types";

const LIFT_NOTES: Record<LiftType, string> = {
  surface: "T-bar up the hill",
  chair: "Seats two, gentler ride",
};

/** Bottom-third controls while placing a lift on the hill. */
export function PlacementBar() {
  const active = usePlacementDraft((s) => s.active);
  const step = usePlacementDraft((s) => s.step);
  const draftType = usePlacementDraft((s) => s.type);
  const top = usePlacementDraft((s) => s.top);
  const bottom = usePlacementDraft((s) => s.bottom);
  const lifts = useGameStore((s) => s.lifts);
  const cash = useGameStore((s) => s.cash);
  const placeLift = useGameStore((s) => s.placeLift);
  const setSelectedLiftType = useGameStore((s) => s.setSelectedLiftType);

  if (!active) return null;

  const line = top ? { bottom: bottom ?? TERRAIN.base, top } : null;
  const check = line ? checkPlacement({ lifts, cash }, draftType, line) : null;
  const lengthFt = line
    ? formatFeet(liftLength(line), TERRAIN.horizontalFeetPerUnit)
    : null;
  const vertFt = line
    ? formatFeet(liftVertical(line), TERRAIN.feetPerUnit)
    : null;

  const hint =
    step === "bottom"
      ? "Tap the lift bottom inside the base area"
      : top
        ? "Tap again to move the top, or place when ready"
        : "Tap where the lift should unload";

  const reasonText =
    check && !check.ok
      ? placementReason(check.reason, check)
      : check?.ok
        ? "Run reaches the base. Ready to place."
        : null;

  const canPlace = check?.ok === true;

  return (
    <div className="pointer-events-auto w-full max-w-[440px] px-1">
      <div className="panel px-3.5 pb-4 pt-3.5 shadow-md">
        <p className="text-center text-[0.92rem] font-extrabold text-ink" aria-live="polite">
          {hint}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {(["surface", "chair"] as LiftType[]).map((t) => {
            const on = draftType === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setSelectedLiftType(t);
                  usePlacementDraft.setState({ type: t });
                }}
                className="key press flex min-h-11 flex-col items-start gap-0.5 p-2.5 text-left"
              >
                <span className="flex items-center gap-1.5 text-[0.95rem] font-extrabold">
                  <LiftIcon size={18} />
                  {LIFT_LABELS[t]}
                  {on && <CheckIcon size={14} />}
                </span>
                <span data-muted className="text-[0.78rem] font-bold leading-tight">
                  {LIFT_NOTES[t]}
                </span>
              </button>
            );
          })}
        </div>

        {line && lengthFt && vertFt && (
          <p className="mt-2.5 text-center text-[0.85rem] font-extrabold text-ink-soft">
            {lengthFt} long, {vertFt} vertical
          </p>
        )}

        {reasonText && (
          <p
            className={`mt-2 text-center text-[0.85rem] font-extrabold ${
              check?.ok ? "text-sign-green" : "text-barn-deep"
            }`}
          >
            {reasonText}
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => cancelPlacement()}
            className="key press min-h-11 px-3 text-[0.9rem] font-extrabold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => usePlacementDraft.setState({ step: "bottom" })}
            className="key press min-h-11 px-3 text-[0.9rem] font-extrabold"
          >
            Move bottom
          </button>
        </div>

        <PrimaryButton
          className="mt-2.5 min-h-11"
          disabled={!canPlace}
          onClick={() => {
            if (!line || !check?.ok) return;
            placeLift({ type: draftType, bottom: line.bottom, top: line.top });
            finishPlacement();
          }}
        >
          Place {LIFT_LABELS[draftType]} for {formatMoney(check?.ok ? check.cost : 0)}
        </PrimaryButton>
      </div>
    </div>
  );
}