"use client";

import { useState } from "react";
import { LODGE_TIERS, lodgeTierUnlocks, nextLodgeTier } from "@/game/base";
import { constructionDraw } from "@/game/economy";
import { formatMoney } from "@/game/format";
import { useGameStore } from "@/game/store";
import { BuildImpactCard } from "@/ui/BuildImpactCard";
import { buildConfirmed } from "@/ui/feel";
import { PrimaryButton } from "@/ui/kit/parts";

export function LodgeUpgradeControl({
  variant,
  className,
}: {
  variant: "compact" | "inspector";
  className?: string;
}) {
  const tier = useGameStore((s) => s.lodgeTier);
  const construction = useGameStore((s) => s.lodgeUpgrade);
  const cash = useGameStore((s) => s.cash);
  const upgrade = useGameStore((s) => s.beginLodgeUpgrade);
  const [review, setReview] = useState(false);
  const next = nextLodgeTier(tier);
  const unlocks = next ? lodgeTierUnlocks(next) : [];
  const payment = next ? constructionDraw(LODGE_TIERS[next].cost) : null;

  if (!construction && (!next || !payment)) return null;

  const wrap = variant === "inspector" ? (className ?? "mt-3") : "";
  const padGain = next ? LODGE_TIERS[next].pads - LODGE_TIERS[tier].pads : 0;
  const arrivalGain = next ? LODGE_TIERS[next].maxArrivals - LODGE_TIERS[tier].maxArrivals : 0;
  const seatScale = next ? `×${LODGE_TIERS[next].seatMultiplier}` : "";

  return (
    <div className={wrap} data-lodge-upgrade data-variant={variant}>
      {construction ? (
        <p role="status" className={variant === "compact" ? "well-white px-3 py-2.5 text-sm font-bold" : "font-bold"}>
          Tier {construction.toTier} underway.{" "}
          {construction.nightsRemaining}{" "}
          {construction.nightsRemaining === 1 ? "night" : "nights"} left.
        </p>
      ) : next && payment && (
        <>
          {review ? (
            <BuildImpactCard
              title={`Upgrade to ${LODGE_TIERS[next].label}`}
              facts={[
                { label: "Cost", value: formatMoney(LODGE_TIERS[next].cost) },
                { label: "Payment", value: "Paid upfront" },
                { label: "Construction", value: "Two nights" },
                { label: "Daily skier cap", value: `~${LODGE_TIERS[next].maxArrivals}` },
                { label: "Hospitality seating", value: `All seated venues scale ${seatScale}` },
                { label: "Attachment pads", value: String(LODGE_TIERS[next].pads) },
                ...(unlocks.length ? [{ label: "Unlocks", value: unlocks.join(", ") }] : []),
              ]}
              problem={
                cash < LODGE_TIERS[next].cost
                  ? "Wallet says no. Close out the day, then check your balance."
                  : null
              }
              confirmLabel="Start lodge upgrade"
              onCancel={() => setReview(false)}
              onConfirm={() => {
                upgrade();
                if (useGameStore.getState().lodgeUpgrade) {
                  buildConfirmed(`Lodge Tier ${next} is under way.`);
                }
                setReview(false);
              }}
            />
          ) : (
            <div className="well-white space-y-2 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="display text-[1.1rem] text-ink">{LODGE_TIERS[next].label}</p>
                <span className="well bg-gold px-2 py-0.5 text-xs font-extrabold tabular-nums">
                  {formatMoney(LODGE_TIERS[next].cost)}
                </span>
              </div>
              {(arrivalGain > 0 || padGain > 0 || unlocks.length > 0) && (
                <p className="text-xs font-bold leading-snug text-ink-soft">
                  {arrivalGain > 0 || padGain > 0
                    ? `+${arrivalGain} skiers/day, seats ${seatScale}${padGain > 0 ? `, +${padGain} annex ${padGain === 1 ? "pad" : "pads"}` : ""}`
                    : ""}
                  {unlocks.length > 0 ? `${arrivalGain > 0 || padGain > 0 ? ". Unlocks " : "Unlocks "}${unlocks.join(", ")}.` : ""}
                </p>
              )}
              <PrimaryButton className="min-h-11" onClick={() => setReview(true)}>
                Review Tier {next} upgrade
              </PrimaryButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}