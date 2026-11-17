/** Small pure maths helpers shared by the terrain, path and noise code. */

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Cubic ease for t already in [0, 1]. */
export function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Hermite smoothstep between edges `a` and `b`, clamped. */
export function smoothstep(a: number, b: number, x: number): number {
  return smooth(clamp01((x - a) / (b - a)));
}
