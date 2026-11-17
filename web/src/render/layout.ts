/** World-space layout constants for the base area and the lift line. */

/** Lodge / base paperwork zone. Skiers finish their run here. */
export const LODGE = { x: 2.2, z: 2.4 } as const;

/** Lift loading zone at the base of the hill. */
export const LIFT_BASE = { x: 0.45, z: 2.55 } as const;

/** Parking / arrival strip near the lodge. */
export const PARKING = { x: 3.2, z: 3.1 } as const;

/** Valley road running across the front of the base area. */
export const ROAD_Z = 4.35;

export const CAFE_POS = { x: 3.78, z: 2.15 } as const;
export const SHOP_POS = { x: 4.6, z: 2.95 } as const;

/** Tower height above ground before the span-clearance pass raises it. */
export const LIFT_TOWER_H = 0.95;

/** Lateral offset of the up / return cables from the lift centre line. */
export const LIFT_CABLE_OFFSET = 0.2;

/** Warming hut beside the lift base (owned from day 1). */
export const WARMING_HUT_POS = { x: 1.05, z: 2.0 } as const;

/** Clapboard houses across the road: village dressing (x, z, yaw). */
export const HOUSES: readonly { x: number; z: number; yaw: number }[] = [
  { x: -0.7, z: 5.25, yaw: Math.PI },
  { x: 1.75, z: 5.3, yaw: Math.PI + 0.08 },
];

/** Parked snowcat beside the car park. */
export const SNOWCAT_POS = { x: 5.25, z: 3.55, yaw: -1.2 } as const;

/**
 * Rope height at the bottom / top terminals. The kit bullwheel sits at 4.3 m;
 * LIFT_TOY_SCALE (0.2 / (1.6 × 0.075)) puts it at ~0.54 world units.
 */
export const LIFT_TERMINAL_H = 4.3 * 0.2 / 1.6;
