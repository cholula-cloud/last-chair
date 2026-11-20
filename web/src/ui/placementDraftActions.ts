import type { LiftType } from "@/game/types";
import { ASSET_CATALOG, lodgeAttachPads, type AssetId } from "@/game/base";
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
    liftPhase: "bottom",
    top: undefined,
    bottom: undefined,
    snapped: false,
    tapPoint: undefined,
    focus: null,
    glade: false,
    connectCrossings: true,
    lodgePad: undefined,
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

/** Place an attachable venue on a specific lodge pad (annex +5%). Opens review on confirm. */
export function startLodgePadPlacement(asset: AssetId, padIndex: number) {
  const tier = useGameStore.getState().lodgeTier;
  const at = lodgeAttachPads(tier)[padIndex];
  if (!at || !ASSET_CATALOG[asset].attachable) return;
  startDraft("asset", undefined, asset);
  usePlacementDraft.setState({ lodgePad: padIndex, tapPoint: at, review: true });
  requestFocus([at]);
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
    liftPhase: "bottom",
    top: undefined,
    bottom: undefined,
    snapped: false,
    tapPoint: undefined,
    focus: null,
    strokes: [],
    redo: [],
    activeStroke: null,
    lodgePad: undefined,
  });
  useGameStore.getState().setBuildMode(false);
}

export function requestFocus(points: import("@/game/terrain").XZ[]) {
  usePlacementDraft.setState((s) => ({
    focus: { points, nonce: (s.focus?.nonce ?? 0) + 1 },
  }));
}
