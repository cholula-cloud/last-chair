"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { LAYER_SHORT } from "@/game/mapLayers";
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
import { CloseIcon, LayersIcon } from "@/ui/kit/icons";
import {
  isPainting,
  pickLayer,
  setProbe,
  toggleLayersRail,
  turnLayerOff,
  useActiveLayer,
} from "@/ui/overlayUi";

const SWATCH = 16;

/** A legend swatch: the layer colour as a light fill with the pattern drawn in the same colour. */
function PatternSwatch({ color, pattern }: { color: string; pattern: OverlayPattern }) {
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

function LegendChip({ entry, compact }: { entry: LegendEntry; compact?: boolean }) {
  const label = compact && entry.label === "Double black" ? "2×" : entry.label;
  return (
    <li className="inline-flex items-center gap-1 text-[0.72rem] font-extrabold leading-none" title={entry.detail} aria-label={entry.detail}>
      <PatternSwatch color={entry.color} pattern={entry.pattern} />
      <span>{label}</span>
    </li>
  );
}

/** Legend chips for the layer on the map, with a 44 px Off key. */
export function OverlayLegend({
  allowOff = true,
  className = "",
  docked = false,
}: {
  allowOff?: boolean;
  className?: string;
  /** Bottom dock: full width, centered, no float over the mountain. */
  docked?: boolean;
}) {
  const layer = getOverlayLayer(useActiveLayer());
  const placing = usePlacementDraft((s) => s.active);
  const wear = useLayers((s) => s.wear);
  const gunView = useLayers((s) => s.gunView);
  const ops = layer?.id === "crowds" || layer?.id === "revenue" || layer?.id === "demand";
  const trails = layer?.id === "trails";
  if (!layer || (layer.id !== "slope" && !placing && !ops && !trails)) return null;
  if (docked && layer.id !== "slope" && !ops && !trails) return null;
  const rootClass = docked
    ? "pointer-events-auto panel hud-surface flex w-full flex-wrap items-center justify-center gap-2 px-3 py-2"
    : `pointer-events-none flex max-w-full items-center justify-end gap-1.5 ${className}`;
  return (
    <div className={rootClass} data-overlay-legend={layer.id}>
      {layer.id === "slope" ? (
        <ul
          className={
            docked
              ? "flex flex-wrap items-center justify-center gap-2"
              : "chip pointer-events-auto flex min-h-9 flex-nowrap items-center gap-2 px-2.5 py-1"
          }
          aria-label={`${layer.label} legend`}
        >
          {layer.legend.map((entry) => <LegendChip key={entry.id} entry={entry} compact={!docked} />)}
        </ul>
      ) : layer.id === "trails" || layer.id === "crowds" || layer.id === "revenue" || layer.id === "demand" ? (
        <ul className="chip pointer-events-auto flex min-h-9 flex-wrap items-center gap-2 px-2.5 py-1"
          aria-label={`${layer.label} legend`}>
          {layer.legend.map((entry) => <LegendChip key={entry.id} entry={entry} />)}
        </ul>
      ) : (
        <div className={docked ? "min-w-0 flex-1" : "panel min-w-0 flex-1 p-1.5"}>
          <LayerLegend layer={layer.id} wear={layer.id === "conditions" && wear} gunView={gunView} />
        </div>
      )}
      {allowOff && !docked && (
        <button type="button" onClick={turnLayerOff} aria-label={`Turn off the ${layer.label} layer`}
          className="key key-sm press pointer-events-auto grid size-11 shrink-0 place-items-center !rounded-full [--lift:3px]">
          <CloseIcon size={18} />
        </button>
      )}
    </div>
  );
}

/** The layer strip: one button per implemented layer and Off. */
export function LayerStrip({ allowOff = true, className = "" }: { allowOff?: boolean; className?: string }) {
  const open = useLayers((s) => s.stripOpen);
  const shown = useActiveLayer();
  if (!open) return null;
  return (
    <div className={`pointer-events-auto flex max-w-full gap-1.5 overflow-x-auto pb-1 ${className}`} role="group" aria-label="Map layers" data-layer-strip>
      {overlayLayers().map((layer) => (
        <button
          key={layer.id}
          type="button"
          aria-pressed={shown === layer.id}
          title={layer.label}
          onClick={() => pickLayer(layer.id, allowOff)}
          className="key press flex min-h-11 shrink-0 flex-col items-center justify-center px-2.5 py-1 text-[0.72rem] font-extrabold leading-tight sm:min-w-[3.25rem]"
        >
          <span className="text-[0.75rem] font-extrabold text-ink">{LAYER_SHORT[layer.id]}</span>
        </button>
      ))}
      {allowOff && <button type="button" aria-pressed={shown === null} onClick={turnLayerOff}
        className="key press min-h-11 shrink-0 px-4 text-sm font-extrabold">
        Off
      </button>}
    </div>
  );
}

export function LayersButton({ compact = false }: { compact?: boolean }) {
  const open = useLayers((s) => s.stripOpen);
  const shown = useActiveLayer();
  return (
    <button
      type="button"
      aria-pressed={open || shown !== null}
      aria-label="Layers"
      onClick={toggleLayersRail}
      className={
        compact
          ? "key press pointer-events-auto flex size-11 shrink-0 items-center justify-center gap-1.5 !rounded-full [--lift:3px] md:w-auto md:!rounded-[var(--r-key)] md:px-3 md:text-xs md:font-extrabold"
          : "key press min-h-11 px-3 text-sm font-extrabold"
      }
    >
      {compact ? (
        <>
          <LayersIcon size={19} />
          <span className="hidden md:inline">Layers</span>
        </>
      ) : (
        "Layers"
      )}
    </button>
  );
}

/** What a tap or hold on the map found, for the layer on screen. */
export function ReadoutCard() {
  const probe = useLayers((s) => s.point);
  const layer = getOverlayLayer(useActiveLayer());
  const game = useGameStore();
  const readout = useMemo(() => {
    if (!probe || !layer) return null;
    if (layer.id === "slope") return layer.readout(probe, { terrain: TERRAIN });
    if (layer.id === "crowds" || layer.id === "revenue" || layer.id === "demand" || layer.id === "trails") {
      return layer.readout(probe, game);
    }
    return null;
  }, [probe, layer, game]);
  if (!readout) return null;
  return (
    <div className="panel pointer-events-auto flex max-w-[22rem] items-start gap-2 px-3 py-2" role="status" data-overlay-readout>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-extrabold">{readout.headline}</p>
        {readout.chips.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {readout.chips.map((chip) => <span key={chip} className="well px-2 py-0.5 text-xs font-extrabold">{chip}</span>)}
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

export function SnowLayerControls({ docked = false, compact = false }: { docked?: boolean; compact?: boolean }) {
  const [adjustOpen, setAdjustOpen] = useState(!compact);
  const layer = useActiveLayer();
  if (
    !layer ||
    layer === "slope" ||
    layer === "crowds" ||
    layer === "revenue" ||
    layer === "demand" ||
    layer === "trails"
  ) {
    return null;
  }
  if (docked || compact) {
    return (
      <div className="pointer-events-auto w-full">
        {!adjustOpen ? (
          <button
            type="button"
            className="key press min-h-11 w-full px-3 text-sm font-extrabold"
            onClick={() => setAdjustOpen(true)}
          >
            Adjust layer
          </button>
        ) : (
          <div className="max-h-[36dvh] w-full overflow-y-auto">
            <div className="mb-1 flex justify-end">
              <button
                type="button"
                className="key key-sm press grid min-h-11 min-w-11 place-items-center px-2 text-xs font-extrabold"
                onClick={() => setAdjustOpen(false)}
              >
                Hide
              </button>
            </div>
            <LayerPanel layer={layer} compact />
          </div>
        )}
      </div>
    );
  }
  return <LayerPanel layer={layer} />;
}

/** Layer strip, color key, and snow controls in the bottom thumb zone instead of over the map. */
export function LayerBottomDock() {
  const open = useLayers((s) => s.stripOpen);
  if (!open) return null;
  return (
    <div
      className="popover-in origin-bottom pointer-events-auto flex w-full flex-col items-stretch gap-1.5 sm:max-w-[26rem] md:max-w-[34rem]"
      data-layer-dock="true"
    >
      <LayerStrip allowOff className="w-full snap-x snap-mandatory justify-start sm:justify-center" />
      <ReadoutCard />
      <OverlayLegend allowOff docked />
      <SnowLayerControls docked compact />
    </div>
  );
}

/** Compact night-map layer UI (matches the daytime bottom dock). */
export function NightMapDock({ onBack }: { onBack: () => void }) {
  return (
    <div
      className="popover-in origin-bottom pointer-events-auto flex w-full max-w-[26rem] flex-col items-stretch gap-1.5 md:max-w-[34rem]"
      data-layer-dock="night"
    >
      <LayerStrip allowOff={false} className="w-full snap-x snap-mandatory justify-start" />
      <ReadoutCard />
      <OverlayLegend allowOff={false} docked />
      <SnowLayerControls docked compact />
      <button type="button" autoFocus className="key press min-h-11 w-full px-3 font-bold" onClick={onBack}>
        Back to recap
      </button>
    </div>
  );
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
