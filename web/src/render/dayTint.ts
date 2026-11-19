import { smoothstep } from "./math";

/** Clock minutes where the tint turns: cool until MID_START, neutral to MID_END, then warm. */
export const TINT_MORNING_MIN = 7 * 60 + 30;
export const TINT_MID_START_MIN = 11 * 60 + 30;
export const TINT_MID_END_MIN = 13 * 60;
export const TINT_EVENING_MIN = 16 * 60;

/** Light multiplier at the cool and warm ends. Kept near 1 so the shift reads as mood, not a filter. */
export const COOL = { r: 0.94, g: 0.98, b: 1.05 };
export const WARM = { r: 1.06, g: 0.97, b: 0.9 };

/** -1 in the cool early morning, 0 at midday, +1 in the warm late afternoon. Continuous in between. */
export function dayWarmth(clockMin: number): number {
  const cool = 1 - smoothstep(TINT_MORNING_MIN, TINT_MID_START_MIN, clockMin);
  const warm = smoothstep(TINT_MID_END_MIN, TINT_EVENING_MIN, clockMin);
  return warm - cool;
}

export type Tint = { r: number; g: number; b: number };

/** Writes the light multiplier for a clock time into `out`. No allocation. */
export function dayTintAt(clockMin: number, out: Tint): Tint {
  const w = dayWarmth(clockMin);
  const end = w < 0 ? COOL : WARM;
  const k = Math.abs(w);
  out.r = 1 + (end.r - 1) * k;
  out.g = 1 + (end.g - 1) * k;
  out.b = 1 + (end.b - 1) * k;
  return out;
}
