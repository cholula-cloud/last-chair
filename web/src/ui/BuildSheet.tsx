"use client";

import { CoachTip } from "./CoachTip";
import { useState } from "react";
import { ASSET_CATALOG, LODGE_TIERS, lodgeTierUnlocks, nextLodgeTier, type AssetId } from "@/game/base";
import { formatMoney } from "@/game/format";
import { MAX_LIFTS, MAX_LIFT_SLOTS } from "@/game/descent";
import { constructionDraw } from "@/game/economy";
import { assetRemovalQuote, openingStep } from "@/game/rules";
import { useGameStore } from "@/game/store";
import { LIFT_LABELS, type LiftType } from "@/game/types";
import { BuildImpactCard } from "@/ui/BuildImpactCard";
import { startAssetPlacement, startGunPlacement, startPlacement } from "@/ui/placementDraft";
import { Sheet } from "@/ui/kit/Sheet";
import { PrimaryButton, SectionHeading } from "@/ui/kit/parts";
import { TrailsPanel } from "@/ui/TrailsPanel";
import { buildConfirmed } from "@/ui/feel";

function LodgeCard() {
  const tier = useGameStore((s) => s.lodgeTier);
  const construction = useGameStore((s) => s.lodgeUpgrade);
  const cash = useGameStore((s) => s.cash);
  const upgrade = useGameStore((s) => s.beginLodgeUpgrade);
  const [review, setReview] = useState(false);
  const next = nextLodgeTier(tier);
  const unlocks = next ? lodgeTierUnlocks(next) : [];
  const payment = next ? constructionDraw(LODGE_TIERS[next].cost) : null;

  return (
    <div className="panel px-3.5 pb-4 pt-3.5" data-lodge-card>
      <SectionHeading aside={`Tier ${tier}`}>{LODGE_TIERS[tier].label}</SectionHeading>
      <p className="text-sm font-bold">{LODGE_TIERS[tier].pads} attachment pads</p>
      {construction ? (
        <p role="status" className="mt-2 font-bold">
          Tier {construction.toTier} is going up. {construction.nightsRemaining} {construction.nightsRemaining === 1 ? "night" : "nights"} to go.
        </p>
      ) : next && payment && (
        <>
          <p className="mt-2 text-sm font-bold">
            Tier {next} brings {unlocks.length ? unlocks.join(", ") : "more lodge attachment pads"}.
          </p>
          {review ? (
            <BuildImpactCard
              title={`Upgrade to ${LODGE_TIERS[next].label}`}
              facts={[
                { label: "Total cost", value: formatMoney(LODGE_TIERS[next].cost) },
                { label: "Payment", value: `${formatMoney(payment.deposit)} now, ${formatMoney(payment.first)} each of the next two nights` },
                { label: "Construction", value: "Two nights" },
                { label: "Attachment pads", value: String(LODGE_TIERS[next].pads) },
                ...(unlocks.length ? [{ label: "Unlocks", value: unlocks.join(", ") }] : []),
              ]}
              problem={cash < payment.deposit ? "Wallet says no. Close out the day, then come back with the deposit." : null}
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
            <PrimaryButton className="mt-2 min-h-11" onClick={() => setReview(true)}>
              Review Tier {next} upgrade
            </PrimaryButton>
          )}
        </>
      )}
    </div>
  );
}

function VenueManagement({ onStartPlacement }: { onStartPlacement: () => void }) {
  const state = useGameStore();
  const [review, setReview] = useState<number | null>(null);
  if (!state.assets.length) return null;
  const quote = review === null ? null : assetRemovalQuote(state, review);
  return <div className="mt-3">
    <SectionHeading>Manage venues</SectionHeading>
    {state.assets.map((asset, i) => <div key={i} className="flex items-center gap-2 text-sm">
      <span className="flex-1 font-bold">{ASSET_CATALOG[asset.id].label}</span>
      <button type="button" className="key min-h-11 px-2" onClick={() => {
        startAssetPlacement(asset.id, i);
        onStartPlacement();
      }}>Move</button>
      <button type="button" className="key min-h-11 px-2" onClick={() => setReview(i)}>
        {assetRemovalQuote(state, i).undo ? "Undo" : "Remove"}
      </button>
    </div>)}
    {review !== null && state.assets[review] && quote && <BuildImpactCard
      title={`${quote.undo ? "Undo" : "Remove"} ${ASSET_CATALOG[state.assets[review].id].label}?`}
      facts={[{ label: "Cash returned", value: formatMoney(quote.refund) },
        { label: "Effect", value: quote.undo ? "Cancels the two remaining construction payments." : "Removes this venue and ends its upkeep." }]}
      problem={quote.reason} confirmLabel={quote.undo ? "Undo purchase" : "Confirm removal"}
      onCancel={() => setReview(null)} onConfirm={() => { state.removeAsset(review); setReview(null); }} />}
  </div>;
}

const BASE_ASSETS = (Object.keys(ASSET_CATALOG) as AssetId[])
  .filter((id) => ASSET_CATALOG[id].placementZone === "base");

