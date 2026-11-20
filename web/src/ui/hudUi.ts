"use client";

import { create } from "zustand";

/** Session-only HUD visibility and density controls for iPhone/iPad map clearance. */
export const useHudUi = create<{
  /** Hides secondary HUD chrome (conditions, action bar, map rail, strips) to maximize map view. */
  hudHidden: boolean;
  /** Expands the compact Conditions pill into the full 3-column readout with status chips. */
  conditionsExpanded: boolean;
}>(() => ({
  hudHidden: false,
  conditionsExpanded: false,
}));

export function toggleHudHidden() {
  useHudUi.setState((s) => ({ hudHidden: !s.hudHidden }));
}

export function setHudHidden(hudHidden: boolean) {
  useHudUi.setState({ hudHidden });
}

export function toggleConditionsExpanded() {
  useHudUi.setState((s) => ({ conditionsExpanded: !s.conditionsExpanded }));
}
