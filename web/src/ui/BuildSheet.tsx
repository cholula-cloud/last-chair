"use client";

import { formatMoney } from "@/game/format";
import { checkPlacement } from "@/game/rules";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import {
  BUILDING_COSTS,
  BUILDING_LABELS,
  LIFT_LABELS,
  type BuildingId,
  type LiftType,
} from "@/game/types";
import { startPlacement } from "@/ui/placementDraft";
import { CheckIcon, LiftIcon } from "@/ui/kit/icons";
import { Sheet } from "@/ui/kit/Sheet";
import { TrailsPanel } from "@/ui/TrailsPanel";
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
  onStartPlacement,
}: {
  open: boolean;
  onClose: () => void;
  onStartPlacement: () => void;
}) {
  const selectedLiftType = useGameStore((s) => s.selectedLiftType);
  const lifts = useGameStore((s) => s.lifts);
  const buildings = useGameStore((s) => s.buildings);
  const cash = useGameStore((s) => s.cash);
  const setSelectedLiftType = useGameStore((s) => s.setSelectedLiftType);
  const buyBuilding = useGameStore((s) => s.buyBuilding);

  if (!open) return null;

  const atMax = checkPlacement({ lifts, cash }, selectedLiftType, {
    bottom: TERRAIN.base,
    top: TERRAIN.toWorld({ x: 0.8, z: 0.6 }),
  });

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
      dataMarker="build-sheet"
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
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-[0.9rem] font-bold text-ink-soft">
            Place a new lift by tapping the hill. Skiers need a run from the top
            back to the base.
          </p>

          <PrimaryButton
            className="mt-4 min-h-11"
            disabled={atMax.ok === false && atMax.reason === "max_lifts"}
            onClick={() => {
              startPlacement(selectedLiftType);
              onStartPlacement();
            }}
          >
            Place on the hill
          </PrimaryButton>
          {atMax.ok === false && atMax.reason === "max_lifts" && (
            <p className="mt-2 text-center text-[0.85rem] font-extrabold text-barn-deep">
              The hill already has the maximum number of lifts.
            </p>
          )}
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
        </div>
        <TrailsPanel />
      </div>
    </Sheet>
  );
}