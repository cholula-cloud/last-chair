"use client";

import { create } from "zustand";
import type { XZ } from "@/game/terrain";

export const useTrailPreview = create<{ path: XZ[] | null }>(() => ({ path: null }));

export function setTrailPreview(path: XZ[] | null) {
  useTrailPreview.setState({ path });
}