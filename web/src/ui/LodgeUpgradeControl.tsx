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

  return (
    <div className={wrap} data-lodge-upgrade data-variant={variant}>
      {construction ? (
        <p role="status" className={variant === "compact" ? "text-sm font-bold" : "font-bold"}>
          Tier {construction.toTier} is going up. {construction.nightsRemaining}{" "}
          {construction.nightsRemaining === 1 ? "night" : "nights"} to go.
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
            <PrimaryButton className="min-h-11" onClick={() => setReview(true)}>
              Review Tier {next} upgrade
            </PrimaryButton>
          )}
        </>
      )}
    </div>
  );
}