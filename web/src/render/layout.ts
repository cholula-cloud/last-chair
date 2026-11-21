/** World-space layout constants; positions come from per-mountain site data. */

import { TERRAIN } from "@/game/terrain";
import { DUTCH_HILL_BUILDING_STYLE, DUTCH_HILL_SITE } from "@/game/mountains/dutchHill.site";

export const MOUNTAIN_BUILDING_STYLE = DUTCH_HILL_BUILDING_STYLE;

const B = DUTCH_HILL_SITE.buildings;

/** Lodge / base paperwork zone. Skiers finish their run here. */
export const LODGE = B.lodge;

/** Lift loading zone at the base of the hill. */
export const LIFT_BASE = TERRAIN.base;

/** Gravel arrival lot centre (stalls fill around this). */
export const PARKING = DUTCH_HILL_SITE.arrival.center;

export const ROAD_Z = DUTCH_HILL_SITE.road.z;

export const CAFE_POS = B.cafe;
export const SHOP_POS = B.shop;
export const WARMING_HUT_POS = B.warmingHut;

/** Tower height above ground before the span-clearance pass raises it. */
export const LIFT_TOWER_H = 0.95;

/** Lateral offset of the up / return cables from the lift centre line. */
export const LIFT_CABLE_OFFSET = 0.2;

/** Clapboard houses across the road: village dressing (x, z, yaw). */
export const HOUSES = B.houses.map((h) => ({ x: h.at.x, z: h.at.z, yaw: h.yaw }));

/** Parked snowcat beside the operations yard. */
export const SNOWCAT_POS = B.snowcat;

/** Site definition for paths, roads and arrival (render and tests). */
export const SITE = DUTCH_HILL_SITE;

/**
 * Rope height at the bottom / top terminals. The kit bullwheel sits at 4.3 m;
 * LIFT_TOY_SCALE (0.2 / (1.6 × 0.075)) puts it at ~0.54 world units.
 */
export const LIFT_TERMINAL_H = 4.3 * 0.2 / 1.6;