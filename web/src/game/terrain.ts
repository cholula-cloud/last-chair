import { smooth, smoothstep } from "./math";
import { DUTCH_HILL } from "./mountains/dutchHill";

// Terrain is one analytic heightfield shared by the sim and the renderer.
// Units: x and z are world units; height is world units; grade is rise over
// run (dimensionless). Feet appear only through `feetPerUnit` (vertical) and
// `horizontalFeetPerUnit`. A TerrainDef is written in DESIGN units; a scale
// {horizontal H, vertical V} maps it to world units: world x,z = H * design,
// world height = V * design height, so world grade = (V / H) * design grade.

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

export type XZ = { x: number; z: number };

/** Gaussian bump: `xDenom` and `zDenom` are the 2σ² terms of each axis. */
export type DomeDef = { x: number; z: number; height: number; xDenom: number; zDenom: number };

/** Per-mountain scale from design units to world units. */
export type MountainScale = { horizontal: number; vertical: number };

export const UNIT_SCALE: MountainScale = { horizontal: 1, vertical: 1 };

export type TerrainDef = {
  /** Design to world scale; defaults to 1/1. */
  scale?: MountainScale;
  /** Real feet per DESIGN horizontal unit; the world value divides by `scale.horizontal`. */
  horizontalFeetPerUnit?: number;
  bounds: { xMin: number; xMax: number; zMin: number; zMax: number };
  /** Lift loading point; its height is the reference for "vertical". */
  base: XZ;
  /** Vertical extent in feet between base and summit; sets `feetPerUnit`. */
  verticalFeet: number;
  /** Highest point of the play area (the top of the summit dome). */
  summit: XZ;
  /** Flat village apron: height `height` for z >= `z`; the fall line starts here. */
  apron?: { z: number; height: number };
  /** Novice apron: the first `length` units above the apron edge rise at about `grade`. */
  meadow?: { length: number; grade: number };
  /**
   * Fall-line profile as control points [distanceUphill, height], measured
   * from the apron edge (z = apron.z, or z = 0 without an apron). Interpolated
   * with a monotone cubic; constant beyond the last point.
   */
  face: readonly (readonly [number, number])[];
  domes: readonly DomeDef[];
  /**
   * Flanks that fall away from the crest: the crest line sits at
   * `centerX + centerXPerD * d` (d = distance uphill) and the ground is
   * only slightly rounded (`crown` is the drop at the crest edge) within `halfWidth` of it, then drops toward
   * `drop` as `1 - exp(-s² * sharpness)` (s is the distance beyond the crest edge). The drop ramps in over
   * `rampFrom..rampTo` (distance uphill) so the apron and meadow stay flat, and
   * the result never goes below `apron.height - floorMargin`.
   */
  flanks?: {
    centerX: number;
    /** Lateral drift of the crest per unit of distance uphill. */
    centerXPerD: number;
    halfWidth: number;
    crown: number;
    drop: number;
    sharpness: number;
    /** Widen the outer shoulder without changing the crest and its existing routes. */
    outerShoulder?: { start: number; slope: number };
    rampFrom: number;
    rampTo: number;
    floorMargin: number;
  };
  /** The back side falls away behind the summit. */
  backFall?: { startZ: number; k: number };
  /** Value-noise bumps, faded in above the meadow and out across the summit cap. */
  noise?: {
    frequency: number;
    amplitude: number;
    fromD: number;
    toD: number;
    fadeOutFromD?: number;
    fadeOutToD?: number;
    /** Damp the noise along the crest (needs `flanks`) so the lift line is not a ridge of bumps. */
    crestCalm?: { amount: number; width: number };
  };
};

