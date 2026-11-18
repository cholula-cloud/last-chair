"use client";

import { create } from "zustand";
import type { LiftType } from "@/game/types";
import type { AssetId } from "@/game/base";
import { STANDARD_BRUSH_WIDTH, type PaintStroke } from "@/game/paintedTrail";
import { useGameStore } from "@/game/store";
import { useCameraUi } from "@/ui/cameraUi";
import type { XZ } from "@/game/terrain";

export type PlacementFocus = {
  points: XZ[];
  nonce: number;
};

/** Kept for saved drafts and callers that read it. A lift is now placed in one drag, so it is always "top". */
export type PlacementStep = "top" | "bottom";
type PlacementKind = "lift" | "trail" | "asset" | "gun";

/** Session-only build drafts. The game state changes only on confirmation. */
export const usePlacementDraft = create<{
  active: boolean;
  showBuildGrid: boolean;
  moveCamera: boolean;
  kind: PlacementKind;
  asset?: AssetId;
  review: boolean;
  type: LiftType;
  step: PlacementStep;
  top?: XZ;
  bottom?: XZ;
  snapped: boolean;
  tapPoint?: XZ;
  focus: PlacementFocus | null;
  glade: boolean;
  brushWidth: number;
  erasing: boolean;
  strokes: PaintStroke[];
  redo: PaintStroke[];
  activeStroke: PaintStroke | null;
  lodgeRequested: number;
}>(() => ({
  active: false,
  showBuildGrid: false,
  moveCamera: false,
  kind: "lift",
  review: false,
  type: "surface",
  step: "top",
  snapped: false,
  focus: null,
  glade: false,
  brushWidth: STANDARD_BRUSH_WIDTH,
  erasing: false,
  strokes: [],
  redo: [],
  activeStroke: null,
  lodgeRequested: 0,
}));

export function requestLodge() {
  usePlacementDraft.setState((s) => s.active ? {} : { lodgeRequested: s.lodgeRequested + 1 });
}

export function requestFocus(points: XZ[]) {
  usePlacementDraft.setState((s) => ({
    focus: { points, nonce: (s.focus?.nonce ?? 0) + 1 },
  }));
}

export function startPlacement(type: LiftType) {
  useGameStore.getState().setSelectedLiftType(type);
  startDraft("lift", type);
}

export function startPaintPlacement() {
  startDraft("trail");
}

export function startAssetPlacement(asset: AssetId) {
  startDraft("asset", undefined, asset);
}

export function startGunPlacement() {
  startDraft("gun");
}

function startDraft(kind: PlacementKind, type?: LiftType, asset?: AssetId) {
  useGameStore.getState().setBuildMode(true);
  useGameStore.getState().setFollowId(null);
  useCameraUi.setState({ resumeFollowId: null });
  usePlacementDraft.setState({
    active: true,
    moveCamera: false,
    kind,
    asset,
    ...(type ? { type } : {}),
    review: false,
    step: "top",
    top: undefined,
    bottom: undefined,
    snapped: false,
    tapPoint: undefined,
    focus: null,
    glade: false,
    brushWidth: STANDARD_BRUSH_WIDTH,
    erasing: false,
    strokes: [],
    redo: [],
    activeStroke: null,
  });
}

export function cancelPlacement() {
  finishPlacement();
}

export function finishPlacement() {
  usePlacementDraft.setState({
    active: false,
    moveCamera: false,
    review: false,
    asset: undefined,
    step: "top",
    top: undefined,
    bottom: undefined,
    snapped: false,
    tapPoint: undefined,
    focus: null,
    strokes: [],
    redo: [],
    activeStroke: null,
  });
  useGameStore.getState().setBuildMode(false);
}

export function undoStroke() {
  usePlacementDraft.setState(({ strokes, redo }) => {
    const last = strokes.at(-1);
    return last ? { strokes: strokes.slice(0, -1), redo: [...redo, last] } : {};
  });
}

export function redoStroke() {
  usePlacementDraft.setState(({ strokes, redo }) => {
    const last = redo.at(-1);
    return last ? { strokes: [...strokes, last], redo: redo.slice(0, -1) } : {};
  });
}
