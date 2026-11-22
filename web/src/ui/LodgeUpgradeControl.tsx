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

  const wrap = variant === "inspector" ? (className ?? "mt-3") : "mt-2";
  const padGain = next ? LODGE_TIERS[next].pads - LODGE_TIERS[tier].pads : 0;
  const arrivalGain = next ? LODGE_TIERS[next].maxArrivals - LODGE_TIERS[tier].maxArrivals : 0;
  const seatScale = next ? `×${LODGE_TIERS[next].seatMultiplier}` : "";

  return (
    <div className={wrap} data-lodge-upgrade data-variant={variant}>
      {construction ? (
        <p role="status" className={variant === "compact" ? "text-sm font-bold" : "font-bold"}>
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
                { label: "Total cost", value: formatMoney(LODGE_TIERS[next].cost) },
                {
                  label: "Payment",
                  value: `${formatMoney(payment.deposit)} now, ${formatMoney(payment.first)} each of the next two nights`,
                },
                { label: "Construction", value: "Two nights" },
                { label: "Daily skier cap", value: `~${LODGE_TIERS[next].maxArrivals}` },
                { label: "Hospitality seating", value: `All seated venues scale ${seatScale}` },
                { label: "Attachment pads", value: String(LODGE_TIERS[next].pads) },
                ...(unlocks.length ? [{ label: "Unlocks", value: unlocks.join(", ") }] : []),
              ]}
              problem={
                cash < payment.deposit
                  ? "Wallet says no. Close out the day, then come back with the deposit."
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
            <div className="space-y-2">
              <p className="text-sm font-extrabold">{LODGE_TIERS[next].label}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="chip px-2 py-0.5 text-xs font-extrabold [--lift:2px]">
                  {formatMoney(payment.deposit)} now, {formatMoney(payment.first)} x2 nights
                </span>
                {(arrivalGain > 0 || padGain > 0) && (
                  <span className="chip px-2 py-0.5 text-xs font-extrabold [--lift:2px]">
                    +{arrivalGain} skiers/day, seats {seatScale}
                    {padGain > 0 ? `, +${padGain} annex ${padGain === 1 ? "pad" : "pads"}` : ""}
                  </span>
                )}
                {unlocks.length > 0 && (
                  <span className="chip px-2 py-0.5 text-xs font-bold [--lift:2px]">
                    {unlocks.join(", ")}
                  </span>
                )}
              </div>
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