/**
 * One look for the build dot field. Overview, asset and gun modes share the field style; the lift
 * guide is a smaller, dimmer variant so anchor dots stay the strongest mark. Radii are world units
 * at the cell step of `terrain.scale.horizontal / 2`.
 */
export type GridMode = "overview" | "asset" | "gun" | "lift";
export type DotKind = "valid" | "blocked" | "neutral";

export type DotStyle = { color: string; opacity: number };

export const GRID_STYLE = {
  /** Dot radius of the shared field (overview, asset, gun). */
  radius: 0.2,
  /** Lift guide dots: smaller than the anchor dots (0.22) and the shared field. */
  liftRadius: 0.16,
  /** Height above the snow so a dot does not z-fight. */
  height: 0.08,
  /** Reads at about 1.8:1 against snow (#f4f7fb) at 390 wide; the HUD sits above it. */
  valid: { color: "#36a975", opacity: 0.62 },
  /** Lease cells that cannot take the item: a faint dot so the lease keeps its shape. */
  blocked: { color: "#566a7c", opacity: 0.32 },
  neutral: { color: "#6f8a80", opacity: 0.55 },
  /** Lift-top cells; below the shared green, above the ring. */
  liftTop: { color: "#36a975", opacity: 0.45 },
  /** Lift-top cells once the top sits on an anchor. */
  liftSnapped: { color: "#36a975", opacity: 0.16 },
  /** The reach ring: the longest legal lift from the bottom, a thin line. */
  reach: { color: "#36a975", opacity: 0.5 },
  reachSnapped: { color: "#36a975", opacity: 0.2 },
  /** Grid dots closer than this many cells to the cable or a pad are hidden. */
  cableClearCells: 1,
} as const;

/** Anchor dot and ring figures, here so the guide and the ghost agree. */
export const ANCHOR_STYLE = { dotRadius: 0.22, ringRadius: 0.5, ringOpacity: 0.95 } as const;

/** The radius a mode draws its dots at. */
export function dotRadius(mode: GridMode): number {
  return mode === "lift" ? GRID_STYLE.liftRadius : GRID_STYLE.radius;
}

/** The colour and opacity of one dot. `snapped` only matters in lift mode. */
export function dotStyle(mode: GridMode, kind: DotKind, snapped = false): DotStyle {
  if (mode === "lift") return snapped ? GRID_STYLE.liftSnapped : GRID_STYLE.liftTop;
  return GRID_STYLE[kind];
}
