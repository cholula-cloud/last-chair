import { REFERENCE_TOPS, rulesFor } from "./descent";
import type { LiftSlot } from "./state";
import { freshTrail, type Trail } from "./snow";
import { TERRAIN, type Terrain, type XZ } from "./terrain";

export type Difficulty = "green" | "blue" | "black";

export type TrailRun = {
  liftIndex: number;
  name: string;
  path: XZ[];
  lengthFt: number;
  pitch: number;
  difficulty: Difficulty;
  open: boolean;
  snow: Trail;
  builtDay?: number;
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
    lengthFt: pathLengthFt(path, terrain),
    pitch,
    difficulty: classifyPitch(pitch),
    open: opts.open ?? true,
    snow,
  };
}

export function defaultTrails(terrain: Terrain = TERRAIN): TrailRun[] {
  const ridge = REFERENCE_TOPS[0];
  return [
    buildTrailRun(0, ridge, freshTrail(), { name: "Dutch Meadows", gentle: true, open: true }, terrain),
  ];
}

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
  return trails.map((t) => ({ confirmed: t.open, trail: t.snow }));
}