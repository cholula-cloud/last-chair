"use client";

import { useMemo } from "react";
import { ASSET_CATALOG, CHAIR_TIER } from "@/game/base";
import { liftLength, liftVertical, placementReason } from "@/game/descent";
import { formatMoney } from "@/game/format";
import { chooseLift, liftCapacityPerHour, liftWaitMin, rideMinutes } from "@/game/lifts";
import { BRUSH_WIDTHS } from "@/game/paintedTrail";
import { PERSONAS } from "@/game/personas";
import {
  checkAssetPlacement, checkGunPlacement, checkPaint, checkPlacement,
  commitPaint, placeLift,
} from "@/game/rules";
import type { GameState } from "@/game/state";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { isOverSkill } from "@/game/trails";
import { LIFT_LABELS, liftCost } from "@/game/types";
import { BuildImpactCard } from "@/ui/BuildImpactCard";
import { DifficultyIcon } from "@/ui/kit/icons";
import { PrimaryButton } from "@/ui/kit/parts";
import {
  cancelPlacement, finishPlacement, redoStroke, undoStroke, usePlacementDraft,
} from "@/ui/placementDraft";

const BRUSH_NAMES = ["Narrow", "Standard", "Wide", "Boulevard"];
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

function TrailBar() {
  const draft = usePlacementDraft();
  const state = useGameStore();
  const strokes = useMemo(
    () => draft.activeStroke ? [...draft.strokes, draft.activeStroke] : draft.strokes,
    [draft.activeStroke, draft.strokes],
  );
  const preview = useMemo(
    () => strokes.length > 0 ? checkPaint(state, strokes) : null,
    [state, strokes],
  );
  const guests = preview ? Object.values(PERSONAS)
    .filter(({ id }) => !isOverSkill(id, preview.difficulty))
    .map(({ label }) => label).join(", ") : "";
  if (draft.review && preview) {
    const existing = preview.trailIndex == null ? null : state.trails[preview.trailIndex];
    return (
      <BuildImpactCard
        title={preview.trailIndex !== null ? "Review trail changes" : "Review painted trail"}
        facts={[
          { label: "Trail", value: existing?.name ?? `Painted trail ${state.trails.length + 1}` },
          { label: "Cost", value: formatMoney(preview.cost) },
          { label: "Difficulty", value: preview.difficulty },
          { label: "Length", value: feet(preview.lengthFt) },
          { label: "Vertical", value: feet(preview.verticalFt) },
          { label: "Area", value: acres(preview.acres) },
          { label: "Who can ski", value: guests || "None" },
          { label: "Lodge tier", value: "1" },
          ...(!preview.reason ? [{ label: "Queue estimate", value: queueImpact(state, commitPaint(state, strokes)) }] : []),
        ]}
        confirmLabel={preview.deleteTrail ? "Close trail" : preview.trailIndex !== null ? "Apply changes" : "Cut trail"}
        problem={preview.reason}
        onCancel={backToDraft}
        onConfirm={() => {
          state.commitPaint(strokes);
          if (useGameStore.getState().trails !== state.trails) finishPlacement();
        }}
      />
    );
  }
  return (
    <div className="panel space-y-2 px-3 pb-3 pt-2">
      <p className="text-sm font-extrabold">
        {draft.erasing
          ? "Drag over a trail to erase paint."
          : draft.strokes.length
            ? "Review the trail, or paint again to change its width."
            : "Drag from a green lift ring to the amber base ring. You can also connect to an open trail."}
      </p>
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
      <div className="grid grid-cols-3 gap-1">
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

function LiftBar() {
  const draft = usePlacementDraft();
  const state = useGameStore();
  const { type, top, bottom, step } = draft;
  const line = top ? { bottom: bottom ?? TERRAIN.base, top } : null;
  const check = line ? checkPlacement(state, type, line) : null;
  const capacity = liftCapacityPerHour(type, state.talentsOwned);
  const ride = line ? rideMinutes(type, line) : null;
  const cost = check?.ok ? check.cost : line ? liftCost(type, line) : 0;
  const problem = check && !check.ok ? placementReason(check.reason, { ...check, liftType: type }) : null;
  const length = line ? feet(liftLength(line) * TERRAIN.horizontalFeetPerUnit) : null;
  const vertical = line ? feet(liftVertical(line) * TERRAIN.feetPerUnit) : null;
  if (draft.review && line && check) {
    const after = check.ok ? placeLift(state, { type, ...line }) : state;
    const fallLine = after !== state ? after.trails.at(-1) : null;
    const guests = fallLine ? Object.values(PERSONAS).filter(({ id }) => !isOverSkill(id, fallLine.difficulty))
      .map(({ label }) => label).join(", ") : "";
    return (
      <BuildImpactCard
        title={`Review ${LIFT_LABELS[type]}`}
        facts={[
          { label: "Cost", value: formatMoney(cost) },
          { label: "Vertical", value: vertical ?? "0 ft" },
          { label: "Length", value: length ?? "0 ft" },
          { label: "Capacity", value: `${capacity} skiers/hour` },
          { label: "Ride time", value: `${ride?.toFixed(1)} min` },
          { label: "Lodge tier", value: type === "chair" ? String(CHAIR_TIER) : "1" },
          ...(fallLine ? [{ label: "Who can ski", value: guests || "None" }] : []),
          ...(check.ok ? [{ label: "Queue estimate", value: queueImpact(state, after) }] : []),
        ]}
        confirmLabel={`Place for ${formatMoney(cost)}`}
        problem={problem}
        onCancel={backToDraft}
        onConfirm={() => {
          state.placeLift({ type, ...line });
          if (useGameStore.getState().lifts !== state.lifts) finishPlacement();
        }}
      />
    );
  }
  return (
    <div className="panel space-y-2 px-3 pb-3 pt-2">
      <p className="text-sm font-extrabold" aria-live="polite">
        {step === "bottom" ? "Tap the lift bottom inside the base area"
          : top ? "Drag the top terminal to adjust the lift. Use two fingers to move the map."
          : "Tap where the lift should unload. Green rings mark buildable spots."}
      </p>
      {line && (
        <p className="text-xs font-bold">
          {formatMoney(cost)} · {length} long · {vertical} vertical · {capacity} skiers/hour · {ride?.toFixed(1)} min
          {draft.snapped ? " · Snapped" : ""}
        </p>
      )}
      {problem && <p className="text-xs font-bold text-barn-deep">{problem}</p>}
      <button type="button" className={actionClass}
        onClick={() => usePlacementDraft.setState({ step: step === "bottom" ? "top" : "bottom" })}>
        {step === "bottom" ? "Keep bottom" : "Move bottom"}
      </button>
      <DraftActions canReview={!!check && step === "top"} />
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
          { label: "Cost", value: formatMoney(check?.ok ? check.cost : item.cost) },
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
        {gun ? "Place the gun within pipe reach of the base or another gun."
          : `Choose a spot for ${item.label} near the lodge.`}
      </p>
      {problem && <p className="text-xs font-bold text-barn-deep">{problem}</p>}
      {check?.ok && <p className="text-xs font-bold">{formatMoney(check.cost)}{check.attached ? " · +5% attached" : ""}</p>}
      <DraftActions canReview={!!tapPoint} />
    </div>
  );
}

export function PlacementBar() {
  const active = usePlacementDraft((s) => s.active);
  const kind = usePlacementDraft((s) => s.kind);
  if (!active) return null;
  return (
    <div className="pointer-events-auto max-h-[65dvh] w-full max-w-[440px] overflow-y-auto px-1 short:max-w-[270px]" data-placement-kind={kind}>
      {kind === "trail" ? <TrailBar /> : kind === "lift" ? <LiftBar /> : <SiteBar />}
    </div>
  );
}
