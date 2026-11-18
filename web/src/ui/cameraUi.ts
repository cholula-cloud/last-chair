"use client";

import { create } from "zustand";

/** Camera UI state shared by the HUD and the scene. Per-session, never saved. */
export const useCameraUi = create<{
  /** The guest being followed when a pan drag ended follow; the chip restores it. */
  resumeFollowId: string | null;
  /** Bumped by the recenter button; the camera rig glides home when it changes. */
  recenterNonce: number;
}>(() => ({ resumeFollowId: null, recenterNonce: 0 }));

export const requestRecenter = () =>
  useCameraUi.setState((s) => ({ recenterNonce: s.recenterNonce + 1 }));
