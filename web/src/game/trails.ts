import { PERSONAS } from "./personas";
import type { PersonaId, TrailDifficulty } from "./types";
import { REFERENCE_TOPS, rulesFor } from "./descent";
import type { LiftSlot } from "./state";
import { freshTrail, segmentElevation, TRAIL_SEGMENTS, type Trail } from "./snow";
import { TERRAIN, type Terrain, type XZ } from "./terrain";

export type Difficulty = TrailDifficulty;

export const OVER_SKILL_MULT = 1.6;
export const MAX_TRAILS_PER_LIFT = 3;
export const MAX_TRAILS_TOTAL = 8;
export const STANDARD_TRAIL_WIDTH_FT = 60;

const DIFF_RANK: Record<Difficulty, number> = { green: 0, blue: 1, black: 2 };

export function roundTrailCost(raw: number): number {
  return Math.round(raw / 50) * 50;
}

export function trailCost(lengthFt: number): number {
  return roundTrailCost(150 + 0.4 * lengthFt);
}

export type RouteOption = {
  name: string;
  path: XZ[];
  lengthFt: number;
  pitch: number;
  difficulty: Difficulty;
};

function optionName(targetPitch: number | null, difficulty: Difficulty, index: number): string {
  if (targetPitch !== null && targetPitch <= 0.23) return index === 0 ? "Dutch Meadows" : "Meadow Run";
  if (targetPitch !== null && targetPitch < 0.4) return "Cruiser";
  return difficulty === "blue" ? "Fall Line" : "Steep";
}

function pathOverlapShare(a: readonly XZ[], b: readonly XZ[], terrain: Terrain): number {
  const cell = terrain.scale.horizontal / 6;
  const key = (p: XZ) => `${Math.round(p.x / cell)}:${Math.round(p.z / cell)}`;
  const setB = new Set(b.map(key));
  let hit = 0;
  for (const p of a) if (setB.has(key(p))) hit++;
  return a.length < 2 ? 0 : hit / a.length;
}

function pathsTooSimilar(a: readonly XZ[], b: readonly XZ[], terrain: Terrain): boolean {
  return pathOverlapShare(a, b, terrain) > 0.8 || pathOverlapShare(b, a, terrain) > 0.8;
}

function buildRouteOption(
  top: XZ,
  targetPitch: number | null,
  nameHint: string | null,
  terrain: Terrain,
): RouteOption {
  const path = routePath(top, targetPitch, terrain);
  const pitch = terrain.sustainedPitch(path) * realGradeFactor(terrain);
  const difficulty = classifyPitch(pitch);
  const name = nameHint ?? optionName(targetPitch, difficulty, 0);
  return {
    name,
    path,
    lengthFt: pathLengthFt(path, terrain),
    pitch,
    difficulty,
  };
}

/** Three route targets (gentle, cruiser, fall line), dropping near-duplicates. */
export function routeOptions(
  top: XZ,
  existing: readonly (readonly XZ[])[] = [],
  terrain: Terrain = TERRAIN,
): RouteOption[] {
  const targets: (number | null)[] = [0.22, 0.36, null];
  const names = ["Dutch Meadows", null, null] as const;
  const raw = targets.map((t, i) => buildRouteOption(top, t, names[i] ?? null, terrain));
  const out: RouteOption[] = [];
  for (const opt of raw) {
    if (existing.some((e) => pathsTooSimilar(opt.path, e, terrain))) continue;
    if (out.some((o) => pathsTooSimilar(opt.path, o.path, terrain))) continue;
    out.push(opt);
  }
  return out;
}

export function trailsOnLift(trails: readonly TrailRun[], liftIndex: number): { index: number; trail: TrailRun }[] {
  const out: { index: number; trail: TrailRun }[] = [];
  trails.forEach((t, index) => {
    if (t.liftIndex === liftIndex && t.open) out.push({ index, trail: t });
  });
  return out;
}