export interface Terrain {
  readonly def: TerrainDef;
  readonly scale: MountainScale;
  /** World bounds (design bounds times H). */
  readonly bounds: TerrainDef["bounds"];
  /** World base (design base times H). */
  readonly base: Readonly<XZ>;
  /** Feet of real vertical per world unit of height: feet = units * feetPerUnit. */
  readonly feetPerUnit: number;
  /** Feet of real horizontal distance per world unit: def value divided by H. */
  readonly horizontalFeetPerUnit: number;
  /** Design point to world point (x, z times H). */
  toWorld(p: XZ): XZ;
  /** World point to design point (x, z divided by H). */
  toDesign(p: XZ): XZ;
  height(x: number, z: number): number;
  /** Central-difference gradient, h = 0.01 * H (the same design points at any scale). */
  gradient(x: number, z: number): { dx: number; dz: number };
  /** Steepness |gradient|, rise over run. */
  grade(x: number, z: number): number;
  /** Signed downhill grade (drop over run, > 0 going down) sampled from a to b. */
  gradeAlong(a: XZ, b: XZ, step?: number): number[];
  /**
   * Largest mean downhill grade over any stretch of the path at least `window`
   * long, so a single steep sample cannot set it. The path is in travel order.
   */
  sustainedPitch(path: readonly XZ[], window?: number): number;
}

/** Central-difference step in design units; the world step is this times H. */
const GRADIENT_H = 0.01;

/** Monotone cubic (PCHIP) through ascending control points; flat outside them. */
function monotoneCubic(points: readonly (readonly [number, number])[]): (t: number) => number {
  const n = points.length;
  if (n === 0) return () => 0;
  if (n === 1) return () => points[0][1];
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const h: number[] = [];
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(xs[i + 1] - xs[i]);
    delta.push((ys[i + 1] - ys[i]) / h[i]);
  }
  const m = new Array<number>(n).fill(0);
  if (n === 2) {
    m[0] = delta[0];
    m[1] = delta[0];
  } else {
    for (let i = 1; i < n - 1; i++) {
      if (delta[i - 1] * delta[i] <= 0) continue;
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
    }
    const end = (h0: number, h1: number, d0: number, d1: number) => {
      let e = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
      if (Math.sign(e) !== Math.sign(d0)) e = 0;
      else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(e) > 3 * Math.abs(d0)) e = 3 * d0;
      return e;
    };
    m[0] = end(h[0], h[1], delta[0], delta[1]);
    m[n - 1] = end(h[n - 2], h[n - 3], delta[n - 2], delta[n - 3]);
  }
  return (t: number) => {
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (t > xs[i + 1]) i++;
    const s = (t - xs[i]) / h[i];
    const s2 = s * s;
    const s3 = s2 * s;
    return (
      (2 * s3 - 3 * s2 + 1) * ys[i] +
      (s3 - 2 * s2 + s) * h[i] * m[i] +
      (-2 * s3 + 3 * s2) * ys[i + 1] +
      (s3 - s2) * h[i] * m[i + 1]
    );
  };
}

