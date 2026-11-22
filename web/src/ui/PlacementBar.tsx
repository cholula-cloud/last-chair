"use client";

import { useMemo, type ReactNode } from "react";
import { ASSET_CATALOG, CHAIR_TIER, lodgeAttachPads } from "@/game/base";
import { formatMoney } from "@/game/format";
import { chooseLift, liftCapacityPerHour, liftWaitMin } from "@/game/lifts";
import { BRUSH_WIDTHS } from "@/game/paintedTrail";
import { PERSONAS } from "@/game/personas";
import {
  checkAssetMove, checkAssetPlacement, checkGunPlacement, checkPaint, checkPlacement,
  commitPaint,
} from "@/game/rules";
import type { GameState } from "@/game/state";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { isOverSkill } from "@/game/trails";
import { LIFT_LABELS, type TrailDifficulty } from "@/game/types";
import { STROKE_FULL_REASON } from "@/render/paintAssist";
import { trailPanelMode } from "@/ui/trailPanel";
import { BuildImpactCard } from "@/ui/BuildImpactCard";
import { buildConfirmed } from "@/ui/feel";
import { liftReadout } from "@/ui/liftGesture";
import { placementReason } from "@/game/descent";
import {
  ChevronDownIcon,
  DifficultyIcon,
  EraseIcon,
  RedoIcon,
  SlidersIcon,
  UndoIcon,
} from "@/ui/kit/icons";
import {
  cancelPlacement, finishPlacement, redoStroke, undoStroke, usePlacementDraft,
} from "@/ui/placementDraft";

const DIFFICULTY_WORDS: Record<TrailDifficulty, string> = { green: "Green", blue: "Blue", black: "Black" };
const cancelBtnClass = "key key-sm press flex h-9 min-h-9 items-center justify-center px-3 text-xs font-extrabold [--lift:2px]";
const reviewBtnClass = "key key-sm key-solid press flex h-9 min-h-9 items-center justify-center px-3.5 text-xs font-extrabold [--key-fill:var(--sign-green)] [--key-ink:#fff] [--lift:2px]";
const acres = (area: number) => `${area.toFixed(2)} acres`;
const segBtnClass = "seg-btn flex min-h-9 items-center justify-center whitespace-nowrap px-2 text-xs font-extrabold tabular-nums";
const toolBtnClass = "seg-btn flex min-h-9 items-center justify-center gap-1 px-2 text-[0.72rem] font-extrabold leading-none";
const feet = (length: number) => `${Math.round(length).toLocaleString()} ft`;

/** Estimate the wait the current queues would offer an approaching guest of each skill. */
function queueImpact(before: GameState, after: GameState): string {
  const expectedWait = (state: GameState) => Object.values(PERSONAS).reduce((total, persona) => {
    const index = chooseLift(state.lifts, state.talentsOwned, state.trails,
      { id: persona.id, persona: persona.id, runs: 0 });
    return total + (index < 0 ? 0 : liftWaitMin(state.lifts[index], state.talentsOwned));
  }, 0) / Object.keys(PERSONAS).length;
  const delta = expectedWait(after) - expectedWait(before);
  if (Math.abs(delta) < 0.05) return "No change to the lines yet";
  return `${Math.abs(delta).toFixed(1)} min ${delta < 0 ? "shorter" : "longer"} wait at current queues`;
}

function DraftActions({ canReview }: { canReview: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button type="button" className={cancelBtnClass} onClick={cancelPlacement}>Cancel</button>
      <button
        type="button"
        className={reviewBtnClass}
        disabled={!canReview}
        onClick={() => usePlacementDraft.setState({ review: true })}
      >
        Review
      </button>
    </div>
  );
}

function MinimizeButton() {
  return (
    <button
      type="button"
      onClick={() => usePlacementDraft.setState({ minimized: true })}
      aria-label="Minimize build controls"
      title="Minimize controls"
      className="key key-sm press flex size-8 shrink-0 items-center justify-center text-ink [--lift:2px]"
    >
      <ChevronDownIcon size={16} />
    </button>
  );
}

