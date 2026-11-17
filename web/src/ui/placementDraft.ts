"use client";

import { create } from "zustand";
import type { XZ } from "@/game/terrain";

/** The top terminal the player is considering. Per-session UI state, never saved. */
export const usePlacementDraft = create<{ candidateTop?: XZ }>(() => ({}));
