"use client";

import { CoachTip } from "./CoachTip";
import { useState } from "react";
import { liftName, venueName } from "@/game/assetNames";
import { ASSET_CATALOG, LODGE_TIERS, type AssetId, type LodgeTier } from "@/game/base";
import { formatMoney } from "@/game/format";
import { MAX_LIFTS, MAX_LIFT_SLOTS } from "@/game/descent";
import { constructionDraw } from "@/game/economy";
import { assetRemovalQuote, liftClosureProblem, openingStep } from "@/game/rules";
import { useGameStore } from "@/game/store";
import { LIFT_LABELS, type LiftType } from "@/game/types";
import { BuildImpactCard } from "@/ui/BuildImpactCard";
import { startAssetPlacement, startGunPlacement, startPlacement } from "@/ui/placementDraft";
import { Sheet } from "@/ui/kit/Sheet";
import { PrimaryButton, SectionHeading } from "@/ui/kit/parts";
import { TrailsPanel } from "@/ui/TrailsPanel";
import { LodgeUpgradeControl } from "@/ui/LodgeUpgradeControl";

const SEG_BTN = "seg-btn min-h-10 px-2 text-sm font-extrabold";

type BuildTab = "lifts" | "trails" | "base";

function VenueManagement({ onStartPlacement }: { onStartPlacement: () => void }) {
  const state = useGameStore();
  const [review, setReview] = useState<number | null>(null);
  if (!state.assets.length) return null;
  const quote = review === null ? null : assetRemovalQuote(state, review);
  return <div className="mt-3">
    <SectionHeading>Manage venues</SectionHeading>
    {state.assets.map((asset, i) => <div key={i} className="flex items-center gap-2 text-sm">
      <span className="min-w-0 flex-1 break-words font-bold">{venueName(asset)}</span>
      <button type="button" className="key min-h-11 px-2" onClick={() => {
        startAssetPlacement(asset.id, i);
        onStartPlacement();
      }}>Move</button>
      <button type="button" className="key min-h-11 px-2" onClick={() => setReview(i)}>
        {assetRemovalQuote(state, i).undo ? "Undo" : "Remove"}
      </button>
    </div>)}
    {review !== null && state.assets[review] && quote && <BuildImpactCard
      title={`${quote.undo ? "Undo" : "Remove"} ${venueName(state.assets[review])}?`}
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
  const closeProblem = useGameStore((s) => reviewLift === null ? null : liftClosureProblem(s, reviewLift));
  const opening = useGameStore(openingStep);
  const activeLifts = lifts.filter((lift) => lift.confirmed && !lift.closing).length;
  const selectedLift = selected === "chair" && tier < 2 ? "surface" : selected;
  const [tab, setTab] = useState<BuildTab>("lifts");

  const buildAsset = (id: AssetId) => {
    if (id === "snow_guns") startGunPlacement();
    else startAssetPlacement(id);
    onStartPlacement();
  };

  const tabHidden = (id: BuildTab) =>
    !opening && tab !== id ? "hidden md:contents" : "contents";

  const liftsPanel = (
    <div className="panel px-3.5 pb-4 pt-3.5">
      <SectionHeading>Lifts</SectionHeading>
      <p className="chip mb-2 mt-1 w-fit px-2 py-1 text-xs font-extrabold [--lift:2px]">
        Payment plan: 40% down today, 30% for the next two nights.
      </p>
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
      {reviewLift !== null && lifts[reviewLift] && <BuildImpactCard title={`Close ${liftName(lifts[reviewLift], reviewLift)}?`}
        facts={[{ label: "Routes", value: "All trails on this lift close with it." },
          { label: "Refund", value: "$0. Any payments still owed stay owed." },
          { label: "Timing", value: "Close it now if the hill hasn't opened. Otherwise it closes overnight." }]}
        problem={closeProblem} confirmLabel="Confirm closure" onCancel={() => setReviewLift(null)}
        onConfirm={() => { closeLift(reviewLift); setReviewLift(null); }} />}
      {lifts.map((lift, i) => lift.confirmed && (
        <div key={i} className="mt-2 flex items-center justify-between gap-2 text-sm font-bold">
          <span className="min-w-0 break-words">{liftName(lift, i)}</span>
          {lift.closing ? "Closing tonight" : (
            <button className="key min-h-11 px-2" disabled={activeLifts <= 1} type="button"
              aria-label={`Close ${liftName(lift, i)}`} onClick={() => setReviewLift(i)}>Close lift</button>
          )}
        </div>
      ))}
    </div>
  );

  const basePanel = (
    <div className="panel px-3.5 pb-4 pt-3.5">
      <SectionHeading>Base</SectionHeading>
      <div className="grid grid-cols-2 gap-2">
        {BASE_ASSETS.map((id) => {
          const asset = ASSET_CATALOG[id];
          const locked = tier < asset.opensAtTier;
          return (
            <button key={id} type="button" disabled={locked} onClick={() => buildAsset(id)}
              className="key press min-h-14 p-2 text-left font-extrabold">
              {asset.label}
              <small className="block">{locked ? `Opens at ${LODGE_TIERS[asset.opensAtTier as LodgeTier].label}` : `${formatMoney(constructionDraw(asset.cost).deposit)} now`}</small>
            </button>
          );
        })}
      </div>
      <LodgeUpgradeControl variant="compact" />
      <VenueManagement onStartPlacement={onStartPlacement} />
      <SectionHeading>Snow</SectionHeading>
      <button type="button" className="key press min-h-11 px-3 font-extrabold"
        disabled={tier < 2} onClick={() => buildAsset("snow_guns")}>
        Snow gun, {tier < 2 ? "Lodge Tier 2" : `${formatMoney(constructionDraw(ASSET_CATALOG.snow_guns.cost).deposit)} now`}
      </button>
    </div>
  );

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
          : "Paint a trail from the lift's top station down to the base."}
      </p>}
      {!opening && (
        <div className="seg mb-3 grid grid-cols-3 sm:hidden" role="group" aria-label="Build sections">
          {(["lifts", "trails", "base"] as const).map((id) => (
            <button
              key={id}
              type="button"
              className={SEG_BTN}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {id === "lifts" ? "Lifts" : id === "trails" ? "Trails" : "Base"}
            </button>
          ))}
        </div>
      )}
      {opening ? (
        <div className="grid gap-3 short:grid-cols-2 short:items-start">
          {liftsPanel}
          <TrailsPanel onStartPlacement={onStartPlacement} />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 md:items-start">
          <div className="grid gap-3">
            <div className={tabHidden("lifts")}>{liftsPanel}</div>
            <div className={tabHidden("trails")}>
              <TrailsPanel onStartPlacement={onStartPlacement} />
            </div>
          </div>
          <div className={tabHidden("base")}>{basePanel}</div>
        </div>
      )}
    </Sheet>
  ) : null;
}