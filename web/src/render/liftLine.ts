import type { LiftAnchor } from "@/game/descent";
import { LIFT_BASE, LIFT_TERMINAL_H, LIFT_TOWER_H } from "./layout";
import { clamp01 } from "./math";
import { TERRAIN } from "@/game/terrain";

export type LiftPoint = { x: number; z: number; ground: number; top: number };

/** Unit vector along the lift (base → top) and its right-hand perpendicular. */
export function liftFrame(anchor: LiftAnchor) {
  const dx = anchor.x - LIFT_BASE.x;
  const dz = anchor.z - LIFT_BASE.z;
  const len = Math.hypot(dx, dz) || 1;
  const fx = dx / len;
  const fz = dz / len;
  return { fx, fz, px: -fz, pz: fx, len, yaw: Math.atan2(fx, fz) };
}

/** Terminals + intermediate towers along the lift line, base first. */
export function liftTowers(anchor: LiftAnchor): LiftPoint[] {
  const { len } = liftFrame(anchor);
  const inner = Math.max(3, Math.min(5, Math.round(len / 0.7)));
  const n = inner + 2;
  const pts: LiftPoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = LIFT_BASE.x + (anchor.x - LIFT_BASE.x) * t;
    const z = LIFT_BASE.z + (anchor.z - LIFT_BASE.z) * t;
    const ground = TERRAIN.height(x, z);
    const terminal = i === 0 || i === n - 1;
    pts.push({ x, z, ground, top: ground + (terminal ? LIFT_TERMINAL_H : LIFT_TOWER_H) });
  }
  // Keep each span clear of the snow at its midpoint. Terminals keep their
  // bullwheel height, so a span touching one raises only its tower end.
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < n - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const mx = (a.x + b.x) / 2;
      const mz = (a.z + b.z) / 2;
      const need = TERRAIN.height(mx, mz) + 0.7 - (a.top + b.top) / 2;
      if (need <= 0) continue;
      const aFixed = i === 0;
      const bFixed = i + 1 === n - 1;
      if (aFixed && !bFixed) b.top += need * 2;
      else if (bFixed && !aFixed) a.top += need * 2;
      else {
        a.top += need;
        b.top += need;
      }
    }
  }
  return pts;
}

/** Cable height at fraction t ∈ [0,1] of the lift line. */
export function cableHeightAt(t: number, towers: LiftPoint[]): number {
  const f = clamp01(t) * (towers.length - 1);
  const i = Math.min(towers.length - 2, Math.floor(f));
  const k = f - i;
  return towers[i].top + (towers[i + 1].top - towers[i].top) * k;
}
