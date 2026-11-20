/**
 * Map overlays (MASTER_PLAN §12): the layer registry and the slope layer. Pure data and rules, no
 * rendering. One layer shows at a time. A layer is an id, a label, a legend of colour plus pattern
 * entries, a shader mode the terrain material understands, and a readout for a tapped point.
 * Snow depth, snow-making and conditions (rows O2 and O3) join by adding an entry to `LAYERS`.
 */

import { LAYERS as LABELS, type MapLayer, type OpsLayer, type SnowLayer } from "./mapLayers";
import { opsReadout } from "./opsOverlay";
import type { GameState } from "./state";
import { onLease } from "./lease";
import { MAX_PAINTED_PITCH } from "./paintedTrail";
import { TERRAIN, type Terrain, type XZ } from "./terrain";
import { BLUE_MAX_PITCH, GREEN_MAX_PITCH, realGradeFactor } from "./trails";

export type OverlayId = MapLayer;

/** Fill patterns, so a layer reads without colour. The terrain shader and the legend both draw them. */
export type OverlayPattern = "dots" | "stripes" | "hatch" | "dense-hatch";

export type LegendEntry = {
  id: string;
  /** Short name on the legend chip. */
  label: string;
  /** What the entry means, in a full sentence. Used as the chip's accessible description. */
  detail: string;
  /** #rrggbb */
  color: string;
  pattern: OverlayPattern;
};

/** What a tap or hold on the map shows. The headline is a full sentence; live numbers go in chips. */
export type Readout = {
  headline: string;
  chips: string[];
  /** The legend entry this point falls in, when the layer has one. */
  entry?: string;
};

export type ReadoutContext = {
  terrain: Terrain;
};

type OverlayLayer = {
  /** The label on the strip button. */
  label: string;
  /** Mode the terrain shader branches on. Non-zero and unique per layer; 0 is off. */
  mode: number;
} & ({
  id: "slope";
  legend: readonly LegendEntry[];
  readout(at: XZ, ctx: ReadoutContext): Readout;
} | { id: SnowLayer } | {
  id: OpsLayer;
  legend: readonly LegendEntry[];
  readout(at: XZ, state: GameState): Readout;
});

// ---- Slope ----------------------------------------------------------------------------------

export type SlopeBand = "green" | "blue" | "black" | "double-black";

/** Contour lines on the slope layer, in feet of vertical. */
export const CONTOUR_INTERVAL_FT = 50;

/** Pitch bands, steepest last. Green to black reuse the painted-trail thresholds in `trails.ts`. */
export const SLOPE_BAND_LIMITS: readonly { band: SlopeBand; maxPitch: number }[] = [
  { band: "green", maxPitch: GREEN_MAX_PITCH },
  { band: "blue", maxPitch: BLUE_MAX_PITCH },
  { band: "black", maxPitch: MAX_PAINTED_PITCH },
  { band: "double-black", maxPitch: Infinity },
];

/** The band for a real pitch (rise over run). Not finite or negative counts as flat. */
export function slopeBand(pitch: number): SlopeBand {
  const p = Number.isFinite(pitch) && pitch > 0 ? pitch : 0;
  for (const { band, maxPitch } of SLOPE_BAND_LIMITS) if (p <= maxPitch) return band;
  return "double-black";
}

/** Real pitch of the ground at a point, the number a painted trail is classed by. Always >= 0. */
export function pitchAt(at: XZ, terrain: Terrain = TERRAIN): number {
  return terrain.grade(at.x, at.z) * realGradeFactor(terrain);
}

export const SLOPE_LEGEND: readonly LegendEntry[] = [
  { id: "green", label: "Green", detail: "Green ground is under 25 percent pitch.", color: "#2e9a5f", pattern: "dots" },
  { id: "blue", label: "Blue", detail: "Blue ground is 25 to 45 percent pitch.", color: "#2f78d6", pattern: "stripes" },
  { id: "black", label: "Black", detail: "Black ground is 45 to 65 percent pitch.", color: "#3a3956", pattern: "hatch" },
  {
    id: "double-black",
    label: "Double black",
    detail: "Double black ground is over 65 percent pitch. Too steep for a painted trail.",
    color: "#8a1c45",
    pattern: "dense-hatch",
  },
];

const BAND_SENTENCE: Record<SlopeBand, string> = {
  green: "Green ground. Gentle enough for first-timers.",
  blue: "Blue ground. Good for intermediate skiers.",
  black: "Black ground. It’s steep, so bring your nerve.",
  "double-black": "Double black ground. Too steep to paint a trail on.",
};