export function BuildSheet({
  open,
  onClose,
  onStartPlacement,
}: {
  open: boolean;
  onClose: () => void;
  onStartPlacement: () => void;
}) {
  const dayIndex = useGameStore((s) => s.dayIndex);
  const selected = useGameStore((s) => s.selectedLiftType);
  const select = useGameStore((s) => s.setSelectedLiftType);
  const lifts = useGameStore((s) => s.lifts);
  const cash = useGameStore((s) => s.cash);
  const tier = useGameStore((s) => s.lodgeTier);
  const [reviewLift, setReviewLift] = useState<number | null>(null);
  const closeLift = useGameStore((s) => s.closeLift);
  const opening = useGameStore(openingStep);
  const activeLifts = lifts.filter((lift) => lift.confirmed && !lift.closing).length;
  const selectedLift = selected === "chair" && tier < 2 ? "surface" : selected;

  const buildAsset = (id: AssetId) => {
    if (id === "snow_guns") startGunPlacement();
    else startAssetPlacement(id);
    onStartPlacement();
  };

  return open ? (
    <Sheet title="Build" subtitle={<>Cash on hand <b>{formatMoney(cash)}</b></>} onClose={onClose}
      closeLabel="Close build sheet" dataMarker="build-sheet" focusClose wide>
      <CoachTip context={{
        phase: "day",
        dayIndex,
        opening,
        running: false,
        placementActive: false,
        buildOpen: true,
        hasGuestsWant: false,
      }} />
      {opening && <p className="mb-3 text-sm font-bold">
        {opening === "lift" ? "Place a surface lift on one of the marked sites."
          : "Paint a trail from the lift’s top station down to the base. Gravity handles the rest."}
      </p>}
      <div className="grid gap-3 short:grid-cols-2 short:items-start">
        {!opening && <LodgeCard />}
        <div className="panel px-3.5 pb-4 pt-3.5">
          <SectionHeading>Lifts</SectionHeading>
          <p className="mb-2 text-xs font-bold">Pay 40% now, then 30% each of the next two nights.</p>
          <div className="grid grid-cols-2 gap-2">
            {(["surface", "chair"] as const).map((type: LiftType) => (
              <button key={type} type="button" className="key press min-h-14 p-2 text-left font-extrabold"
                disabled={type === "chair" && tier < 2} aria-pressed={selectedLift === type} onClick={() => select(type)}>
                {LIFT_LABELS[type]}
                {type === "chair" && tier < 2 && <small className="block">Lodge Tier 2</small>}
              </button>
            ))}
          </div>
          <PrimaryButton className="mt-2 min-h-11"
            disabled={opening === "trail" || lifts.filter((lift) => lift.confirmed).length >= MAX_LIFTS || lifts.length >= MAX_LIFT_SLOTS}
            onClick={() => { startPlacement(selectedLift); onStartPlacement(); }}>
            Place lift
          </PrimaryButton>
          {reviewLift !== null && <BuildImpactCard title={`Close lift ${reviewLift + 1}?`}
            facts={[{ label: "Routes", value: "All trails on this lift close with it." },
              { label: "Refund", value: "$0. Any payments still owed stay owed." },
              { label: "Timing", value: "Close it now if the hill hasn’t opened. Otherwise it closes overnight." }]}
            confirmLabel="Confirm closure" onCancel={() => setReviewLift(null)}
            onConfirm={() => { closeLift(reviewLift); setReviewLift(null); }} />}
          {lifts.map((lift, i) => lift.confirmed && (
            <div key={i} className="mt-2 flex items-center justify-between gap-2 text-sm font-bold">
              <span>{LIFT_LABELS[lift.type]} {i + 1}</span>
              {lift.closing ? "Closing tonight" : (
                <button className="key min-h-11 px-2" disabled={activeLifts <= 1} type="button"
                  aria-label={`Close lift ${i + 1}`} onClick={() => setReviewLift(i)}>Close lift</button>
              )}
            </div>
          ))}
        </div>
        <TrailsPanel onStartPlacement={onStartPlacement} />
        {!opening && <div className="panel px-3.5 pb-4 pt-3.5">
          <SectionHeading>Base</SectionHeading>
          <div className="grid grid-cols-2 gap-2">
            {BASE_ASSETS.map((id) => {
              const asset = ASSET_CATALOG[id];
              const locked = tier < asset.opensAtTier;
              return (
                <button key={id} type="button" disabled={locked} onClick={() => buildAsset(id)}
                  className="key press min-h-14 p-2 text-left font-extrabold">
                  {asset.label}
                  <small className="block">{locked ? `Lodge Tier ${asset.opensAtTier}` : `${formatMoney(constructionDraw(asset.cost).deposit)} now`}</small>
                </button>
              );
            })}
          </div>
          <VenueManagement onStartPlacement={onStartPlacement} />
          <SectionHeading>Snow</SectionHeading>
          <button type="button" className="key press min-h-11 px-3 font-extrabold"
            disabled={tier < 2} onClick={() => buildAsset("snow_guns")}>
            Snow gun, {tier < 2 ? "Lodge Tier 2" : `${formatMoney(constructionDraw(ASSET_CATALOG.snow_guns.cost).deposit)} now`}
          </button>
        </div>}
      </div>
    </Sheet>
  ) : null;
}
