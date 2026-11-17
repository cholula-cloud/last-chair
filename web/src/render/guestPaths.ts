import type { Guest, GuestState, LiftType } from "@/game/types";
import type { LiftAnchor } from "@/game/descent";

/** Lodge / base paperwork zone (world). Skiers finish their run here. */
export const LODGE = { x: 2.2, z: 2.4 } as const;

/** Lift loading zone at the base of the hill. */
export const LIFT_BASE = { x: 0.45, z: 2.55 } as const;

/** Parking / arrival strip near lodge. */
export const PARKING = { x: 3.2, z: 3.1 } as const;

/** Valley road running across the front of the base area. */
export const ROAD_Z = 4.35;

// ---------------------------------------------------------------------------
// Noise (deterministic, cheap) used for terrain bumps, snow patches, scatter.

function hash2(ix: number, iz: number): number {
  let h = ix * 374761393 + iz * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Value noise in [0, 1]. */
export function valueNoise(x: number, z: number): number {
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

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function softplus(x: number, k: number): number {
  return k * Math.log1p(Math.exp(x / k));
}

// ---------------------------------------------------------------------------
// Terrain: a Vermont hill rising toward −Z from a flat base area at +Z,
// with a summit dome, a shoulder to the east and side ridges framing a bowl.

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

// ---------------------------------------------------------------------------
// Lift line geometry shared by the lift mesh and riding guests.

export const LIFT_TOWER_H = 0.95;
/** Lateral offset of the up / return cables from the lift centre line. */
export const LIFT_CABLE_OFFSET = 0.2;

export type LiftPoint = { x: number; z: number; ground: number; top: number };

/** Unit vector along the lift (base → top) and its right-hand perpendicular. */
export function liftFrame(anchor: LiftAnchor) {
  const dx = anchor.x - LIFT_BASE.x;
  const dz = anchor.z - LIFT_BASE.z;
  const len = Math.hypot(dx, dz) || 1;
  const fx = dx / len;
  const fz = dz / len;
  return { fx, fz, px: -fz, pz: fx, len, yaw: Math.atan2(fx, fz) };
}

/** Terminals + intermediate towers along the lift line, base first. */
export function liftTowers(anchor: LiftAnchor): LiftPoint[] {
  const { len } = liftFrame(anchor);
  const inner = Math.max(3, Math.min(5, Math.round(len / 0.7)));
  const n = inner + 2;
  const pts: LiftPoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = LIFT_BASE.x + (anchor.x - LIFT_BASE.x) * t;
    const z = LIFT_BASE.z + (anchor.z - LIFT_BASE.z) * t;
    const ground = terrainHeight(x, z);
    pts.push({ x, z, ground, top: ground + LIFT_TOWER_H });
  }
  // Keep each span clear of the snow at its midpoint.
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < n - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const mx = (a.x + b.x) / 2;
      const mz = (a.z + b.z) / 2;
      const need = terrainHeight(mx, mz) + 0.7 - (a.top + b.top) / 2;
      if (need > 0) {
        a.top += need;
        b.top += need;
      }
    }
  }
  return pts;
}

/** Cable height at fraction t ∈ [0,1] of the lift line. */
export function cableHeightAt(t: number, towers: LiftPoint[]): number {
  const f = Math.max(0, Math.min(1, t)) * (towers.length - 1);
  const i = Math.min(towers.length - 2, Math.floor(f));
  const k = f - i;
  return towers[i].top + (towers[i + 1].top - towers[i].top) * k;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Trail: a gentle S-curve from the lift top to the lodge.

export function trailPoint(
  t: number,
  anchor: LiftAnchor,
): { x: number; y: number; z: number } {
  const dx = LODGE.x - anchor.x;
  const dz = LODGE.z - anchor.z;
  const len = Math.hypot(dx, dz) || 1;
  // Perpendicular pointing away from the lift line (east / uphill side).
  const px = dz / len;
  const pz = -dx / len;
  const ease = smooth(t);
  const bend =
    Math.sin(t * Math.PI) * 0.95 + Math.sin(t * Math.PI * 2) * 0.22;
  const x = lerp(anchor.x, LODGE.x, ease) + px * bend;
  const z = lerp(anchor.z, LODGE.z, ease) + pz * bend;
  return { x, y: terrainHeight(x, z) + 0.02, z };
}

/** Trail sampled as a polyline (for tree clearing). */
export function trailPolyline(anchor: LiftAnchor, n = 24) {
  const pts: { x: number; z: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const p = trailPoint(i / n, anchor);
    pts.push({ x: p.x, z: p.z });
  }
  return pts;
}

function distSqToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-6) return (px - ax) ** 2 + (pz - az) ** 2;
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return (px - (ax + t * dx)) ** 2 + (pz - (az + t * dz)) ** 2;
}

export function distSqToPolyline(
  px: number,
  pz: number,
  pts: { x: number; z: number }[],
): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distSqToSegment(px, pz, pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z);
    if (d < best) best = d;
  }
  return best;
}

/** Squared distance from a point to the ski trail (lift top → lodge). */
export function distSqToTrail(px: number, pz: number, anchor: LiftAnchor): number {
  return distSqToPolyline(px, pz, trailPolyline(anchor));
}

/** Squared distance from a point to the lift line (base → top). */
export function distSqToLiftLine(px: number, pz: number, anchor: LiftAnchor): number {
  return distSqToSegment(px, pz, LIFT_BASE.x, LIFT_BASE.z, anchor.x, anchor.z);
}

// ---------------------------------------------------------------------------
// Guest placement.

export type GuestWorldPos = { x: number; y: number; z: number };

export type GuestPose = "stand" | "walk" | "ride" | "ski";