function MinimizedBar({
  summary,
  canReview,
  dataTrailPanel,
}: {
  summary: ReactNode;
  canReview: boolean;
  dataTrailPanel?: "minimized";
}) {
  return (
    <div
      key="minimized"
      data-placement-minimized="true"
      data-trail-panel={dataTrailPanel}
      className="panel trail-bar-in flex items-center justify-between gap-2 px-2 py-1.5 [--lift:3px]"
    >
      <button
        type="button"
        onClick={() => usePlacementDraft.setState({ minimized: false })}
        aria-label="Expand build controls"
        className="key key-sm press flex h-9 min-h-9 min-w-0 items-center gap-1.5 px-2.5 text-xs font-extrabold [--lift:2px]"
      >
        <SlidersIcon size={15} className="shrink-0" />
        <span className="truncate tabular-nums">{summary}</span>
      </button>
      <DraftActions canReview={canReview} />
    </div>
  );
}

function backToDraft() {
  usePlacementDraft.setState({ review: false });
}

/** A lift loading area can be a short walk from the village runout. */
export function walkBackNote({ ft, minutes }: { ft: number; minutes: number }) {
  const min = Math.max(1, Math.round(minutes));
  return `The lift is a ${Math.round(ft).toLocaleString("en-US")} ft walk from the runout, about ${min} min.`;
}

