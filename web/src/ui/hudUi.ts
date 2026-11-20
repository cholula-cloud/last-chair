"use client";

import { create } from "zustand";

/** Session-only HUD visibility and density controls for iPhone/iPad map clearance. */
export const useHudUi = create<{
  /** Hides secondary HUD chrome (conditions, action bar, map rail, strips) to maximize map view. */
  hudHidden: boolean;
  /** Expands the compact Conditions pill into the full 3-column readout with status chips. */
  conditionsExpanded: boolean;
  /** Hides the conditions pill and action bar while map rail and top bar stay up. */
  bottomChromeMinimized: boolean;
}>(() => ({
  hudHidden: false,
  conditionsExpanded: false,
  bottomChromeMinimized: false,
}));

export function toggleHudHidden() {
  useHudUi.setState((s) => ({
    hudHidden: !s.hudHidden,
    bottomChromeMinimized: s.hudHidden ? s.bottomChromeMinimized : false,
  }));
}

export function setHudHidden(hudHidden: boolean) {
  useHudUi.setState({ hudHidden, ...(hudHidden ? {} : { bottomChromeMinimized: false }) });
}

export function toggleConditionsExpanded() {
  useHudUi.setState((s) => ({ conditionsExpanded: !s.conditionsExpanded }));
}

export function toggleBottomChromeMinimized() {
  useHudUi.setState((s) => ({ bottomChromeMinimized: !s.bottomChromeMinimized }));
}

/** Hill chrome wins over the layer dock when the player brings controls back. */
export function showBottomChrome() {
  useHudUi.setState({ bottomChromeMinimized: false });
}

export function setBottomChromeMinimized(bottomChromeMinimized: boolean) {
  useHudUi.setState({ bottomChromeMinimized });
}
