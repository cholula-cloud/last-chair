"use client";

import { create } from "zustand";
import type { LiftType } from "@/game/types";
import { useGameStore } from "@/game/store";
import { useCameraUi } from "@/ui/cameraUi";
import type { XZ } from "@/game/terrain";

export type PlacementFocus = {
  points: XZ[];
  nonce: number;
};

export type PlacementStep = "top" | "bottom";

/** Session-only lift placement draft; never saved. */
export const usePlacementDraft = create<{
  active: boolean;
  type: LiftType;
  step: PlacementStep;
  top?: XZ;
  bottom?: XZ;
  snapped: boolean;
  tapPoint?: XZ;
  focus: PlacementFocus | null;
}>(() => ({
  active: false,
  type: "surface",
  step: "top",
  snapped: false,
  focus: null,
}));

export function requestFocus(points: XZ[]) {
  usePlacementDraft.setState((s) => ({
    focus: { points, nonce: (s.focus?.nonce ?? 0) + 1 },
  }));
}

export function startPlacement(type: LiftType) {
  useGameStore.getState().setSelectedLiftType(type);
  useGameStore.getState().setBuildMode(true);
  useGameStore.getState().setFollowId(null);
  useCameraUi.setState({ resumeFollowId: null });
  usePlacementDraft.setState({
    active: true,
    type,
    step: "top",
    top: undefined,
    bottom: undefined,
    snapped: false,
    tapPoint: undefined,
    focus: null,
  });
}

export function cancelPlacement() {
  usePlacementDraft.setState({
    active: false,
    step: "top",
    top: undefined,
    bottom: undefined,
    snapped: false,
    tapPoint: undefined,
    focus: null,
  });
  useGameStore.getState().setBuildMode(false);
}

export function finishPlacement() {
  usePlacementDraft.setState({
    active: false,
    step: "top",
    top: undefined,
    bottom: undefined,
    snapped: false,
    tapPoint: undefined,
    focus: null,
  });
}