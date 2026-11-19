"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { overlayModel, type MapLayer, type MapTime } from "@/game/mapLayers";
import { useGameStore } from "@/game/store";
import type { XZ } from "@/game/terrain";
import type { SnowPreset } from "@/game/types";
import { usePlacementDraft } from "./placementDraft";

export const useLayers = create<{
  layer: MapLayer | null; time: MapTime; preset: SnowPreset; wear: boolean; point: XZ | null;
}>(() => ({ layer: null, time: "Now", preset: "mid", wear: false, point: null }));

export function useActiveLayer() {
  const manual = useLayers(s => s.layer);
  const draft = usePlacementDraft(s => s.active ? s.kind : null);
  const day = useGameStore(s => s.phase === "day");
  return day ? draft === "trail" ? "slope" : draft ? null : manual : null;
}

/** Hold a forecast steady while reading it. Live layers refresh every five game minutes. */
export function useLayerSnapshot(layer: MapLayer) {
  const time = useLayers(s => layer === "conditions" ? s.time : "Now");
  const preset = useLayers(s => s.preset);
  const revision = useGameStore(s => [s.dayIndex, s.phase, s.paused, s.trails.length, s.lifts.length, s.guns.length,
    time === "Now" && layer !== "slope" ? Math.floor(s.clockMin / 5) : 0].join("/"));
  return useMemo(() => {
    const state = useGameStore.getState();
    return { state, model: overlayModel(state, time, preset) };
    // revision groups simulation frames that paint the same layer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, layer, time, preset]);
}
