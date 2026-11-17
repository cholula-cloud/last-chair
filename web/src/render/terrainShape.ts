import { smooth, smoothstep } from "./math";

// Deterministic, cheap noise for terrain bumps, snow patches and scatter.

function hash2(ix: number, iz: number): number {
  let h = ix * 374761393 + iz * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}

/** Value noise in [0, 1]. */
function valueNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fz = smooth(z - iz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

/** Three-octave fractal noise in roughly [-1, 1]. */
export function fbm(x: number, z: number): number {
  return (
    (valueNoise(x, z) - 0.5) * 1.0 +
    (valueNoise(x * 2.1 + 17.3, z * 2.1 - 4.1) - 0.5) * 0.5 +
    (valueNoise(x * 4.3 - 9.7, z * 4.3 + 21.4) - 0.5) * 0.25
  );
}

function softplus(x: number, k: number): number {
  return k * Math.log1p(Math.exp(x / k));
}

/**
 * A Vermont hill rising toward −Z from a flat base area at +Z, with a summit
 * dome, a shoulder to the east and side ridges framing a bowl.
 */
export function terrainHeight(x: number, z: number): number {
  const d = 2.1 - z; // distance uphill from the base edge
  const u = Math.min(softplus(d, 0.35), 6);
  // Steep lower face that rounds off toward the summit.
  let h = 1.22 * u - 0.095 * u * u;

  // Summit dome and east shoulder.
  h += 0.7 * Math.exp(-((x + 0.4) ** 2 / 3.5 + (z + 1.9) ** 2 / 1.6));
  h += 0.55 * Math.exp(-((x - 3.1) ** 2 / 2 + (z + 0.9) ** 2 / 1.4));

  // Side ridges: valley walls that rise away from the bowl.
  const side = Math.max(0, Math.abs(x - 0.5) - 3.4);
  const ridge = 3.2 * (1 - Math.exp(-side * side * 0.07));
  h += ridge * (0.35 + 0.65 * smoothstep(-2, 3, d));

  // Shallow bowl along the fall line.
  h -= 0.22 * Math.exp(-((x - 0.3) ** 2) / 2.2) * smoothstep(0.5, 3, d);

  // Back side falls away behind the summit.
  const back = Math.max(0, -z - 2.6);
  h -= back * back * 0.16;

  // Bumps everywhere except the flat base.
  h += fbm(x * 0.6, z * 0.6) * 0.3 * smoothstep(-0.2, 1.4, d + side * 0.5);

  return h;
}
