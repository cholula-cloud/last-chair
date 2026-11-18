"use client";

import { useMemo } from "react";
import { ASSET_CATALOG, CHAIR_TIER } from "@/game/base";
import { constructionDraw } from "@/game/economy";
import { formatMoney } from "@/game/format";
import { chooseLift, liftCapacityPerHour, liftWaitMin } from "@/game/lifts";
import { BRUSH_WIDTHS } from "@/game/paintedTrail";
import { PERSONAS } from "@/game/personas";
import {
  checkAssetPlacement, checkGunPlacement, checkPaint,
  commitPaint,
} from "@/game/rules";
import type { GameState } from "@/game/state";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { isOverSkill } from "@/game/trails";
import { LIFT_LABELS, type TrailDifficulty } from "@/game/types";
import { BuildImpactCard } from "@/ui/BuildImpactCard";
import { liftReadout } from "@/ui/liftGesture";
import { DifficultyIcon } from "@/ui/kit/icons";
import { PrimaryButton } from "@/ui/kit/parts";
import {
  cancelPlacement, finishPlacement, redoStroke, undoStroke, usePlacementDraft,
} from "@/ui/placementDraft";

const BRUSH_NAMES = ["Narrow", "Standard", "Wide", "Boulevard"];
const SLOPES: readonly [TrailDifficulty, string][] = [
  ["green", "Gentle"], ["blue", "Moderate"], ["black", "Steep"],
];
const actionClass = "key press min-h-11 px-2 text-sm font-extrabold";
const acres = (area: number) => `${area.toFixed(2)} ac`;
const feet = (length: number) => `${Math.round(length).toLocaleString()} ft`;

/** Estimate the wait the current queues would offer an approaching guest of each skill. */
function queueImpact(before: GameState, after: GameState): string {
  const expectedWait = (state: GameState) => Object.values(PERSONAS).reduce((total, persona) => {
    const index = chooseLift(state.lifts, state.talentsOwned, state.trails,
      { id: persona.id, persona: persona.id, runs: 0 });
    return total + (index < 0 ? 0 : liftWaitMin(state.lifts[index], state.talentsOwned));
  }, 0) / Object.keys(PERSONAS).length;
  const delta = expectedWait(after) - expectedWait(before);
  if (Math.abs(delta) < 0.05) return "No immediate change";
  return `${Math.abs(delta).toFixed(1)} min ${delta < 0 ? "less" : "more"} at current queues`;
}

function DraftActions({ canReview }: { canReview: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button type="button" className={actionClass} onClick={cancelPlacement}>Cancel</button>
      <PrimaryButton className="min-h-11" disabled={!canReview} onClick={() => usePlacementDraft.setState({ review: true })}>
        Review
      </PrimaryButton>
    </div>
  );
}

function backToDraft() {
  usePlacementDraft.setState({ review: false });
}

function MoveMapButton({ resumeLabel }: { resumeLabel: string }) {
  const moving = usePlacementDraft((s) => s.moveCamera);
  const painting = usePlacementDraft((s) => s.activeStroke !== null);
  return (
    <button type="button" className={actionClass} disabled={painting}
      onClick={() => usePlacementDraft.setState({ moveCamera: !moving })}>
      {moving ? resumeLabel : "Move map"}
    </button>
  );
}