export function createTerrain(def: TerrainDef, scale: MountainScale = def.scale ?? UNIT_SCALE): Terrain {
  const H = scale.horizontal;
  const V = scale.vertical;
  if (!(H > 0) || !(V > 0)) throw new RangeError(`createTerrain: scale must be > 0, got ${H}/${V}`);
  const apronZ = def.apron?.z ?? 0;
  const profilePoints: [number, number][] = [];
  if (def.apron) {
    profilePoints.push([-1, def.apron.height], [0, def.apron.height]);
    if (def.meadow) {
      profilePoints.push([
        def.meadow.length,
        def.apron.height + def.meadow.grade * def.meadow.length,
      ]);
    }
  }
  for (const p of def.face) profilePoints.push([p[0], p[1]]);
  const profile = monotoneCubic(profilePoints);

  const designHeight = (x: number, z: number): number => {
    const d = apronZ - z; // distance uphill from the apron edge
    let h = profile(d);

    for (const dome of def.domes) {
      h += dome.height * Math.exp(-((x - dome.x) ** 2 / dome.xDenom + (z - dome.z) ** 2 / dome.zDenom));
    }

    const fl = def.flanks;
    let side = 0;
    let crestOffset = 0;
    if (fl) {
      crestOffset = Math.abs(x - (fl.centerX + fl.centerXPerD * d));
      side = Math.max(0, crestOffset - fl.halfWidth);
      const across = Math.min(crestOffset, fl.halfWidth) / fl.halfWidth;
      const shoulder = fl.outerShoulder;
      let falloff = side;
      if (shoulder && side > shoulder.start) {
        const outer = side - shoulder.start;
        // Ease from full slope at the join toward the gentler outer shoulder.
        falloff = shoulder.start + outer * (shoulder.slope + (1 - shoulder.slope) / (1 + outer));
      }
      const drop =
        (fl.crown * across * across + fl.drop * (1 - Math.exp(-falloff * falloff * fl.sharpness))) *
        smoothstep(fl.rampFrom, fl.rampTo, d);
      const floor = (def.apron?.height ?? 0) - fl.floorMargin;
      h = Math.max(h - drop, Math.min(h, floor));
    }

    const f = def.backFall;
    if (f) {
      const back = Math.max(0, -z - f.startZ);
      h -= back * back * f.k;
    }

    const n = def.noise;
    if (n) {
      const fadeOut =
        n.fadeOutFromD === undefined || n.fadeOutToD === undefined
          ? 1
          : 1 - smoothstep(n.fadeOutFromD, n.fadeOutToD, d);
      // The groomed crest: noise is damped by `crestCalm.amount` across the crest, easing back to full over `width` beyond its edge.
      const calm = n.crestCalm ? 1 - n.crestCalm.amount * (1 - smoothstep(0, n.crestCalm.width, side)) : 1;
      h += fbm(x * n.frequency, z * n.frequency) * n.amplitude * smoothstep(n.fromD, n.toD, d + side * 0.5) * fadeOut * calm;
    }

    return h;
  };

  const height = (x: number, z: number): number => V * designHeight(x / H, z / H);
  const toWorld = (p: XZ): XZ => ({ x: p.x * H, z: p.z * H });
  const toDesign = (p: XZ): XZ => ({ x: p.x / H, z: p.z / H });

  const gh = GRADIENT_H * H;
  const gradient = (x: number, z: number) => ({
    dx: (height(x + gh, z) - height(x - gh, z)) / (2 * gh),
    dz: (height(x, z + gh) - height(x, z - gh)) / (2 * gh),
  });

  const grade = (x: number, z: number) => {
    const g = gradient(x, z);
    return Math.hypot(g.dx, g.dz);
  };

  const gradeAlong = (a: XZ, b: XZ, step = 0.05 * H): number[] => {
    if (!(step > 0)) throw new RangeError(`gradeAlong: step must be > 0, got ${step}`);
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len === 0) return [0];
    const ux = (b.x - a.x) / len;
    const uz = (b.z - a.z) / len;
    const n = Math.max(1, Math.ceil(len / step));
    const out: number[] = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * len;
      const g = gradient(a.x + ux * t, a.z + uz * t);
      out.push(-(g.dx * ux + g.dz * uz));
    }
    return out;
  };

  const sustainedPitch = (path: readonly XZ[], window = 0.6 * H): number => {
    if (path.length < 2) return 0;
    const s: number[] = [0];
    const y: number[] = [height(path[0].x, path[0].z)];
    for (let i = 1; i < path.length; i++) {
      s.push(s[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
      y.push(height(path[i].x, path[i].z));
    }
    const total = s[s.length - 1];
    if (total <= 0) return 0;
    if (total < window) return (y[0] - y[y.length - 1]) / total;
    let best = -Infinity;
    for (let i = 0; i < path.length; i++) {
      for (let j = i + 1; j < path.length; j++) {
        const run = s[j] - s[i];
        if (run < window) continue;
        best = Math.max(best, (y[i] - y[j]) / run);
      }
    }
    return best;
  };

  const baseH = height(def.base.x * H, def.base.z * H);
  const summitH = height(def.summit.x * H, def.summit.z * H);
  const db = def.bounds;

  return {
    def,
    scale,
    bounds: { xMin: db.xMin * H, xMax: db.xMax * H, zMin: db.zMin * H, zMax: db.zMax * H },
    base: toWorld(def.base),
    feetPerUnit: def.verticalFeet / (summitH - baseH),
    horizontalFeetPerUnit: (def.horizontalFeetPerUnit ?? 1) / H,
    toWorld,
    toDesign,
    height,
    gradient,
    grade,
    gradeAlong,
    sustainedPitch,
  };
}

export const TERRAIN: Terrain = createTerrain(DUTCH_HILL);
