import type { GuestState } from "@/game/types";
import type { LiftAnchor } from "@/game/descent";

/** Lodge / base paperwork zone (world). */
export const LODGE = { x: 2.2, z: 2.4 } as const;

/** Lift loading zone at the base of the hill. */
export const LIFT_BASE = { x: 0.45, z: 2.55 } as const;

/** Parking / arrival strip near lodge. */
export const PARKING = { x: 3.2, z: 3.1 } as const;

export function terrainHeight(x: number, z: number): number {
  const uphill = (-z - 0.35) * 0.38;
  const bowl = -0.12 * (x * x * 0.12 + (z + 0.2) * (z + 0.2) * 0.08);
  return Math.max(0, uphill + bowl + 0.08);
}

function liftTopY(anchor: LiftAnchor): number {
  return terrainHeight(anchor.x, anchor.z) + 0.15;
}

function liftBottomY(): number {
  return terrainHeight(LIFT_BASE.x, LIFT_BASE.z) + 0.05;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Ski corridor: lift top → lodge base. */
export function trailPoint(t: number, anchor: LiftAnchor): { x: number; y: number; z: number } {
  const tx = anchor.x;
  const ty = liftTopY(anchor);
  const tz = anchor.z;
  const bx = LODGE.x;
  const by = terrainHeight(LODGE.x, LODGE.z) + 0.02;
  const bz = LODGE.z;
  const ease = t * t * (3 - 2 * t);
  const x = lerp(tx, bx, ease) + Math.sin(t * Math.PI) * 0.08 * (1 - t);
  const z = lerp(tz, bz, ease);
  const y = lerp(ty, by, ease) + terrainHeight(x, z) * 0.35;
  return { x, y, z };
}

export type GuestWorldPos = { x: number; y: number; z: number };

export function guestWorldPosition(
  index: number,
  state: GuestState,
  progress: number,
  liftAnchor: LiftAnchor,
): GuestWorldPos {
  const row = index % 5;
  const col = Math.floor(index / 5);

  if (state === "arrive") {
    const t = progress;
    return {
      x: lerp(PARKING.x + col * 0.25, LIFT_BASE.x - 0.15, t),
      y: terrainHeight(PARKING.x, PARKING.z) + 0.02,
      z: lerp(PARKING.z + row * 0.2, LIFT_BASE.z + 0.35, t),
    };
  }

  if (state === "queue") {
    const offset = (index % 8) * 0.18 - 0.63;
    return {
      x: LIFT_BASE.x + offset,
      y: liftBottomY(),
      z: LIFT_BASE.z - progress * 0.45,
    };
  }

  if (state === "ride") {
    const t = progress;
    const x = lerp(LIFT_BASE.x, liftAnchor.x, t);
    const z = lerp(LIFT_BASE.z, liftAnchor.z, t);
    const y = lerp(liftBottomY(), liftTopY(liftAnchor), t);
    return { x, y, z };
  }

  if (state === "ski") {
    return trailPoint(progress, liftAnchor);
  }

  // depart
  const t = progress;
  return {
    x: lerp(LODGE.x, PARKING.x + (index % 3) * 0.3, t),
    y: terrainHeight(LODGE.x, LODGE.z) + 0.02,
    z: lerp(LODGE.z, PARKING.z + col * 0.15, t),
  };
}

/** Squared distance from point to trail segment (lift top → lodge). */
export function distSqToTrail(px: number, pz: number, anchor: LiftAnchor): number {
  const ax = anchor.x;
  const az = anchor.z;
  const bx = LODGE.x;
  const bz = LODGE.z;
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-6) return (px - ax) ** 2 + (pz - az) ** 2;
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cz = az + t * dz;
  return (px - cx) ** 2 + (pz - cz) ** 2;
}