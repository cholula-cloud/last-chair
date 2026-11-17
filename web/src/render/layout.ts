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
