import type { LiftType } from "@/game/types";
import type { AssetId } from "@/game/base";
import { STANDARD_BRUSH_WIDTH } from "@/game/paintedTrail";
import { useGameStore } from "@/game/store";
import { useCameraUi } from "@/ui/cameraUi";
import { usePlacementDraft } from "@/ui/placementDraft";

type PlacementKind = "lift" | "trail" | "asset" | "gun";

function startDraft(kind: PlacementKind, type?: LiftType, asset?: AssetId) {
  useGameStore.getState().setBuildMode(true);
  useGameStore.getState().setFollowId(null);
  useCameraUi.setState({ resumeFollowId: null });
  usePlacementDraft.setState({
    active: true,
    moveCamera: false,
    minimized: false,
    kind,
    asset,
    movingAssetIndex: undefined,
    ...(type ? { type } : {}),
    review: false,
    step: "top",
    top: undefined,
    bottom: undefined,
    snapped: false,
    tapPoint: undefined,
    focus: null,
    glade: false,
    connectCrossings: false,
    brushWidth: STANDARD_BRUSH_WIDTH,
    erasing: false,
    strokes: [],
    redo: [],
    activeStroke: null,
  });
}

export function startPlacement(type: LiftType) {
  useGameStore.getState().setSelectedLiftType(type);
  startDraft("lift", type);
}

export function startPaintPlacement() {
  startDraft("trail");
}

export function startAssetPlacement(asset: AssetId, movingAssetIndex?: number) {
  startDraft("asset", undefined, asset);
  if (movingAssetIndex !== undefined) usePlacementDraft.setState({ movingAssetIndex });
}

export function startGunPlacement() {
  startDraft("gun");
}

export function cancelPlacement() {
  finishPlacement();
}

export function finishPlacement() {
  usePlacementDraft.setState({
    active: false,
    moveCamera: false,
    minimized: false,
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

export function requestFocus(points: import("@/game/terrain").XZ[]) {
  usePlacementDraft.setState((s) => ({
    focus: { points, nonce: (s.focus?.nonce ?? 0) + 1 },
  }));
}
