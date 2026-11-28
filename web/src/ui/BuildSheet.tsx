"use client";

import { CoachTip } from "./CoachTip";
import { useId, useState } from "react";
import { liftName, venueName } from "@/game/assetNames";
import { ASSET_CATALOG, LODGE_TIERS, type AssetId, type LodgeTier } from "@/game/base";
import { formatMoney } from "@/game/format";
import { MAX_LIFTS, MAX_LIFT_SLOTS } from "@/game/descent";
import { NORTH_RIDGE_COST } from "@/game/parcels";
import { assetRemovalQuote, liftClosureProblem, openingStep } from "@/game/rules";
import { useGameStore } from "@/game/store";
import { buildConfirmed } from "@/ui/feel";
import { LIFT_LABELS, type LiftType } from "@/game/types";
import { BuildImpactCard } from "@/ui/BuildImpactCard";
import { startAssetPlacement, startGunPlacement, startPlacement } from "@/ui/placementDraft";
import { Sheet } from "@/ui/kit/Sheet";
import { DisclosureButton, PrimaryButton, SectionHeading } from "@/ui/kit/parts";
import { LockIcon } from "@/ui/kit/icons";
import { TrailsPanel } from "@/ui/TrailsPanel";
import { LodgeUpgradeControl } from "@/ui/LodgeUpgradeControl";
import { SegmentedControl } from "@/ui/kit/SegmentedControl";

type BuildTab = "lifts" | "trails" | "base" | "snow";

function VenueManagement({ onStartPlacement }: { onStartPlacement: () => void }) {
  const state = useGameStore();
  const [review, setReview] = useState<number | null>(null);
  if (!state.assets.length) return null;
  const quote = review === null ? null : assetRemovalQuote(state, review);
  return (
    <div className="space-y-2">
      {state.assets.map((asset, i) => (
        <div key={i} className="well-white flex items-center gap-2 px-3 py-2 text-sm">
          <span className="min-w-0 flex-1 break-words font-extrabold">{venueName(asset)}</span>
          <button
            type="button"
            className="key key-sm press min-h-10 px-2.5 text-xs font-extrabold [--lift:2px]"
            onClick={() => {
              startAssetPlacement(asset.id, i);
              onStartPlacement();
            }}
          >
            Move
          </button>
          <button
            type="button"
            className="key key-sm press min-h-10 px-2.5 text-xs font-extrabold [--lift:2px]"
            onClick={() => setReview(i)}
          >
            {assetRemovalQuote(state, i).undo ? "Undo" : "Remove"}
          </button>
        </div>
      ))}
      {review !== null && state.assets[review] && quote && (
        <BuildImpactCard
          title={`${quote.undo ? "Undo" : "Remove"} ${venueName(state.assets[review])}?`}
          facts={[
            { label: "Cash returned", value: formatMoney(quote.refund) },
            { label: "Effect", value: quote.undo ? "Cancels the two remaining construction payments." : "Removes this venue and ends its upkeep." },
          ]}
          problem={quote.reason}
          confirmLabel={quote.undo ? "Undo purchase" : "Confirm removal"}
          onCancel={() => setReview(null)}
          onConfirm={() => { state.removeAsset(review); setReview(null); }}
        />
      )}
    </div>
  );
}

const CATALOG = Object.entries(ASSET_CATALOG) as [AssetId, (typeof ASSET_CATALOG)[AssetId]][];
const BASE_ASSETS = CATALOG.filter(([, spec]) => spec.category === "hospitality" || spec.category === "services")
  .map(([id]) => id);
const FUN_ASSETS = CATALOG.filter(([, spec]) => spec.category === "activity").map(([id]) => id);
const DECOR_ASSETS = CATALOG.filter(([, spec]) => spec.category === "decor").map(([id]) => id);

