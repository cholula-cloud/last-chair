"use client";

import { useEffect, useId, useMemo } from "react";
import {
  getOverlayLayer,
  overlayLayers,
  type LegendEntry,
  type OverlayPattern,
} from "@/game/overlays";
import { LayerLegend, LayerPanel } from "./MapLayers";
import { useLayers } from "./mapLayerStore";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { usePlacementDraft } from "@/ui/placementDraft";
import { CloseIcon } from "@/ui/kit/icons";
import {
  isPainting,
  pickLayer,
  setProbe,
  toggleStrip,
  turnLayerOff,
  useActiveLayer,
} from "@/ui/overlayUi";

const SWATCH = 16;

/** A legend swatch: the layer colour as a light fill with the pattern drawn in the same colour. */
export function PatternSwatch({ color, pattern }: { color: string; pattern: OverlayPattern }) {
  const id = useId();
  const dense = pattern === "dense-hatch";
  return (
    <svg width={SWATCH} height={SWATCH} viewBox="0 0 20 20" aria-hidden="true" className="shrink-0 rounded-[5px]">
      <defs>
        <pattern id={id} width={dense ? 5 : 8} height={dense ? 5 : 8} patternUnits="userSpaceOnUse">
          {pattern === "dots" && <circle cx="4" cy="4" r="1.8" fill={color} />}
          {pattern === "stripes" && <path d="M-1 9L9-1M-1 1L1-1M7 9L9 7" stroke={color} strokeWidth="2" />}
          {pattern === "hatch" && <path d="M-1 9L9-1M-1 -1L9 9" stroke={color} strokeWidth="1.3" />}
          {dense && <path d="M-1 6L6-1M-1 -1L6 6" stroke={color} strokeWidth="1.6" />}
        </pattern>
      </defs>
      <rect width="20" height="20" fill={color} fillOpacity="0.3" />
      <rect width="20" height="20" fill={`url(#${id})`} />
      <rect x="0.5" y="0.5" width="19" height="19" rx="4.5" fill="none" stroke={color} />
    </svg>
  );
}

function LegendChip({ entry }: { entry: LegendEntry }) {
  return (
    <li className="chip flex h-8 items-center gap-1 px-1.5 text-[0.7rem] font-extrabold" title={entry.detail} aria-label={entry.detail}>
      <PatternSwatch color={entry.color} pattern={entry.pattern} />
      {entry.label}
    </li>
  );
}

/** Legend chips for the layer on the map, with a 44 px Off key. */
export function OverlayLegend() {
  const layer = getOverlayLayer(useActiveLayer());
  const placing = usePlacementDraft((s) => s.active);
  const wear = useLayers((s) => s.wear);
  const gunView = useLayers((s) => s.gunView);
  if (!layer || (layer.id !== "slope" && !placing)) return null;
  return (
    <div className="pointer-events-none flex flex-wrap items-center justify-end gap-1" data-overlay-legend={layer.id}>
      {layer.id === "slope" ? <ul className="flex flex-wrap items-center justify-end gap-1" aria-label={`${layer.label} legend`}>
        {layer.legend.map((entry) => <LegendChip key={entry.id} entry={entry} />)}
      </ul> : (
        <div className="panel min-w-0 flex-1 p-1.5">
          <LayerLegend layer={layer.id} wear={layer.id === "conditions" && wear} gunView={gunView} />
        </div>
      )}
      <button type="button" onClick={turnLayerOff} aria-label={`Turn off the ${layer.label} layer`}
        className="key press pointer-events-auto grid size-11 shrink-0 place-items-center !rounded-full [--lift:3px]">
        <CloseIcon size={18} />
      </button>
    </div>
  );
}

/** The layer strip: one button per implemented layer and Off. */
export function LayerStrip() {
  const open = useLayers((s) => s.stripOpen);
  const shown = useActiveLayer();
  if (!open) return null;
  return (
    <div className="pointer-events-auto flex max-w-full gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Map layers" data-layer-strip>
      {overlayLayers().map((layer) => (
        <button key={layer.id} type="button" aria-pressed={shown === layer.id} onClick={() => pickLayer(layer.id)}
          className="key press min-h-11 shrink-0 px-4 text-sm font-extrabold">
          {layer.label}
        </button>
      ))}
      <button type="button" aria-pressed={shown === null} onClick={turnLayerOff}
        className="key press min-h-11 shrink-0 px-4 text-sm font-extrabold">
        Off
      </button>
    </div>
  );
}

export function LayersButton() {
  const open = useLayers((s) => s.stripOpen);
  const shown = useActiveLayer();
  return (
    <button type="button" aria-pressed={open || shown !== null} onClick={toggleStrip}
      className="key press min-h-11 px-3 text-sm font-extrabold">
      Layers
    </button>
  );
}

/** What a tap or hold on the map found, for the layer on screen. */
export function ReadoutCard() {
  const probe = useLayers((s) => s.point);
  const layer = getOverlayLayer(useActiveLayer());
  const readout = useMemo(
    () => (probe && layer?.id === "slope" ? layer.readout(probe, { terrain: TERRAIN, state: useGameStore.getState() }) : null),
    [probe, layer],
  );
  if (!readout) return null;
  return (
    <div className="panel pointer-events-auto flex max-w-[22rem] items-start gap-2 px-3 py-2" role="status" data-overlay-readout>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-extrabold">{readout.headline}</p>
        {readout.chips.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {readout.chips.map((chip) => <span key={chip} className="chip px-2 py-0.5 text-xs font-extrabold">{chip}</span>)}
          </div>
        )}
      </div>
      <button type="button" onClick={() => setProbe(null)} aria-label="Close the readout"
        className="key key-sm press grid size-11 shrink-0 place-items-center">
        <CloseIcon size={18} />
      </button>
    </div>
  );
}

export function SnowLayerControls() {
  const layer = useActiveLayer();
  if (!layer || layer === "slope") return null;
  return <LayerPanel layer={layer} embedded />;
}

/** Keeps overlay state honest: the automatic slope layer resets when painting ends, a vanished layer drops its readout. */
export function OverlayStateSync() {
  const painting = usePlacementDraft((s) => isPainting(s));
  const layer = useActiveLayer();
  useEffect(() => {
    if (!painting) useLayers.setState({ autoOff: false });
  }, [painting]);
  useEffect(() => {
    if (!layer) setProbe(null);
  }, [layer]);
  return null;
}