/** Feet above the base, rounded to ten. */
export function feetAboveBase(at: XZ, terrain: Terrain = TERRAIN): number {
  const base = terrain.height(terrain.base.x, terrain.base.z);
  return Math.round(((terrain.height(at.x, at.z) - base) * terrain.feetPerUnit) / 10) * 10;
}

export function slopeReadout(at: XZ, ctx: ReadoutContext): Readout {
  if (!onLease(at, ctx.terrain)) {
    return { headline: "That’s outside the Dutch Hill lease. Build inside the dashed line.", chips: [] };
  }
  const pitch = pitchAt(at, ctx.terrain);
  const band = slopeBand(pitch);
  const up = feetAboveBase(at, ctx.terrain);
  return {
    headline: BAND_SENTENCE[band],
    chips: [
      `${Math.round(pitch * 100)}% pitch`,
      LEGEND_LABEL[band],
      up > 0 ? `${up.toLocaleString("en-US")} ft above the base` : "Level with the base",
    ],
    entry: band,
  };
}

const LEGEND_LABEL: Record<SlopeBand, string> = Object.fromEntries(
  SLOPE_LEGEND.map((e) => [e.id, e.label]),
) as Record<SlopeBand, string>;

// ---- Registry -------------------------------------------------------------------------------

const OPS_LEGEND: Record<OpsLayer, readonly LegendEntry[]> = {
  crowds: [
    { id: "light", label: "Light", detail: "Short line or few skiers at the lift.", color: "#8fd4a0", pattern: "dots" },
    { id: "busy", label: "Busy", detail: "A steady queue or skiers stacking up.", color: "#f0c15a", pattern: "stripes" },
    { id: "packed", label: "Packed", detail: "Long wait and a crowded lift zone.", color: "#d45a5a", pattern: "hatch" },
  ],
  revenue: [
    { id: "high", label: "Strong", detail: "Venue earned over $40 today.", color: "#55b07a", pattern: "dots" },
    { id: "mid", label: "Some", detail: "Venue earned between $1 and $40 today.", color: "#c9b46a", pattern: "stripes" },
    { id: "none", label: "Quiet", detail: "No venue revenue yet today.", color: "#b8b3a8", pattern: "hatch" },
  ],
  demand: [
    { id: "pin", label: "Guests want", detail: "Top unmet demand from the last closing recap.", color: "#7a6ed4", pattern: "dense-hatch" },
  ],
};

function opsLayer(id: OpsLayer, mode: number): OverlayLayer {
  return {
    id,
    label: LABELS[id],
    mode,
    legend: OPS_LEGEND[id],
    readout(at, state) {
      const r = opsReadout(id, state, at);
      return { headline: r.headline, chips: r.chips };
    },
  };
}

const SLOPE_LAYER: OverlayLayer = {
  id: "slope",
  label: LABELS.slope,
  legend: SLOPE_LEGEND,
  mode: 1,
  readout: slopeReadout,
};

/** Layers in strip order. A layer is listed only once it is implemented. */
const LAYERS: readonly OverlayLayer[] = [
  SLOPE_LAYER,
  { id: "depth", label: LABELS.depth, mode: 2 },
  { id: "guns", label: LABELS.guns, mode: 3 },
  { id: "conditions", label: LABELS.conditions, mode: 4 },
  opsLayer("crowds", 5),
  opsLayer("revenue", 6),
  opsLayer("demand", 7),
];

export function overlayLayers(): readonly OverlayLayer[] {
  return LAYERS;
}

export function getOverlayLayer(id: OverlayId | null | undefined): OverlayLayer | undefined {
  return id ? LAYERS.find((layer) => layer.id === id) : undefined;
}

/**
 * The layer the map shows. A chosen layer wins. With none chosen, painting a trail shows the slope
 * layer unless the player turned it off during this paint session.
 */
export function resolveActiveLayer(selected: OverlayId | null, autoOff: boolean, painting: boolean): OverlayId | null {
  if (selected) return selected;
  return painting && !autoOff ? "slope" : null;
}

/** Strip button toggling: choosing the shown layer turns it off, choosing another switches to it. */
export function nextSelection(shown: OverlayId | null, picked: OverlayId): OverlayId | null {
  return shown === picked ? null : picked;
}