function TrailBar() {
  const draft = usePlacementDraft();
  const state = useGameStore();
  const strokes = useMemo(
    () => draft.activeStroke ? [...draft.strokes, draft.activeStroke] : draft.strokes,
    [draft.activeStroke, draft.strokes],
  );
  const preview = useMemo(
    () => strokes.length > 0 ? checkPaint(state, strokes, draft.glade, draft.connectCrossings) : null,
    [state, strokes, draft.glade, draft.connectCrossings],
  );
  const guests = preview ? Object.values(PERSONAS)
    .filter(({ id }) => !isOverSkill(id, preview.difficulty))
    .map(({ label }) => label).join(", ") : "";
  const canReview = draft.strokes.length > 0 && !draft.activeStroke;
  const mode = trailPanelMode(draft);

  if (mode === "review" && preview) {
    return (
      <BuildImpactCard
        title={preview.trailIndex !== null ? "Review trail changes" : preview.glade ? "Review glade" : "Review painted trail"}
        facts={[
          { label: "Trail", value: preview.name },
          { label: preview.deleteTrail ? "Refund" : "Cost", value: formatMoney(preview.cost) },
          ...(preview.deleteTrail ? [{ label: "Effect", value: "Closes this route. The cleared land stays cleared." }] : []),
          { label: "Difficulty", value: preview.difficulty },
          { label: "Length", value: feet(preview.lengthFt) },
          { label: "Vertical", value: feet(preview.verticalFt) },
          { label: "Area", value: acres(preview.acres) },
          ...(preview.links?.start ? [{ label: "Starts on", value: state.trails[preview.links.start.trailIndex].name }] : []),
          ...(preview.links?.end ? [{ label: "Joins", value: state.trails[preview.links.end.trailIndex].name }] : []),
          ...(preview.links?.crossings?.length ? [{ label: "Trail junctions", value: String(preview.links.crossings.length) }] : []),
          ...(preview.walkBack ? [{ label: "Walk back", value: walkBackNote(preview.walkBack) }] : []),
          { label: "Who can ski", value: guests || "Nobody yet" },
          { label: "Lodge tier", value: "1" },
          ...(!preview.reason ? [{ label: "Queue estimate", value: queueImpact(state, commitPaint(state, strokes, draft.glade, draft.connectCrossings)) }] : []),
        ]}
        confirmLabel={preview.deleteTrail ? "Close trail" : preview.trailIndex !== null ? "Apply changes" : preview.glade ? "Mark glade" : "Cut trail"}
        problem={preview.reason}
        onCancel={backToDraft}
        onConfirm={() => {
          state.commitPaint(strokes, draft.glade, draft.connectCrossings);
          if (useGameStore.getState().trails !== state.trails) {
            buildConfirmed(preview.deleteTrail ? "Trail closed." : preview.trailIndex !== null ? "Trail reworked." : preview.glade ? "Glade marked. The trees stay." : "That’s a trail. Somebody’s going to love it.");
            finishPlacement();
          }
        }}
      />
    );
  }

  const stats = preview && (
    <div
      className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-[var(--r-chip)] bg-snow-2 px-2 py-1 text-xs font-extrabold tabular-nums"
      aria-live={draft.activeStroke ? "off" : "polite"}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="inline-flex items-center gap-1 text-ink">
          <DifficultyIcon difficulty={preview.difficulty} size={13} />
          {DIFFICULTY_WORDS[preview.difficulty]}
        </span>
        <span className="text-ink-soft">{feet(preview.lengthFt)}</span>
        <span className="text-ink-soft">{feet(preview.verticalFt)} vert</span>
        <span className="hidden text-ink-soft sm:inline">{acres(preview.acres)}</span>
      </div>
      <span className="chip shrink-0 bg-gold px-1.5 py-0.5 text-xs font-extrabold tabular-nums [--lift:2px]">
        {formatMoney(preview.cost)}
      </span>
    </div>
  );

  const reason = draft.strokeFull ? STROKE_FULL_REASON : preview?.reason;
  const problem = reason && (
    <p className="rounded-[var(--r-chip)] border-2 border-barn-deep bg-snow px-2.5 py-1 text-xs font-extrabold leading-snug text-barn-deep [overflow-wrap:anywhere]">
      {reason}
    </p>
  );

  if (mode === "compact") {
    return (
      <div key="compact" className="panel trail-bar-in space-y-1 px-2 py-1 sm:px-2.5 sm:py-1.5 [--lift:3px]" data-trail-panel="compact">
        <div className="flex items-center gap-2">
          {stats ?? <p className="text-xs font-extrabold text-ink-soft">Lift your finger to finish the stroke.</p>}
        </div>
        {problem}
      </div>
    );
  }

  if (mode === "minimized") {
    const label = preview
      ? `${draft.brushWidth} ft · ${formatMoney(preview.cost)}`
      : `${draft.glade ? "Glade" : "Trail"} · ${draft.brushWidth} ft`;
    return <MinimizedBar summary={label} canReview={canReview} dataTrailPanel="minimized" />;
  }

  const prompt = draft.erasing
    ? "Drag over paint to erase · 2 fingers move map"
    : draft.strokes.length
      ? null
      : "Drag from lift top to paint · 2 fingers move map";

  return (
    <div key="full" className="panel trail-bar-in space-y-1 px-2 py-1.5 sm:space-y-1.5 sm:px-2.5 sm:py-2 [--lift:3px]" data-trail-panel="full">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <div className={`min-w-0 flex-1 ${problem ? "short:hidden" : ""}`}>
          {stats ?? <p className="truncate px-0.5 text-xs font-extrabold text-ink-soft">{prompt}</p>}
        </div>
        {/* On short screens, keep the continuation ring exposed by sharing the stats row. */}
        {problem && <div className="order-last w-full min-w-0 short:order-none short:w-auto short:flex-1">{problem}</div>}
        <MinimizeButton />
      </div>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-stretch gap-1.5">
          <div className="seg grid shrink-0 grid-cols-2 gap-0.5" role="group" aria-label="Trail type">
            <button
              type="button"
              className={segBtnClass}
              aria-pressed={!draft.glade}
              onClick={() => usePlacementDraft.setState({ glade: false })}
            >
              Cleared
            </button>
            <button
              type="button"
              className={segBtnClass}
              aria-pressed={draft.glade}
              title="Glade keeps trees"
              onClick={() => usePlacementDraft.setState({ glade: true })}
            >
              Glade
            </button>
          </div>
          <div className="seg grid min-w-0 flex-1 grid-cols-4 gap-0.5 sm:flex-none" role="group" aria-label="Brush width">
            {BRUSH_WIDTHS.map((width) => (
              <button
                key={width}
                type="button"
                aria-pressed={draft.brushWidth === width}
                aria-label={`${width} ft wide`}
                className={`${segBtnClass} px-1.5 text-[0.68rem]`}
                onClick={() => usePlacementDraft.setState({ brushWidth: width })}
              >
                {width}ft
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-1.5">
          <div className="seg grid grid-cols-3 gap-0.5" role="group" aria-label="Paint tools">
            <button
              type="button"
              className={toolBtnClass}
              aria-pressed={draft.erasing}
              data-tone="bad"
              onClick={() => usePlacementDraft.setState({ erasing: !draft.erasing })}
            >
              <EraseIcon size={14} />
              <span>Erase</span>
            </button>
            <button
              type="button"
              className={toolBtnClass}
              disabled={!draft.strokes.length}
              onClick={undoStroke}
            >
              <UndoIcon size={14} />
              <span className="sr-only">Undo</span>
            </button>
            <button
              type="button"
              className={toolBtnClass}
              disabled={!draft.redo.length}
              onClick={redoStroke}
            >
              <RedoIcon size={14} />
              <span className="sr-only">Redo</span>
            </button>
          </div>
          <DraftActions canReview={canReview} />
        </div>
      </div>
    </div>
  );
}

function buildPaymentFacts(total: number) {
  return [
    { label: "Cost", value: formatMoney(total) },
    { label: "Payment", value: "Paid upfront" },
  ];
}

function LiftBar() {
  const draft = usePlacementDraft();
  const state = useGameStore();
  const { type, top, bottom } = draft;
  const line = top && bottom ? { bottom, top } : null;
  const readout = line ? liftReadout(state, type, line) : null;
  const cost = readout?.cost ?? 0;
  // With no top yet, a lodge tier or lift count block still needs saying: the guide is empty then.
  const early = line ? null : checkPlacement(state, type, { bottom: bottom ?? TERRAIN.base, top: bottom ?? TERRAIN.base });
  const earlyProblem = early && !early.ok && (early.reason === "lodge_tier" || early.reason === "max_lifts")
    ? placementReason(early.reason, { ...early, liftType: type }) : null;
  const problem = readout?.problem ?? earlyProblem;
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
          { label: "Opens", value: "Once you cut a trail" },
        ]}
        confirmLabel={`Place for ${formatMoney(cost)}`}
        problem={problem}
        onCancel={backToDraft}
        onConfirm={() => {
          state.placeLift({ type, ...line });
          if (useGameStore.getState().lifts !== state.lifts) {
            buildConfirmed("Lift’s in. Now give it a trail.");
            finishPlacement();
          }
        }}
      />
    );
  }

  if (draft.minimized) {
    const label = readout ? `${formatMoney(cost)} · ${length}` : LIFT_LABELS[type];
    return <MinimizedBar summary={label} canReview={!!readout?.ok} />;
  }

  return (
    <div className="panel trail-bar-in space-y-1 px-2 py-1.5 sm:space-y-1.5 sm:px-2.5 sm:py-2 [--lift:3px]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-extrabold text-ink-soft" aria-live="polite">
            {draft.liftPhase === "bottom"
              ? "Tap the bottom loading area · 2 fingers move map"
              : draft.liftPhase === "top"
                ? "Tap the top terminal · 2 fingers move map"
                : "Drag ends to adjust · 2 fingers move map"}
          </p>
          {readout && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-[var(--r-chip)] bg-snow-2 px-2 py-1 text-xs font-extrabold tabular-nums">
              <span className="chip bg-gold px-1.5 py-0.5 text-xs [--lift:2px]">{formatMoney(cost)}</span>
              <span>{length}</span>
              <span className="text-ink-soft">{vertical} vert</span>
              <span className="text-ink-soft">{capacity}/hr</span>
              <span className="text-ink-soft">{ride?.toFixed(1)}m ride</span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="hidden sm:block">
            <DraftActions canReview={!!readout?.ok} />
          </div>
          <MinimizeButton />
        </div>
      </div>
      {problem && (
        <p className="rounded-[var(--r-chip)] border-2 border-barn-deep bg-snow px-2.5 py-1 text-xs font-extrabold leading-snug text-barn-deep [overflow-wrap:anywhere]">
          {problem}
        </p>
      )}
      <div className="flex justify-end sm:hidden">
        <DraftActions canReview={!!readout?.ok} />
      </div>
    </div>
  );
}