function TrailBar() {
  const draft = usePlacementDraft();
  const state = useGameStore();
  const strokes = useMemo(
    () => draft.activeStroke ? [...draft.strokes, draft.activeStroke] : draft.strokes,
    [draft.activeStroke, draft.strokes],
  );
  const preview = useMemo(
    () => strokes.length > 0 ? checkPaint(state, strokes, draft.glade) : null,
    [state, strokes, draft.glade],
  );
  const guests = preview ? Object.values(PERSONAS)
    .filter(({ id }) => !isOverSkill(id, preview.difficulty))
    .map(({ label }) => label).join(", ") : "";
  if (draft.review && preview) {
    return (
      <BuildImpactCard
        title={preview.trailIndex !== null ? "Review trail changes" : preview.glade ? "Review glade" : "Review painted trail"}
        facts={[
          { label: "Trail", value: preview.name },
          { label: "Cost", value: formatMoney(preview.cost) },
          { label: "Difficulty", value: preview.difficulty },
          { label: "Length", value: feet(preview.lengthFt) },
          { label: "Vertical", value: feet(preview.verticalFt) },
          { label: "Area", value: acres(preview.acres) },
          { label: "Who can ski", value: guests || "None" },
          { label: "Lodge tier", value: "1" },
          ...(!preview.reason ? [{ label: "Queue estimate", value: queueImpact(state, commitPaint(state, strokes, draft.glade)) }] : []),
        ]}
        confirmLabel={preview.deleteTrail ? "Close trail" : preview.trailIndex !== null ? "Apply changes" : preview.glade ? "Mark glade" : "Cut trail"}
        problem={preview.reason}
        onCancel={backToDraft}
        onConfirm={() => {
          state.commitPaint(strokes, draft.glade);
          if (useGameStore.getState().trails !== state.trails) finishPlacement();
        }}
      />
    );
  }
  return (
    <div className="panel space-y-2 px-3 pb-3 pt-2">
      <p className="text-sm font-extrabold">
        {draft.moveCamera
          ? "Drag or pinch to move the map. Tap Paint to continue."
          : draft.erasing
          ? "Drag over a trail to erase paint."
          : draft.strokes.length
            ? "Start the next stroke at the marked end, or review when finished."
            : "Drag from a green lift ring downhill. End anywhere, or connect to an open trail."}
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold" title="Slope straight downhill. A traverse can be easier.">
        <span>Downhill slope</span>
        {SLOPES.map(([difficulty, label]) => (
          <span key={difficulty} className="inline-flex items-center gap-0.5">
            <DifficultyIcon difficulty={difficulty} size={12} />
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1" aria-label="Trail type">
        <button type="button" className={actionClass} aria-pressed={!draft.glade} onClick={() => usePlacementDraft.setState({ glade: false })}>Cleared trail</button>
        <button type="button" className={actionClass} aria-pressed={draft.glade} onClick={() => usePlacementDraft.setState({ glade: true })}>Glade · keep trees</button>
      </div>
      <div className="grid grid-cols-4 gap-1" aria-label="Brush width">
        {BRUSH_WIDTHS.map((width, i) => (
          <button key={width} type="button" aria-pressed={draft.brushWidth === width}
            className={`${actionClass} px-1 text-xs short:px-0.5 short:text-[0.65rem]`}
            onClick={() => usePlacementDraft.setState({ brushWidth: width })}>
            <span className="block">{BRUSH_NAMES[i]}</span>
            <span className="block text-[0.7rem]">{width} ft</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1">
        <MoveMapButton resumeLabel="Paint" />
        <button type="button" className={actionClass} aria-pressed={draft.erasing}
          onClick={() => usePlacementDraft.setState({ erasing: !draft.erasing })}>Erase</button>
        <button type="button" className={actionClass} disabled={!draft.strokes.length} onClick={undoStroke}>Undo</button>
        <button type="button" className={actionClass} disabled={!draft.redo.length} onClick={redoStroke}>Redo</button>
      </div>
      {preview && (
        <div className="text-xs font-bold" aria-live={draft.activeStroke ? "off" : "polite"}>
          <p className="flex flex-wrap items-center gap-1.5">
            <DifficultyIcon difficulty={preview.difficulty} size={16} />
            <span>{feet(preview.lengthFt)} · {feet(preview.verticalFt)} vertical · {acres(preview.acres)} · {formatMoney(preview.cost)}</span>
          </p>
          {preview.reason && <p className="text-barn-deep">{preview.reason}</p>}
        </div>
      )}
      <DraftActions canReview={draft.strokes.length > 0 && !draft.activeStroke} />
    </div>
  );
}

function buildPaymentFacts(total: number) {
  const { deposit, first, second } = constructionDraw(total);
  const remaining = first === second ? `${formatMoney(first)} each of the next two nights`
    : `${formatMoney(first)} tonight, ${formatMoney(second)} tomorrow night`;
  return [
    { label: "Total cost", value: formatMoney(total) },
    { label: "Payment", value: `${formatMoney(deposit)} now, ${remaining}` },
  ];
}

function LiftBar() {
  const draft = usePlacementDraft();
  const state = useGameStore();
  const { type, top, bottom } = draft;
  const line = top ? { bottom: bottom ?? TERRAIN.base, top } : null;
  const readout = line ? liftReadout(state, type, line) : null;
  const cost = readout?.cost ?? 0;
  const problem = readout?.problem ?? null;
  const length = readout ? feet(readout.lengthFt) : null;
  const vertical = readout ? feet(readout.verticalFt) : null;
  const capacity = readout?.skiersPerHour ?? liftCapacityPerHour(type, state.talentsOwned);
  const ride = readout?.rideMin ?? null;
  if (draft.review && line && readout) {
    return (
      <BuildImpactCard
        title={`Review ${LIFT_LABELS[type]}`}
        facts={[
          ...buildPaymentFacts(cost),
          { label: "Vertical", value: vertical ?? "0 ft" },
          { label: "Length", value: length ?? "0 ft" },
          { label: "Capacity", value: `${capacity} skiers per hour` },
          { label: "Ride time", value: `${ride?.toFixed(1)} min` },
          { label: "Lodge tier", value: type === "chair" ? String(CHAIR_TIER) : "1" },
          { label: "Opens", value: "After you cut a trail" },
        ]}
        confirmLabel={`Place for ${formatMoney(constructionDraw(cost).deposit)} now`}
        problem={problem}
        onCancel={backToDraft}
        onConfirm={() => {
          state.placeLift({ type, ...line });
          if (useGameStore.getState().lifts !== state.lifts) finishPlacement();
        }}
      />
    );
  }
  const chip = "chip px-2 py-0.5 text-xs font-extrabold tabular-nums";
  return (
    <div className="panel space-y-2 px-3 pb-3 pt-2">
      <p className="text-sm font-extrabold" aria-live="polite">
        {draft.moveCamera ? "Move the map, then tap Place lift to continue."
          : top ? "Drag either end to adjust. Use two fingers to move the map."
          : "Drag uphill from the base to place a lift."}
      </p>
      {readout && (
        <div className="flex flex-wrap gap-1">
          <span className={chip}>{formatMoney(cost)}</span>
          <span className={chip}>{length} long</span>
          <span className={chip}>{vertical} vertical</span>
          <span className={chip}>{capacity} skiers per hour</span>
          <span className={chip}>{ride?.toFixed(1)} min ride</span>
        </div>
      )}
      {problem && <p className="chip block max-w-full px-2 py-0.5 text-xs font-extrabold leading-snug text-barn-deep [overflow-wrap:anywhere]">{problem}</p>}
      <MoveMapButton resumeLabel="Place lift" />
      <DraftActions canReview={!!readout?.ok} />
    </div>
  );
}

function SiteBar() {
  const draft = usePlacementDraft();
  const state = useGameStore();
  const { asset, tapPoint } = draft;
  const gun = draft.kind === "gun";
  const item = gun ? ASSET_CATALOG.snow_guns : asset ? ASSET_CATALOG[asset] : null;
  if (!item) return null;
  const check = tapPoint
    ? gun ? checkGunPlacement(state, tapPoint) : asset ? checkAssetPlacement(state, asset, tapPoint) : null
    : null;
  const problem = check && !check.ok ? check.reason : null;

  if (draft.review) {
    return (
      <BuildImpactCard
        title={`Review ${item.label}`}
        facts={[
          ...buildPaymentFacts(check?.ok ? check.cost : item.cost),
          { label: "Lodge tier", value: String(item.opensAtTier) },
          ...(check?.ok ? [{ label: "Area", value: acres(check.acres) }] : []),
          ...(check?.ok && check.attached ? [{ label: "Lodge pad", value: "+5% attached" }] : []),
        ]}
        confirmLabel="Build here"
        problem={tapPoint ? problem : "Choose a spot on the hill."}
        onCancel={backToDraft}
        onConfirm={() => {
          if (!check?.ok) return;
          if (gun) state.placeGun(check.placement.at);
          else if (asset) state.placeAsset(asset, check.placement.at);
          if (useGameStore.getState().cash !== state.cash) finishPlacement();
        }}
      />
    );
  }

  return (
    <div className="panel space-y-2 px-3 pb-3 pt-2">
      <p className="text-sm font-extrabold">
        {draft.moveCamera ? "Move the map, then tap Place to continue."
          : gun ? "Place the gun within pipe reach of the base or another gun."
          : `Choose a spot for ${item.label} near the lodge.`}
      </p>
      {problem && <p className="text-xs font-bold text-barn-deep">{problem}</p>}
      {check?.ok && <p className="text-xs font-bold">{formatMoney(check.cost)}{check.attached ? " · +5% attached" : ""}</p>}
      <MoveMapButton resumeLabel="Place" />
      <DraftActions canReview={!!tapPoint} />
    </div>
  );
}

export function PlacementBar() {
  const active = usePlacementDraft((s) => s.active);
  const kind = usePlacementDraft((s) => s.kind);
  const showPlacementColors = usePlacementDraft((s) => s.kind !== "trail" && s.kind !== "lift");
  if (!active) return null;
  return (
    <div className="pointer-events-auto max-h-[65dvh] w-full max-w-[440px] overflow-y-auto px-1 short:max-w-[270px]" data-placement-kind={kind}>
      {showPlacementColors && <p className="key mb-1 px-2 py-1 text-xs font-bold">Green marks buildable spots. Red marks blocked spots.</p>}
      {kind === "trail" ? <TrailBar /> : kind === "lift" ? <LiftBar /> : <SiteBar />}
    </div>
  );
}
