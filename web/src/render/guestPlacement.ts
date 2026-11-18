import type { Guest, GuestState, LiftType } from "@/game/types";
import type { LiftLine } from "@/game/descent";
import { ASSET_CATALOG, type PlacedAsset } from "@/game/base";
import { cableHeightAt, liftFrame, liftTowers, type LiftPoint } from "./liftLine";
import { pathPoint as sitePathPoint } from "@/game/site";
import { LIFT_CABLE_OFFSET, LODGE, PARKING, SITE } from "./layout";
import type { StallSlot } from "./parking";
import { clamp01, lerp } from "./math";
import { TERRAIN } from "@/game/terrain";
import { pathPoint as trailPathPoint, trailPoint } from "./trail";
import type { XZ } from "@/game/terrain";

type GuestPose = "stand" | "walk" | "ride" | "ski";

export type GuestPlacement = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pose: GuestPose;
  lean: number;
  roll: number;
};

type PlaceOpts = {
  queueRank?: number;
  liftType?: LiftType;
  towers?: LiftPoint[];
  stall?: { x: number; z: number };
  venue?: PlacedAsset;
  walkFrom?: XZ;
  walkTo?: XZ;
};

const CHAIR_DROP = 0.44;
const CHAIR_CLEARANCE = 0.15;

function onGround(x: number, z: number, yaw: number, pose: GuestPose): GuestPlacement {
  return { x, y: TERRAIN.height(x, z), z, yaw, pose, lean: 0, roll: 0 };
}