function hashPick(id: string, runs: number, n: number): number {
  let h = 0;
  const s = `${id}:${runs}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % Math.max(1, n);
}

export function isOverSkill(persona: PersonaId, difficulty: Difficulty): boolean {
  return DIFF_RANK[difficulty] > DIFF_RANK[PERSONAS[persona].maxDifficulty];
}

/** Which trail a guest skis from this lift on this run (global trail index). */
export function pickTrailIndex(
  persona: PersonaId,
  trails: readonly TrailRun[],
  liftIndex: number,
  guestId: string,
  runs: number,
): number {
  const open = trailsOnLift(trails, liftIndex);
  if (open.length === 0) return Math.min(liftIndex, trails.length - 1);
  const maxRank = DIFF_RANK[PERSONAS[persona].maxDifficulty];
  const pref = PERSONAS[persona].preferred;
  const within = open.filter(({ trail }) => DIFF_RANK[trail.difficulty] <= maxRank);
  let pool = within;
  if (within.length > 0) {
    const prefMatches = within.filter(({ trail }) => trail.difficulty === pref);
    if (prefMatches.length > 0) pool = prefMatches;
    else {
      const hardest = Math.max(...within.map(({ trail }) => DIFF_RANK[trail.difficulty]));
      pool = within.filter(({ trail }) => DIFF_RANK[trail.difficulty] === hardest);
    }
  } else {
    const easiest = Math.min(...open.map(({ trail }) => DIFF_RANK[trail.difficulty]));
    pool = open.filter(({ trail }) => DIFF_RANK[trail.difficulty] === easiest);
  }
  return pool[hashPick(guestId, runs, pool.length)].index;
}

export function runSkiMinutes(
  persona: PersonaId,
  trail: Pick<TrailRun, "lengthFt" | "difficulty">,
  snowQuality: number,
  overSkill?: boolean,
): number {
  const q = Math.max(0, Math.min(1, snowQuality));
  const base = PERSONAS[persona].skiMin * (trail.lengthFt / REF_TRAIL_FT);
  const snow = 1 + 0.3 * (1 - q);
  const skill = (overSkill ?? isOverSkill(persona, trail.difficulty)) ? OVER_SKILL_MULT : 1;
  return base * snow * skill;
}

export type TrailRun = {
  liftIndex: number;
  name: string;
  path: XZ[];
  /** Width in feet at each path point. */
  widths: number[];
  lengthFt: number;
  pitch: number;
  difficulty: Difficulty;
  open: boolean;
  snow: Trail;
  /** Normalised height 0–1 per snow segment (stored at creation for overnight/thaw). */
  elevations: number[];
  builtDay?: number;
  builtAtMin?: number;
  paid?: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const roundXZ = (p: XZ): XZ => ({ x: round2(p.x), z: round2(p.z) });

/** Real sustained grade factor at 6/3 (570/420 × V/H scaling). */
export function realGradeFactor(terrain: Terrain = TERRAIN): number {
  const { horizontal: H, vertical: V } = terrain.scale;
  return (570 / 420) * (V / H);
}

export function classifyPitch(pitch: number): Difficulty {
  if (pitch <= 0.25) return "green";
  if (pitch <= 0.45) return "blue";
  return "black";
}

export function pathLengthWorld(path: readonly XZ[]): number {
  let len = 0;
  for (let i = 1; i < path.length; i++) {
    len += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
  }
  return len;
}

export function pathLengthFt(path: readonly XZ[], terrain: Terrain = TERRAIN): number {
  return Math.round(pathLengthWorld(path) * terrain.horizontalFeetPerUnit);
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Ridge top height — reference for normalising segment elevation (M2 calibration). */
export function refSnowHeight(terrain: Terrain = TERRAIN): number {
  const ridge = REFERENCE_TOPS[0];
  return terrain.height(ridge.x, ridge.z);
}

function sampleAlongPath(path: readonly XZ[], frac: number): XZ {
  if (path.length === 0) return { x: 0, z: 0 };
  if (path.length === 1 || frac <= 0) return path[0];
  const cum: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
  }
  const total = cum[cum.length - 1];
  if (total < 1e-9) return path[0];
  const d = clamp01(frac) * total;
  let i = 0;
  while (i < cum.length - 1 && cum[i + 1] < d - 1e-9) i++;
  if (i >= path.length - 1) return path[path.length - 1];
  const segLen = cum[i + 1] - cum[i];
  const t = segLen < 1e-9 ? 0 : (d - cum[i]) / segLen;
  return {
    x: path[i].x + (path[i + 1].x - path[i].x) * t,
    z: path[i].z + (path[i + 1].z - path[i].z) * t,
  };
}

/** Real-height elevation per segment midpoint along `path` (1 ≈ Ridge top, 0 ≈ base). */
export function segmentElevationsForPath(
  path: readonly XZ[],
  terrain: Terrain = TERRAIN,
  n: number = TRAIL_SEGMENTS,
): number[] {
  const refH = refSnowHeight(terrain);
  const base = terrain.base;
  const baseH = terrain.height(base.x, base.z);
  const denom = refH - baseH;
  if (Math.abs(denom) < 1e-9) {
    return Array.from({ length: n }, (_, i) => segmentElevation(i, n));
  }
  return Array.from({ length: n }, (_, s) => {
    const p = sampleAlongPath(path, (s + 0.5) / n);
    const h = terrain.height(p.x, p.z);
    return clamp01((h - baseH) / denom);
  });
}

const STEP_DIRS: XZ[] = (() => {
  const base = [
    { x: 1, z: 0 },
    { x: 1, z: 1 },
    { x: 2, z: 1 },
  ];
  const out: XZ[] = [];
  for (const d of base) {
    for (let q = 0; q < 4; q++) {
      const x = q % 2 === 0 ? d.x : -d.x;
      const z = q < 2 ? d.z : -d.z;
      out.push({ x, z });
    }
  }
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      const a = out[i];
      const b = out[j];
      if (Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.z - b.z) < 1e-9) continue;
      out.push({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
    }
  }
  const uniq: XZ[] = [];
  for (const d of out) {
    const len = Math.hypot(d.x, d.z);
    if (len < 1e-9 || len > 2.01) continue;
    if (!uniq.some((u) => Math.abs(u.x - d.x) < 1e-6 && Math.abs(u.z - d.z) < 1e-6)) {
      uniq.push({ x: d.x / len, z: d.z / len });
    }
  }
  return uniq;
})();

function inBounds(p: XZ, terrain: Terrain): boolean {
  const b = terrain.bounds;
  return p.x >= b.xMin && p.x <= b.xMax && p.z >= b.zMin && p.z <= b.zMax;
}

function nearBase(p: XZ, terrain: Terrain): boolean {
  const base = terrain.base;
  const r = rulesFor(terrain).baseAreaRadius;
  return Math.hypot(p.x - base.x, p.z - base.z) <= r + 0.05;
}

function maxClimbStep(terrain: Terrain): number {
  return 16.4 / terrain.feetPerUnit;
}

function edgeGrade(a: XZ, b: XZ, terrain: Terrain): number {
  const horiz = Math.hypot(b.x - a.x, b.z - a.z);
  if (horiz < 1e-9) return 0;
  const drop = terrain.height(a.x, a.z) - terrain.height(b.x, b.z);
  return drop / horiz;
}

function realPitch(grade: number, terrain: Terrain): number {
  return grade * realGradeFactor(terrain);
}

function chaikin(path: XZ[]): XZ[] {
  if (path.length < 3) return path.map(roundXZ);
  const out: XZ[] = [roundXZ(path[0])];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    out.push(roundXZ({ x: 0.75 * a.x + 0.25 * b.x, z: 0.75 * a.z + 0.25 * b.z }));
    out.push(roundXZ({ x: 0.25 * a.x + 0.75 * b.x, z: 0.25 * a.z + 0.75 * b.z }));
  }
  out.push(roundXZ(path[path.length - 1]));
  return out;
}

function resample(path: XZ[], spacing: number): XZ[] {
  if (path.length < 2) return path.map(roundXZ);
  const pts: XZ[] = [roundXZ(path[0])];
  let carry = spacing;
  for (let i = 1; i < path.length; i++) {
    let ax = path[i - 1].x;
    let az = path[i - 1].z;
    const bx = path[i].x;
    const bz = path[i].z;
    let seg = Math.hypot(bx - ax, bz - az);
    while (seg > 1e-9) {
      if (carry <= seg) {
        const t = carry / seg;
        pts.push(roundXZ({ x: ax + (bx - ax) * t, z: az + (bz - az) * t }));
        ax += (bx - ax) * t;
        az += (bz - az) * t;
        seg *= 1 - t;
        carry = spacing;
      } else {
        carry -= seg;
        break;
      }
    }
  }
  if (pts[pts.length - 1].x !== round2(path[path.length - 1].x)) {
    pts.push(roundXZ(path[path.length - 1]));
  }
  return pts;
}

/** Grid route from top to the base disc. `targetPitch` is sustained real grade target; null = fall line. */
export function routePath(
  top: XZ,
  targetPitch: number | null,
  terrain: Terrain = TERRAIN,
): XZ[] {
  const H = terrain.scale.horizontal;
  const cell = H / 6;
  const maxClimb = maxClimbStep(terrain);
  const base = terrain.base;
  const start = roundXZ(top);
  const path: XZ[] = [start];
  let cur = { ...start };
  const target = targetPitch ?? 0.55;

  for (let step = 0; step < 2500; step++) {
    if (nearBase(cur, terrain)) {
      path.push(roundXZ(base));
      break;
    }
    let best: XZ | null = null;
    let bestScore = Infinity;
    const toBase = Math.hypot(cur.x - base.x, cur.z - base.z);
    for (const d of STEP_DIRS) {
      const nxt = { x: cur.x + d.x * cell, z: cur.z + d.z * cell };
      if (!inBounds(nxt, terrain)) continue;
      const climb = terrain.height(nxt.x, nxt.z) - terrain.height(cur.x, cur.z);
      if (climb > maxClimb) continue;
      const h = Math.hypot(nxt.x - base.x, nxt.z - base.z);
      if (h >= toBase - 1e-6) continue;
      const grade = edgeGrade(cur, nxt, terrain);
      const rp = realPitch(grade, terrain);
      const over = targetPitch === null ? 0 : Math.max(0, rp - target);
      const uphill = climb < -0.02 ? 8 * cell : 0;
      const score = h + over * 40 + uphill;
      if (score < bestScore) {
        bestScore = score;
        best = nxt;
      }
    }
    if (!best) {
      path.push(roundXZ(base));
      break;
    }
    cur = roundXZ(best);
    const last = path[path.length - 1];
    if (last.x === cur.x && last.z === cur.z) {
      path.push(roundXZ(base));
      break;
    }
    path.push(cur);
  }
  let smoothed = path;
  for (let i = 0; i < 2; i++) smoothed = chaikin(smoothed);
  return resample(smoothed, 0.5);
}

export function buildTrailRun(
  liftIndex: number,
  top: XZ,
  snow: Trail,
  opts: { name?: string; gentle?: boolean; open?: boolean },
  terrain: Terrain = TERRAIN,
): TrailRun {
  const path = routePath(top, opts.gentle ? 0.22 : null, terrain);
  const pitch = terrain.sustainedPitch(path) * realGradeFactor(terrain);
  return {
    liftIndex,
    name: opts.name ?? (opts.gentle ? "Dutch Meadows" : `Run ${liftIndex + 1}`),
    path,
    widths: path.map(() => STANDARD_TRAIL_WIDTH_FT),
    lengthFt: pathLengthFt(path, terrain),
    pitch,
    difficulty: classifyPitch(pitch),
    open: opts.open ?? true,
    snow,
    elevations: segmentElevationsForPath(path, terrain),
  };
}

export function defaultTrails(terrain: Terrain = TERRAIN): TrailRun[] {
  const ridge = REFERENCE_TOPS[0];
  return [
    buildTrailRun(0, ridge, freshTrail(), { name: "Dutch Meadows", gentle: true, open: true }, terrain),
  ];
}

/** Reference run length (Dutch Meadows); fixed at load so ski ticks do not regenerate routes. */
export const REF_TRAIL_FT = defaultTrails()[0].lengthFt;

export function fallLineTrailForLift(
  liftIndex: number,
  lift: LiftSlot,
  snow: Trail,
  terrain: Terrain = TERRAIN,
): TrailRun {
  const top = lift.anchor;
  return buildTrailRun(liftIndex, top, snow, { gentle: false, open: lift.confirmed }, terrain);
}

/** Map trail runs for snow aggregation (same shape `deriveSnow` / `readSnow` expect). */
export function snowCarriers(trails: readonly TrailRun[]) {
  return trails.map((t) => ({ confirmed: t.open, trail: t.snow, elevations: t.elevations }));
}
