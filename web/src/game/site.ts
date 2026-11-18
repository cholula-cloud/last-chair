/** Per-mountain site layout: arrival, roads, paths, buildings (pure data). */

export type XZ = { x: number; z: number };

export type ArrivalKind = "gravel_lot" | "roadside" | "paved_lot";

export type SiteDef = {
  arrival: {
    kind: ArrivalKind;
    center: XZ;
    size: { w: number; d: number };
    yaw: number;
    stalls: number;
    rows: number;
    overflow: { kind: "road_shoulder"; spots: number; from: XZ; to: XZ };
  };
  road: { z: number; xFrom: number; xTo: number; spur: XZ[] };
  paths: { id: "lot_lodge" | "lodge_lift"; points: XZ[] }[];
  buildings: {
    lodge: XZ;
    warmingHut: XZ;
    cafe: XZ;
    shop: XZ;
    houses: { at: XZ; yaw: number }[];
    snowcat: XZ & { yaw: number };
  };
  berms: { from: XZ; to: XZ; height: number }[];
  signs: { kind: "route_shield" | "area_sign"; at: XZ; yaw: number; text?: string }[];
  water: { kind: "pond" | "creek"; points: XZ[] }[];
  backdrop: { radii: number[] };
  homeFrame: XZ[];
};

/** Stall centres in the gravel lot (row-major). */
export function stallCenters(site: SiteDef): XZ[] {
  const { center, size, stalls, rows } = site.arrival;
  const perRow = stalls / rows;
  const out: XZ[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < perRow; c++) {
      const fx = (c + 0.5) / perRow - 0.5;
      const fz = (r + 0.5) / rows - 0.5;
      out.push({
        x: center.x + fx * size.w,
        z: center.z + fz * size.d,
      });
    }
  }
  return out;
}

/** Shoulder overflow spots evenly along Route 100. */
export function shoulderSpots(site: SiteDef): XZ[] {
  const { overflow } = site.arrival;
  const { from, to, spots } = overflow;
  const out: XZ[] = [];
  for (let i = 0; i < spots; i++) {
    const t = spots <= 1 ? 0.5 : i / (spots - 1);
    out.push({
      x: from.x + (to.x - from.x) * t,
      z: from.z + (to.z - from.z) * t,
    });
  }
  return out;
}

/** Polyline length in world units. */
export function pathLength(points: readonly XZ[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  }
  return len;
}

export function pathPoint(points: readonly XZ[], t: number): { x: number; z: number; yaw: number } {
  if (points.length === 0) return { x: 0, z: 0, yaw: 0 };
  if (points.length === 1) return { x: points[0].x, z: points[0].z, yaw: 0 };
  const total = pathLength(points);
  const d = Math.max(0, Math.min(1, t)) * total;
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
    if (acc + seg >= d || i === points.length - 1) {
      const u = seg < 1e-6 ? 1 : (d - acc) / seg;
      const x = points[i - 1].x + (points[i].x - points[i - 1].x) * u;
      const z = points[i - 1].z + (points[i].z - points[i - 1].z) * u;
      return {
        x,
        z,
        yaw: Math.atan2(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z),
      };
    }
    acc += seg;
  }
  const last = points[points.length - 1];
  return { x: last.x, z: last.z, yaw: 0 };
}

/** Lot corner used for home framing (far corner from the lodge). */
export function lotFarCorner(site: SiteDef): XZ {
  const { center, size } = site.arrival;
  return { x: center.x - size.w / 2, z: center.z - size.d / 2 };
}