import type { Guest, GuestState, LiftType } from "@/game/types";
import type { LiftAnchor } from "@/game/descent";
import { cableHeightAt, liftFrame, liftTowers, type LiftPoint } from "./liftLine";
import { pathPoint } from "@/game/site";
import { LIFT_BASE, LIFT_CABLE_OFFSET, LODGE, PARKING, SITE } from "./layout";
import type { StallSlot } from "./parking";
import { clamp01, lerp } from "./math";
import { TERRAIN } from "@/game/terrain";
import { trailPoint } from "./trail";

type GuestPose = "stand" | "walk" | "ride" | "ski";

export type GuestPlacement = {
  x: number;
  y: number;
  z: number;
  /** Heading around +Y (0 = facing +Z). */
  yaw: number;
  pose: GuestPose;
  /** Forward lean (radians) for skiing. */
  lean: number;
  /** Sideways carve lean (radians). */
  roll: number;
};

type PlaceOpts = {
  queueRank?: number;
  liftType?: LiftType;
  towers?: LiftPoint[];
  stall?: { x: number; z: number };
};

/**
 * Rider's feet sit this far below the cable on a chair: kit chair seat 1.75 m
 * under the grip plus the skier's 0.98 m hip, at toy scale 0.15, plus the
 * grip's 0.03 hang. Skiers ride at least CHAIR_CLEARANCE above snow.
 */
const CHAIR_DROP = 0.44;
const CHAIR_CLEARANCE = 0.15;

function onGround(x: number, z: number, yaw: number, pose: GuestPose): GuestPlacement {
  return { x, y: TERRAIN.height(x, z), z, yaw, pose, lean: 0, roll: 0 };
}

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

/** Walk stall → lot path → lodge → lift queue. */
function arrive(t: number, anchor: LiftAnchor, stall: { x: number; z: number }): GuestPlacement {
  const lotLodge = SITE.paths.find((p) => p.id === "lot_lodge")!.points;
  const lodgeLift = SITE.paths.find((p) => p.id === "lodge_lift")!.points;
  const q = queueSpot(8, anchor);
  const points = [stall, ...lotLodge, ...lodgeLift, { x: q.x + 0.3, z: q.z + 0.1 }];
  const p = pathPoint(points, t);
  return onGround(p.x, p.z, p.yaw, "walk");
}

function queue(rank: number, anchor: LiftAnchor): GuestPlacement {
  const q = queueSpot(rank, anchor);
  return onGround(q.x, q.z, q.yaw, "stand");
}

function ride(t: number, anchor: LiftAnchor, type: LiftType | undefined, towers?: LiftPoint[]) {
  const { px, pz, yaw } = liftFrame(anchor);
  const x = lerp(LIFT_BASE.x, anchor.x, t) + px * LIFT_CABLE_OFFSET;
  const z = lerp(LIFT_BASE.z, anchor.z, t) + pz * LIFT_CABLE_OFFSET;
  let y = TERRAIN.height(x, z);
  if (type === "chair") {
    y = Math.max(y + CHAIR_CLEARANCE, cableHeightAt(t, towers ?? liftTowers(anchor)) - CHAIR_DROP);
  }
  return { x, y, z, yaw, pose: "ride" as const, lean: 0.12, roll: 0 };
}

/** Carve down the trail: wiggle across it and lean into the turn. */
function ski(index: number, t: number, anchor: LiftAnchor): GuestPlacement {
  const p = trailPoint(t, anchor);
  const n = trailPoint(Math.min(1, t + 0.02), anchor);
  const b = trailPoint(Math.max(0, t - 0.02), anchor);
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
  const p = pathPoint(points, t);
  return onGround(p.x, p.z, p.yaw, "walk");
}

export function guestWorldPosition(
  index: number,
  state: GuestState,
  progress: number,
  anchor: LiftAnchor,
  opts: PlaceOpts = {},
): GuestPlacement {
  const t = clamp01(Number.isFinite(progress) ? progress : 0);
  const stall = opts.stall ?? PARKING;
  switch (state) {
    case "arrive":
      return arrive(t, anchor, stall);
    case "queue":
      return queue(opts.queueRank ?? index % 14, anchor);
    case "ride":
      return ride(t, anchor, opts.liftType, opts.towers);
    case "ski":
      return ski(index, t, anchor);
    default:
      return depart(t, stall);
  }
}

/** A lift guests can be placed on; the list index matches `Guest.liftIndex`. */
export type PlacedLift = { anchor: LiftAnchor; type: LiftType; towers?: LiftPoint[] };

/**
 * Place every guest on their own lift (`liftIndex`, falling back to the first).
 * Queued guests get a tidy rank within their lift: front of the line is the
 * guest with the most progress, ties broken by list order.
 */
export function placeGuests(
  guests: Guest[],
  lifts: PlacedLift[],
  stalls: Map<string, StallSlot> = new Map(),
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
    return guestWorldPosition(i, g.state, g.progress, lift.anchor, {
      queueRank,
      liftType: lift.type,
      stall,
      towers: lift.towers ?? liftTowers(lift.anchor),
    });
  });
}
