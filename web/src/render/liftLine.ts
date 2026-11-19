import type { LiftLine } from "@/game/descent";
import { LIFT_TERMINAL_H, LIFT_TOWER_H } from "./layout";
import { clamp01 } from "./math";
import { TERRAIN } from "@/game/terrain";
import { DAY_START_MIN } from "@/game/types";

export type LiftPoint = { x: number; z: number; ground: number; top: number };

/** A carrier travels up and back in two one-way rides. */
export function carrierLoopPhase(clockMin: number, rideMin: number): number {
  return (Math.max(0, clockMin - DAY_START_MIN) / (2 * rideMin)) % 1;
}

/** Unit vector along the lift (bottom → top) and its right-hand perpendicular. */
export function liftFrame(line: LiftLine) {
  const dx = line.top.x - line.bottom.x;
  const dz = line.top.z - line.bottom.z;
  const len = Math.hypot(dx, dz) || 1;
  const fx = dx / len;
  const fz = dz / len;
  return { fx, fz, px: -fz, pz: fx, len, yaw: Math.atan2(fx, fz) };
}

/** Terminals + intermediate towers along the lift line, base first. */
export function liftTowers(line: LiftLine): LiftPoint[] {
  const { len } = liftFrame(line);
  const inner = Math.max(3, Math.min(10, Math.round(len / 3)));
  const n = inner + 2;
  const pts: LiftPoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = line.bottom.x + (line.top.x - line.bottom.x) * t;
    const z = line.bottom.z + (line.top.z - line.bottom.z) * t;
    const ground = TERRAIN.height(x, z);
    const terminal = i === 0 || i === n - 1;
    pts.push({ x, z, ground, top: ground + (terminal ? LIFT_TERMINAL_H : LIFT_TOWER_H) });
  }
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

/** Cable tube radii, in world units: the real cable, the thicker invalid ghost, and its soft halo. */
export const CABLE_RADIUS = 0.012;
export const INVALID_CABLE_RADIUS = 0.045;
export const INVALID_HALO_RADIUS = 0.14;

/** Cable radius for a ghost: valid ghosts stay thin, invalid ones read clearly on dimmed land. */
export function ghostCableRadius(invalid: boolean): number {
  return invalid ? INVALID_CABLE_RADIUS : CABLE_RADIUS;
}