export type GuestPlacement = GuestWorldPos & {
  /** Heading around +Y (0 = facing +Z). */
  yaw: number;
  pose: GuestPose;
  /** Forward lean (radians) for skiing. */
  lean: number;
  /** Sideways carve lean (radians). */
  roll: number;
};

/** Where the n-th guest in the lift line stands (tidy snake behind loading). */
function queueSpot(rank: number, anchor: LiftAnchor) {
  const { fx, fz, px, pz } = liftFrame(anchor);
  // Loading point on the up-cable side; the line runs back toward the
  // south-west so it never spills into the lodge frontage.
  const lx = LIFT_BASE.x + px * LIFT_CABLE_OFFSET;
  const lz = LIFT_BASE.z + pz * LIFT_CABLE_OFFSET;
  const qx = -0.32;
  const qz = 0.95;
  const perLane = 6;
  const lane = Math.floor(rank / perLane);
  const k = rank % perLane;
  const along = 0.3 + (lane % 2 === 0 ? k : perLane - 1 - k) * 0.2;
  const lateral = lane * 0.24;
  const x = lx + qx * along - qz * lateral;
  const z = lz + qz * along + qx * lateral * 0.3;
  return { x, z, yaw: Math.atan2(fx, fz) };
}

export function guestWorldPosition(
  index: number,
  state: GuestState,
  progress: number,
  liftAnchor: LiftAnchor,
  opts: { queueRank?: number; liftType?: LiftType; towers?: LiftPoint[] } = {},
): GuestPlacement {
  const row = index % 5;
  const col = Math.floor(index / 5);

  if (state === "arrive") {
    // Walk from the car park along the front of the lodge, then to the line.
    const sx = PARKING.x + col * 0.22;
    const sz = PARKING.z + 0.3 + row * 0.12;
    const q = queueSpot(Math.min(20, 8 + (index % 6)), liftAnchor);
    const wx = LODGE.x - 0.2 + row * 0.1;
    const wz = LODGE.z + 1.05 + (index % 3) * 0.1;
    const leg = progress < 0.45;
    const t = leg ? progress / 0.45 : (progress - 0.45) / 0.55;
    const ax = leg ? sx : wx;
    const az = leg ? sz : wz;
    const bx = leg ? wx : q.x + 0.3;
    const bz = leg ? wz : q.z + 0.1;
    const x = lerp(ax, bx, t);
    const z = lerp(az, bz, t);
    return {
      x,
      y: terrainHeight(x, z),
      z,
      yaw: Math.atan2(bx - ax, bz - az),
      pose: "walk",
      lean: 0,
      roll: 0,
    };
  }

  if (state === "queue") {
    const q = queueSpot(opts.queueRank ?? index % 14, liftAnchor);
    return {
      x: q.x,
      y: terrainHeight(q.x, q.z),
      z: q.z,
      yaw: q.yaw,
      pose: "stand",
      lean: 0,
      roll: 0,
    };
  }

  if (state === "ride") {
    const t = progress;
    const { px, pz, yaw } = liftFrame(liftAnchor);
    const x = lerp(LIFT_BASE.x, liftAnchor.x, t) + px * LIFT_CABLE_OFFSET;
    const z = lerp(LIFT_BASE.z, liftAnchor.z, t) + pz * LIFT_CABLE_OFFSET;
    let y = terrainHeight(x, z);
    if (opts.liftType === "chair") {
      const towers = opts.towers ?? liftTowers(liftAnchor);
      y = Math.max(y + 0.15, cableHeightAt(t, towers) - 0.62);
    }
    return { x, y, z, yaw, pose: "ride", lean: 0.12, roll: 0 };
  }

  if (state === "ski") {
    const p = trailPoint(progress, liftAnchor);
    const n = trailPoint(Math.min(1, progress + 0.02), liftAnchor);
    const b = trailPoint(Math.max(0, progress - 0.02), liftAnchor);
    const yaw = Math.atan2(n.x - b.x, n.z - b.z);
    // Carve: wiggle across the trail and lean into the turn.
    const phase = progress * Math.PI * 9 + index * 1.7;
    const w = Math.sin(phase) * 0.16;
    const lx = Math.cos(yaw);
    const lz = -Math.sin(yaw);
    const x = p.x + lx * w;
    const z = p.z + lz * w;
    return {
      x,
      y: terrainHeight(x, z),
      z,
      yaw: yaw + Math.cos(phase) * 0.45,
      pose: "ski",
      lean: 0.35,
      roll: -Math.cos(phase) * 0.3,
    };
  }

  // depart
  const t = progress;
  const ex = PARKING.x + (index % 3) * 0.3;
  const ez = PARKING.z + 0.2 + col * 0.12;
  const x = lerp(LODGE.x - 0.1, ex, t);
  const z = lerp(LODGE.z + 0.75, ez, t);
  return {
    x,
    y: terrainHeight(x, z),
    z,
    yaw: Math.atan2(ex - LODGE.x, ez - LODGE.z),
    pose: "walk",
    lean: 0,
    roll: 0,
  };
}

/** Place every guest, giving queued guests a tidy rank (front = most progress). */
export function placeGuests(
  guests: Guest[],
  liftAnchor: LiftAnchor,
  liftType: LiftType,
): GuestPlacement[] {
  const queued = guests
    .map((g, i) => ({ g, i }))
    .filter((e) => e.g.state === "queue")
    .sort((a, b) => b.g.progress - a.g.progress);
  const rank = new Map<number, number>();
  queued.forEach((e, r) => rank.set(e.i, r));
  const towers = liftTowers(liftAnchor);
  return guests.map((g, i) =>
    guestWorldPosition(i, g.state, g.progress, liftAnchor, {
      queueRank: rank.get(i),
      liftType,
      towers,
    }),
  );
}
