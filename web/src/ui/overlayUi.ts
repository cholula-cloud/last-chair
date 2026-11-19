"use client";

import { create } from "zustand";
import { nextSelection, resolveActiveLayer, type OverlayId } from "@/game/overlays";
import type { XZ } from "@/game/terrain";
import { usePlacementDraft } from "@/ui/placementDraft";

/** Map overlay state. Per session, never saved. */
export const useOverlayUi = create<{
  /** The layer the player chose, or null. */
  selected: OverlayId | null;
  /** The player turned the automatic slope layer off during this paint session. */
  autoOff: boolean;
  /** The layer strip is open. */
  stripOpen: boolean;
  /** The map point the readout card describes. */
  probe: XZ | null;
}>(() => ({ selected: null, autoOff: false, stripOpen: false, probe: null }));

/** True while the paint tool is open and the draft is not in review. */
export function isPainting(draft: { active: boolean; kind: string; review: boolean }): boolean {
  return draft.active && draft.kind === "trail" && !draft.review;
}

/** The layer on the map: what the player chose, or the slope layer while painting. */
export function useActiveLayer(): OverlayId | null {
  const selected = useOverlayUi((s) => s.selected);
  const autoOff = useOverlayUi((s) => s.autoOff);
  const painting = usePlacementDraft((s) => isPainting(s));
  return resolveActiveLayer(selected, autoOff, painting);
}

export function currentLayer(): OverlayId | null {
  const { selected, autoOff } = useOverlayUi.getState();
  return resolveActiveLayer(selected, autoOff, isPainting(usePlacementDraft.getState()));
}

/** Strip button: turns the shown layer off, or switches to the picked one. */
export function pickLayer(picked: OverlayId) {
  const next = nextSelection(currentLayer(), picked);
  useOverlayUi.setState({ selected: next, autoOff: next === null, probe: null });
}

export function turnLayerOff() {
  useOverlayUi.setState({ selected: null, autoOff: true, probe: null });
}

export function toggleStrip() {
  useOverlayUi.setState((s) => ({ stripOpen: !s.stripOpen }));
}

export function setProbe(at: XZ | null) {
  useOverlayUi.setState({ probe: at });
}
