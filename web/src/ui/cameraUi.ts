"use client";

import { create } from "zustand";

/** Camera UI state shared by the HUD and the scene. Per-session, never saved. */
export const useCameraUi = create<{
  /** The guest being followed when a pan drag ended follow; the chip restores it. */
  resumeFollowId: string | null;
  /** Bumped by the recenter button; the camera rig glides home when it changes. */
  recenterNonce: number;
  /** Optional world XZ focus target (e.g. Last Chair lift ease). */
  focusPoint: { nonce: number; x: number; z: number } | null;
}>(() => ({ resumeFollowId: null, recenterNonce: 0, focusPoint: null }));

export const requestRecenter = () =>
  useCameraUi.setState((s) => ({ recenterNonce: s.recenterNonce + 1 }));

export const requestFocusPoint = (x: number, z: number) =>
  useCameraUi.setState((s) => ({
    focusPoint: { nonce: (s.focusPoint?.nonce ?? 0) + 1, x, z },
  }));