function SiteBar() {
  const draft = usePlacementDraft();
  const state = useGameStore();
  const { asset, tapPoint, movingAssetIndex } = draft;
  const gun = draft.kind === "gun";
  const item = gun ? ASSET_CATALOG.snow_guns : asset ? ASSET_CATALOG[asset] : null;
  if (!item) return null;
  const check = tapPoint
    ? movingAssetIndex !== undefined ? checkAssetMove(state, movingAssetIndex, tapPoint) : gun ? checkGunPlacement(state, tapPoint) : asset ? checkAssetPlacement(state, asset, tapPoint) : null
    : null;
  const problem = check && !check.ok ? check.reason : null;

  if (draft.review) {
    return (
      <BuildImpactCard
        title={`Review ${item.label}`}
        facts={[
          ...(movingAssetIndex === undefined ? buildPaymentFacts(check?.ok ? check.cost : item.cost) : [{ label: "Moving cost", value: "$0" }]),
          { label: "Daily upkeep", value: formatMoney(item.upkeep) },
          { label: "Lodge tier", value: String(item.opensAtTier) },
          ...(check?.ok ? [{ label: "Area", value: acres(check.acres) }] : []),
          ...(check?.ok && check.attached ? [{ label: "Lodge pad", value: "+5% attached" }] : []),
        ]}
        confirmLabel={movingAssetIndex === undefined ? "Build here" : "Move here"}
        problem={tapPoint ? problem : "Tap a spot on the hill first."}
        onCancel={backToDraft}
        onConfirm={() => {
          if (!check?.ok) return;
          if (movingAssetIndex !== undefined) state.moveAsset(movingAssetIndex, check.placement.at);
          else if (gun) state.placeGun(check.placement.at);
          else if (asset && draft.lodgePad !== undefined) {
            const pads = lodgeAttachPads(state.lodgeTier);
            if (pads[draft.lodgePad]) state.placeAsset(asset, pads[draft.lodgePad]);
          } else if (asset) state.placeAsset(asset, check.placement.at);
          if (useGameStore.getState().cash !== state.cash || useGameStore.getState().assets !== state.assets) {
            buildConfirmed(movingAssetIndex === undefined ? `${item.label} is going up.` : `${item.label} moved.`);
            finishPlacement();
          }
        }}
      />
    );
  }

  if (draft.minimized) {
    const label = check?.ok ? `${item.label} · ${formatMoney(check.cost)}` : item.label;
    return <MinimizedBar summary={label} canReview={!!tapPoint} />;
  }

  return (
    <div className="panel trail-bar-in space-y-1 px-2 py-1.5 sm:space-y-1.5 sm:px-2.5 sm:py-2 [--lift:3px]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-extrabold text-ink-soft">
            {gun
              ? "Tap within pipe reach of base or a gun · 2 fingers move map"
              : draft.lodgePad !== undefined
                ? `Confirm ${item.label} on lodge pad ${draft.lodgePad + 1} (+5% annex) · 2 fingers move map`
                : asset && ASSET_CATALOG[asset].attachable
                  ? `Tap the lodge, pick a pad, or place in the base area without the bonus · 2 fingers move map`
                  : `Tap a spot for ${item.label} · 2 fingers move map`}
          </p>
          {check?.ok && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-extrabold tabular-nums">
              <span className="chip bg-gold px-1.5 py-0.5 text-xs [--lift:2px]">{formatMoney(check.cost)}</span>
              {check.attached && <span className="chip px-1.5 py-0.5 text-xs [--lift:2px]">+5% attached</span>}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="hidden sm:block">
            <DraftActions canReview={!!tapPoint} />
          </div>
          <MinimizeButton />
        </div>
      </div>
      {problem && <p className="text-xs font-extrabold text-barn-deep">{problem}</p>}
      <div className="flex justify-end sm:hidden">
        <DraftActions canReview={!!tapPoint} />
      </div>
    </div>
  );
}

export function PlacementBar() {
  const active = usePlacementDraft((s) => s.active);
  const kind = usePlacementDraft((s) => s.kind);
  const minimized = usePlacementDraft((s) => s.minimized);
  const review = usePlacementDraft((s) => s.review);
  const showPlacementColors = usePlacementDraft((s) => s.kind !== "trail" && s.kind !== "lift" && !s.minimized && !s.review);
  if (!active) return null;
  const widthClass = review
    ? "max-w-[440px] sm:max-w-[28rem] md:max-w-[34rem]"
    : minimized
      ? "max-w-[340px] sm:max-w-[28rem] md:max-w-[34rem]"
      : "max-w-[420px] sm:max-w-[28rem] md:max-w-[34rem] short:max-w-[520px]";
  return (
    <div className={`pointer-events-auto max-h-[65dvh] w-full overflow-y-auto px-0.5 sm:px-1 ${widthClass}`} data-placement-kind={kind}>
      {showPlacementColors && <p className="key mb-1 px-2 py-0.5 text-[0.72rem] font-extrabold [--lift:2px]">Green means go. Red means find another spot.</p>}
      {kind === "trail" ? <TrailBar /> : kind === "lift" ? <LiftBar /> : <SiteBar />}
    </div>
  );
}