function queueSpot(rank: number, line: LiftLine) {
  const { fx, fz, px, pz } = liftFrame(line);
  const lx = line.bottom.x + px * LIFT_CABLE_OFFSET;
  const lz = line.bottom.z + pz * LIFT_CABLE_OFFSET;
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

function arrive(t: number, line: LiftLine, stall: { x: number; z: number }): GuestPlacement {
  const lotLodge = SITE.paths.find((p) => p.id === "lot_lodge")!.points;
  const lodgeLift = SITE.paths.find((p) => p.id === "lodge_lift")!.points;
  const q = queueSpot(8, line);
  const points = [stall, ...lotLodge, ...lodgeLift, { x: q.x + 0.3, z: q.z + 0.1 }];
  const p = sitePathPoint(points, t);
  return onGround(p.x, p.z, p.yaw, "walk");
}

function queue(rank: number, line: LiftLine): GuestPlacement {
  const q = queueSpot(rank, line);
  return onGround(q.x, q.z, q.yaw, "stand");
}

function ride(t: number, line: LiftLine, type: LiftType | undefined, towers?: LiftPoint[]) {
  const { px, pz, yaw } = liftFrame(line);
  const x = lerp(line.bottom.x, line.top.x, t) + px * LIFT_CABLE_OFFSET;
  const z = lerp(line.bottom.z, line.top.z, t) + pz * LIFT_CABLE_OFFSET;
  let y = TERRAIN.height(x, z);
  if (type === "chair") {
    y = Math.max(y + CHAIR_CLEARANCE, cableHeightAt(t, towers ?? liftTowers(line)) - CHAIR_DROP);
  }
  return { x, y, z, yaw, pose: "ride" as const, lean: 0.12, roll: 0 };
}

function ski(index: number, t: number, line: LiftLine, path?: readonly XZ[]): GuestPlacement {
  const p = path?.length ? trailPathPoint(path, t) : trailPoint(t, line);
  const n = path?.length
    ? trailPathPoint(path, Math.min(1, t + 0.02))
    : trailPoint(Math.min(1, t + 0.02), line);
  const b = path?.length
    ? trailPathPoint(path, Math.max(0, t - 0.02))
    : trailPoint(Math.max(0, t - 0.02), line);
  const yaw = Math.atan2(n.x - b.x, n.z - b.z);
  const phase = t * Math.PI * 9 + index * 1.7;
  const w = Math.sin(phase) * 0.16;
  const x = p.x + Math.cos(yaw) * w;
  const z = p.z - Math.sin(yaw) * w;
  return {
    x,
    y: TERRAIN.height(x, z),
    z,
    yaw: yaw + Math.cos(phase) * 0.45,
    pose: "ski",
    lean: 0.35,
    roll: -Math.cos(phase) * 0.3,
  };
}

function depart(t: number, stall: { x: number; z: number }): GuestPlacement {
  const lodgeLift = [...SITE.paths.find((p) => p.id === "lodge_lift")!.points].reverse();
  const lotLodge = [...SITE.paths.find((p) => p.id === "lot_lodge")!.points].reverse();
  const points = [{ x: LODGE.x - 0.1, z: LODGE.z + 0.75 }, ...lodgeLift, ...lotLodge, stall];
  const p = sitePathPoint(points, t);
  return onGround(p.x, p.z, p.yaw, "walk");
}

function visitVenue(index: number, t: number, line: LiftLine, asset?: PlacedAsset): GuestPlacement {
  const queueEnd = queueSpot(8, line);
  if (!asset) return onGround(LODGE.x, LODGE.z + 0.75, queueEnd.yaw, "stand");

  const { width, depth } = ASSET_CATALOG[asset.id].footprint;
  const side = queueEnd.z >= asset.at.z ? 1 : -1;
  const spot = {
    x: asset.at.x + width * ((index % 5) / 5 - 0.4),
    z: asset.at.z + side * (depth / 2 + 0.18 + (Math.floor(index / 5) % 3) * 0.15),
  };
  const walkFraction = 0.2;
  if (t >= walkFraction && t <= 1 - walkFraction) {
    return onGround(spot.x, spot.z, Math.atan2(asset.at.x - spot.x, asset.at.z - spot.z), "stand");
  }
  const returning = t > 1 - walkFraction;
  const path = returning ? [spot, queueEnd] : [queueEnd, spot];
  const progress = returning ? (t - (1 - walkFraction)) / walkFraction : t / walkFraction;
  const p = sitePathPoint(path, progress);
  return onGround(p.x, p.z, p.yaw, "walk");
}

export function guestWorldPosition(
  index: number,
  state: GuestState,
  progress: number,
  line: LiftLine,
  opts: PlaceOpts & { path?: readonly XZ[] } = {},
): GuestPlacement {
  const t = clamp01(Number.isFinite(progress) ? progress : 0);
  const stall = opts.stall ?? PARKING;
  switch (state) {
    case "arrive":
      return arrive(t, line, stall);
    case "queue":
      return queue(opts.queueRank ?? index % 14, line);
    case "ride":
      return ride(t, line, opts.liftType, opts.towers);
    case "ski":
      return ski(index, t, line, opts.path);
    case "walk_lift":
    case "walk_out": {
      const p = sitePathPoint([opts.walkFrom ?? line.bottom, opts.walkTo ?? line.bottom], t);
      return onGround(p.x, p.z, p.yaw, "walk");
    }
    case "refuel":
      return visitVenue(index, t, line, opts.venue);
    default:
      return depart(t, stall);
  }
}

export type PlacedLift = { line: LiftLine; type: LiftType; towers?: LiftPoint[]; path?: readonly XZ[] };

export function placeGuests(
  guests: Guest[],
  lifts: PlacedLift[],
  stalls: Map<string, StallSlot> = new Map(),
  trailPaths?: readonly (readonly XZ[] | undefined)[],
  assets: readonly PlacedAsset[] = [],
): GuestPlacement[] {
  const primary = lifts[0];
  return guests.map((g, i) => {
    const slot = stalls.get(g.id);
    const stall = slot ? { x: slot.x, z: slot.z } : PARKING;
    const lift = lifts[g.liftIndex ?? 0] ?? primary;
    const liftKey = lifts[g.liftIndex ?? 0] ? (g.liftIndex ?? 0) : 0;
    let queueRank: number | undefined;
    if (g.state === "queue") {
      queueRank = 0;
      for (let j = 0; j < guests.length; j++) {
        const o = guests[j];
        if (o.state !== "queue" || j === i) continue;
        const oKey = lifts[o.liftIndex ?? 0] ? (o.liftIndex ?? 0) : 0;
        if (oKey !== liftKey) continue;
        if (o.progress > g.progress || (o.progress === g.progress && j < i)) queueRank++;
      }
    }
    const skiPath =
      g.state === "ski" && g.trailIndex != null
        ? trailPaths?.[g.trailIndex]
        : lift.path;
    return guestWorldPosition(i, g.state, g.progress, lift.line, {
      queueRank,
      liftType: lift.type,
      stall,
      towers: lift.towers ?? liftTowers(lift.line),
      path: skiPath ?? lift.path,
      venue: g.state === "refuel" ? assets[g.venueIndex ?? -1] : undefined,
      walkFrom: g.trailIndex == null ? undefined : trailPaths?.[g.trailIndex]?.at(-1),
      walkTo: g.state === "walk_lift" ? lift.line.bottom : TERRAIN.base,
    });
  });
}
