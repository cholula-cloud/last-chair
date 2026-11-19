"use client";

import { useLayers } from "./mapLayerStore";
export { useActiveLayer } from "./mapLayerStore";
import { nextSelection, resolveActiveLayer, type OverlayId } from "@/game/overlays";
import type { XZ } from "@/game/terrain";
import { usePlacementDraft } from "@/ui/placementDraft";

/** True while the paint tool is open and the draft is not in review. */
export function isPainting(draft: { active: boolean; kind: string; review: boolean }): boolean {
  return draft.active && draft.kind === "trail" && !draft.review;
}

export function currentLayer(): OverlayId | null {
  const { layer: selected, autoOff } = useLayers.getState();
  return resolveActiveLayer(selected, autoOff, isPainting(usePlacementDraft.getState()));
}

/** Strip button: turns the shown layer off, or switches to the picked one. */
export function pickLayer(picked: OverlayId) {
  const next = nextSelection(currentLayer(), picked);
  useLayers.setState({ layer: next, autoOff: next === null, point: null });
}

export function turnLayerOff() {
  useLayers.setState({ layer: null, autoOff: true, point: null });
}

export function toggleStrip() {
  useLayers.setState((s) => ({ stripOpen: !s.stripOpen }));
}

export function setProbe(at: XZ | null) {
  useLayers.setState({ point: at });
}
