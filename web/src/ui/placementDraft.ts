"use client";

import { create } from "zustand";
import type { XZ } from "@/game/terrain";

export type PlacementFocus = {
  points: XZ[];
  nonce: number;
};

/** The top terminal the player is considering. Per-session UI state, never saved. */
export const usePlacementDraft = create<{
  candidateTop?: XZ;
  focus: PlacementFocus | null;
}>(() => ({ focus: null }));

export function requestFocus(points: XZ[]) {
  usePlacementDraft.setState((s) => ({
    focus: { points, nonce: (s.focus?.nonce ?? 0) + 1 },
  }));
}