function AssetGrid({ ids, tier, onBuild }: { ids: AssetId[]; tier: LodgeTier; onBuild: (id: AssetId) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ids.map((id) => {
        const asset = ASSET_CATALOG[id];
        const locked = tier < asset.opensAtTier;
        return (
          <button
            key={id}
            type="button"
            disabled={locked}
            onClick={() => onBuild(id)}
            className="key press flex min-h-[68px] flex-col justify-between p-2.5 text-left [--lift:3px]"
          >
            <span className="text-[0.9rem] font-extrabold leading-tight">{asset.label}</span>
            <span data-muted className="mt-1 inline-flex items-center gap-1 text-xs font-extrabold tabular-nums">
              {locked ? (
                <>
                  <LockIcon size={13} />
                  {LODGE_TIERS[asset.opensAtTier as LodgeTier].label}
                </>
              ) : (
                formatMoney(asset.cost)
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

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
  const assets = useGameStore((s) => s.assets);
  const cash = useGameStore((s) => s.cash);
  const tier = useGameStore((s) => s.lodgeTier);
  const mountainId = useGameStore((s) => s.mountainId);
  const northRidgeParcel = useGameStore((s) => s.northRidgeParcel);
  const buyNorthRidgeParcel = useGameStore((s) => s.buyNorthRidgeParcel);
  const snowGunTier = mountainId === "mount_tom" ? 1 : 2;
  const [reviewLift, setReviewLift] = useState<number | null>(null);
  const [manageLiftsOpen, setManageLiftsOpen] = useState(false);
  const [manageVenuesOpen, setManageVenuesOpen] = useState(false);
  const closeLift = useGameStore((s) => s.closeLift);
  const closeProblem = useGameStore((s) => reviewLift === null ? null : liftClosureProblem(s, reviewLift));
  const opening = useGameStore(openingStep);
  const activeLifts = lifts.filter((lift) => lift.confirmed && !lift.closing).length;
  const confirmedLifts = lifts.filter((lift) => lift.confirmed);
  const selectedLift = selected === "chair" && tier < 2 ? "surface" : selected;
  const [tab, setTab] = useState<BuildTab>("lifts");
  const manageLiftsId = useId();
  const manageVenuesId = useId();

  const buildAsset = (id: AssetId) => {
    if (id === "snow_guns") startGunPlacement();
    else startAssetPlacement(id);
    onStartPlacement();
  };

  const liftsPanel = (
    <div className="beat-swap space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(["surface", "chair"] as const).map((type: LiftType) => {
          const locked = type === "chair" && tier < 2;
          return (
            <button
              key={type}
              type="button"
              className="key press flex min-h-[68px] flex-col justify-between p-2.5 text-left [--lift:3px]"
              disabled={locked}
              aria-pressed={selectedLift === type}
              onClick={() => select(type)}
            >
              <span className="text-[0.92rem] font-extrabold leading-tight">{LIFT_LABELS[type]}</span>
              {locked ? (
                <span data-muted className="mt-1 inline-flex items-center gap-1 text-xs font-extrabold">
                  <LockIcon size={13} />
                  Lodge Tier 2
                </span>
              ) : (
                <span data-muted className="mt-1 text-xs font-bold">
                  {type === "surface" ? "Low cost, steady line" : "High uphill capacity"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <PrimaryButton
        className="min-h-11"
        disabled={opening === "trail" || confirmedLifts.length >= MAX_LIFTS || lifts.length >= MAX_LIFT_SLOTS}
        onClick={() => { startPlacement(selectedLift); onStartPlacement(); }}
      >
        Place lift
      </PrimaryButton>

      {confirmedLifts.length > 0 && (
        <div className="space-y-2">
          <DisclosureButton
            flat
            open={manageLiftsOpen}
            controls={manageLiftsId}
            onToggle={() => setManageLiftsOpen((v) => !v)}
          >
            Manage lifts ({confirmedLifts.length})
          </DisclosureButton>
          {manageLiftsOpen && (
            <div id={manageLiftsId} className="space-y-2">
              {reviewLift !== null && lifts[reviewLift] && (
                <BuildImpactCard
                  title={`Close ${liftName(lifts[reviewLift], reviewLift)}?`}
                  facts={[
                    { label: "Routes", value: "All trails on this lift close with it." },
                    { label: "Refund", value: "$0." },
                    { label: "Timing", value: "Close it now if the hill hasn't opened. Otherwise it closes overnight." },
                  ]}
                  problem={closeProblem}
                  confirmLabel="Confirm closure"
                  onCancel={() => setReviewLift(null)}
                  onConfirm={() => { closeLift(reviewLift); setReviewLift(null); }}
                />
              )}
              {lifts.map((lift, i) => lift.confirmed && (
                <div key={i} className="well-white flex items-center justify-between gap-2 px-3 py-2 text-sm font-bold">
                  <span className="min-w-0 break-words font-extrabold">{liftName(lift, i)}</span>
                  {lift.closing ? (
                    <span className="text-xs font-extrabold text-ink-soft">Closing tonight</span>
                  ) : (
                    <button
                      className="key key-sm press min-h-10 px-2.5 text-xs font-extrabold [--lift:2px]"
                      disabled={activeLifts <= 1}
                      type="button"
                      aria-label={`Close ${liftName(lift, i)}`}
                      onClick={() => setReviewLift(i)}
                    >
                      Close lift
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const basePanel = (
    <div className="beat-swap space-y-3">
      <LodgeUpgradeControl variant="compact" />
      {mountainId === "dutch_hill" && (
        <div className="well-white flex items-center justify-between gap-2.5 p-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.9rem] font-extrabold leading-tight">North Ridge parcel</p>
            <p className="mt-0.5 text-xs font-bold text-ink-soft">
              {northRidgeParcel
                ? "North Ridge leased. Longer uphill lift lines open."
                : tier < 2
                  ? "Unlocks at Lodge Tier 2. Extends the upper lease northward."
                  : "Extends the upper lease northward for longer runs (+4 rep)."}
            </p>
          </div>
          {northRidgeParcel ? (
            <span className="chip bg-sign-green px-2.5 py-1 text-xs font-extrabold text-white [--lift:2px]">
              Leased
            </span>
          ) : (
            <button
              type="button"
              disabled={tier < 2 || cash < NORTH_RIDGE_COST}
              onClick={() => {
                buyNorthRidgeParcel();
                buildConfirmed("North Ridge leased");
              }}
              className="key key-solid press shrink-0 px-3 py-2 text-xs font-extrabold [--key-fill:var(--sign-yellow)] [--lift:2px]"
            >
              {tier < 2 ? "Tier 2" : `Lease (${formatMoney(NORTH_RIDGE_COST)})`}
            </button>
          )}
        </div>
      )}
      <div className="space-y-2">
        <SectionHeading>Base venues</SectionHeading>
        <AssetGrid ids={BASE_ASSETS} tier={tier} onBuild={buildAsset} />
      </div>
      {assets.length > 0 && (
        <div className="space-y-2">
          <DisclosureButton
            flat
            open={manageVenuesOpen}
            controls={manageVenuesId}
            onToggle={() => setManageVenuesOpen((v) => !v)}
          >
            Manage built ({assets.length})
          </DisclosureButton>
          {manageVenuesOpen && (
            <div id={manageVenuesId}>
              <VenueManagement onStartPlacement={onStartPlacement} />
            </div>
          )}
        </div>
      )}
    </div>
  );

  const snowAndFunPanel = (
    <div className="beat-swap space-y-3">
      <div className="space-y-2">
        <SectionHeading>Snowmaking</SectionHeading>
        <button
          type="button"
          className="key press flex min-h-[64px] w-full items-center justify-between p-3 text-left [--lift:3px]"
          disabled={tier < snowGunTier}
          onClick={() => buildAsset("snow_guns")}
        >
          <span className="text-[0.95rem] font-extrabold">Snow gun</span>
          <span data-muted className="inline-flex items-center gap-1 text-xs font-extrabold tabular-nums">
            {tier < snowGunTier ? (
              <>
                <LockIcon size={13} />
                Lodge Tier {snowGunTier}
              </>
            ) : (
              formatMoney(ASSET_CATALOG.snow_guns.cost)
            )}
          </span>
        </button>
      </div>
      <div className="space-y-2">
        <SectionHeading>Activities</SectionHeading>
        <AssetGrid ids={FUN_ASSETS} tier={tier} onBuild={buildAsset} />
      </div>
      <div className="space-y-2">
        <SectionHeading>Decor</SectionHeading>
        <AssetGrid ids={DECOR_ASSETS} tier={tier} onBuild={buildAsset} />
      </div>
    </div>
  );

  return open ? (
    <Sheet
      title="Build"
      subtitle={<>Cash on hand <b className="tabular-nums">{formatMoney(cash)}</b></>}
      onClose={onClose}
      closeLabel="Close build sheet"
      dataMarker="build-sheet"
      focusClose
      wide
    >
      <CoachTip
        compact
        context={{
          phase: "day",
          dayIndex,
          opening,
          running: false,
          placementActive: false,
          buildOpen: true,
          hasGuestsWant: false,
        }}
      />
      {opening && (
        <p className="mt-2.5 text-sm font-bold">
          {opening === "lift"
            ? "Place a surface lift on one of the marked sites."
            : "Paint a trail from the lift's top station down to the base."}
        </p>
      )}
      {!opening && (
        <div className="my-3">
          <SegmentedControl
            ariaLabel="Build sections"
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: "lifts", label: "Lifts" },
              { value: "trails", label: "Trails" },
              { value: "base", label: "Base" },
              { value: "snow", label: "Snow" },
            ]}
          />
        </div>
      )}
      {opening === "lift" ? (
        <div className="mt-3">{liftsPanel}</div>
      ) : opening === "trail" ? (
        <div className="mt-3">
          <TrailsPanel onStartPlacement={onStartPlacement} />
        </div>
      ) : (
        <div className="space-y-3">
          {tab === "lifts" && liftsPanel}
          {tab === "trails" && (
            <div className="beat-swap">
              <TrailsPanel onStartPlacement={onStartPlacement} />
            </div>
          )}
          {tab === "base" && basePanel}
          {tab === "snow" && snowAndFunPanel}
        </div>
      )}
    </Sheet>
  ) : null;
}