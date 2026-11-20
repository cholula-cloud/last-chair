import { rulesFor } from "./descent";
import { OFF_LEASE_MESSAGE, onLease } from "./lease";
import type { GameState } from "./state";
import { TERRAIN, type Terrain, type XZ } from "./terrain";
import { hasBaseContinuation, hasTrailDependents, JUNCTION_EPSILON } from "./trailNetwork";
import {
  classifyPitch,
  MAX_TRAILS_PER_LIFT,
  MAX_TRAILS_TOTAL,
  pathLengthFt,
  pathLengthWorld,
  realGradeFactor,
  roundTrailCost,
  trailsOnLift,
  type Difficulty,
  type TrailConnection,
  type TrailLinks,
  type TrailRun,
} from "./trails";
import { remoteTrailEndThreshold, walkDurationMin, walkToLiftPath } from "./walkPaths";
import {
  along,
  arcLengths,
  distance,
  fractionAt,
  project,
  simplifyStroke,
  withinPath,
} from "./paintedTrailGeometry";

export { simplifyStroke } from "./paintedTrailGeometry";

export const BRUSH_WIDTHS = [30, 60, 100, 150] as const;
export const STANDARD_BRUSH_WIDTH = BRUSH_WIDTHS[1];
const MIN_WIDTH = 15;
const SQ_FT_PER_ACRE = 43_560;
// Preserve the previous $0.40 per foot cost for a standard-width corridor.
export const CLEARING_PER_ACRE = (0.4 * SQ_FT_PER_ACRE) / STANDARD_BRUSH_WIDTH;
/** Real pitch above which a painted trail is too steep for the guests. The slope layer calls this double black. */
export const MAX_PAINTED_PITCH = 0.65;
const MAX_SAVED_TRAILS = 24;
// A draft can update twice per pointer event. Bound the authored points before
// simplification and the derived points before sustained pitch scans pairs.
const MAX_DRAFT_POINTS = 2_048;
const MAX_TRAIL_SAMPLES = 768;
const DRAFT_TOO_LONG = "That draft’s too long. Undo a stroke or paint a shorter run.";
/**
 * A stroke can snap to the village or an open lift's lower terminal within this share of the base area.
 */
export const BASE_CONNECT_FRACTION = 0.4;
/** A stroke end joins another trail only inside this share of the horizontal scale H. */
export const TRAIL_JOIN_FRACTION = 1 / 20;
/** A finger lands a little off the ribbon edge; this margin (world units) is added to a trail's half-width. */
const JOIN_FINGER_MARGIN = 0.15;
/** The base connect circle always clears the brush by this much (world units). */
const BASE_BRUSH_MARGIN = 0.5;

/** World-unit radius for snapping a stroke endpoint to a bottom runout. */
export function baseConnectRadius(terrain: Terrain, widthFt: number): number {
  return Math.max(
    rulesFor(terrain).baseAreaRadius * BASE_CONNECT_FRACTION,
    widthFt / (2 * terrain.horizontalFeetPerUnit) + BASE_BRUSH_MARGIN,
  );
}
const DISCONNECTED_STROKE = "Start your next stroke at the end of the draft.";

export type PaintStroke = {
  points: readonly XZ[];
  widthFt: number;
  erase?: boolean;
};

export type PaintedTrailPreview = {
  path: XZ[];
  /** End of the authored centerline before it snaps or follows a connector. */
  draftEnd: XZ | null;
  widths: number[];
  /** Brush footprint on the authored trail. */
  clearing: { path: XZ[]; widths: number[]; previousWidths?: number[] };
  lengthFt: number;
  verticalFt: number;
  acres: number;
  cost: number;
  pitch: number;
  difficulty: Difficulty;
  liftIndex: number;
  trailIndex: number | null;
  deleteTrail: boolean;
  reason: string | null;
  problemSegments: number[];
  links?: TrailLinks;
  /** Set when the run ends away from where guests are collected; the sim walks them back. */
  walkBack: { ft: number; minutes: number } | null;
};

type PaintState = Pick<GameState, "lifts" | "trails">;

// Preserve bends and endpoints and limit each segment to a fixed maximum length.
function subdivide(path: readonly XZ[], widths: readonly number[], spacing: number) {
  const steps: number[] = [];
  let count = Math.min(path.length, 1);
  for (let i = 1; i < path.length; i++) {
    const len = distance(path[i - 1], path[i]);
    // Keep an already sampled trail stable under repeated width edits. Tiny
    // floating point differences should not double an almost-equal segment.
    const n = len < 1e-8 ? 0 : Math.max(1, Math.ceil(len / spacing - 1e-8));
    count += n;
    if (count > MAX_TRAIL_SAMPLES) return null;
    steps.push(n);
  }
  const points = path.slice(0, 1);
  const sizes = widths.slice(0, 1);
  for (let i = 1; i < path.length; i++) {
    const n = steps[i - 1];
    for (let j = 1; j <= n; j++) {
      const t = j / n;
      points.push(along(path[i - 1], path[i], t));
      sizes.push(widths[i - 1] + (widths[i] - widths[i - 1]) * t);
    }
  }
  return { path: points, widths: sizes };
}

function trailWidth(trail: TrailRun, i: number): number {
  return trail.widths?.[i] ?? STANDARD_BRUSH_WIDTH;
}

/** Saved trails may run past the lease; only newly painted ground must stay inside it. */
function onExistingTrail(p: XZ, state: PaintState): boolean {
  return state.trails.some((trail) => withinPath(p, trail.path, 0.05));
}

/** `byWidth` widens the radius to the trail's own half-width at the segment, plus a finger margin. */
function trailHit(p: XZ, state: PaintState, radius: number, terrain: Terrain, finish = false) {
  let best: { index: number; fraction: number; at: XZ; distance: number } | null = null;
  for (const [index, trail] of state.trails.entries()) {
    if (!trail.open || !state.lifts[trail.liftIndex]?.confirmed || (finish && state.lifts[trail.liftIndex].closing)) continue;
    const lengths = arcLengths(trail.path);
    for (let i = 1; i < trail.path.length; i++) {
      const hit = project(p, trail.path[i - 1], trail.path[i]);
      const reach = finish
        ? Math.max(radius, Math.max(trailWidth(trail, i - 1), trailWidth(trail, i)) / (2 * terrain.horizontalFeetPerUnit) + JOIN_FINGER_MARGIN)
        : radius;
      if (hit.distance > reach || (best && hit.distance >= best.distance)) continue;
      const fraction = fractionAt(lengths, i - 1, hit.t);
      if (finish && !hasBaseContinuation(state.trails, index, fraction, terrain)) continue;
      best = { index, fraction, at: hit.at, distance: hit.distance };
    }
  }
  return best;
}

const crossXZ = (a: XZ, b: XZ) => a.x * b.z - a.z * b.x;
const subtract = (a: XZ, b: XZ) => ({ x: a.x - b.x, z: a.z - b.z });

function crossingArms(path: readonly XZ[], segment: number, t: number, at: XZ) {
  const before = path[segment - (t <= JUNCTION_EPSILON ? 1 : 0)];
  const after = path[segment + (t >= 1 - JUNCTION_EPSILON ? 2 : 1)];
  if (!before || !after) return [];
  return [before, after].map((p) => Math.atan2(p.z - at.z, p.x - at.x));
}

function findCrossings(path: readonly XZ[], state: PaintState, terrain: Terrain): TrailConnection[] {
  const lengths = arcLengths(path);
  const height = (p: XZ) => terrain.height(p.x, p.z);
  const hits: TrailConnection[] = [];
  for (const [trailIndex, trail] of state.trails.entries()) {
    const other = trail.path;
    if (!state.lifts[trail.liftIndex]?.confirmed || state.lifts[trail.liftIndex].closing ||
      !hasBaseContinuation(state.trails, trailIndex, 0, terrain)) continue;
    const otherLengths = arcLengths(other);
    for (let i = 0; i < path.length - 1; i++) {
      const r = subtract(path[i + 1], path[i]);
      for (let j = 0; j < other.length - 1; j++) {
        const s = subtract(other[j + 1], other[j]);
        const denominator = crossXZ(r, s);
        if (Math.abs(denominator) < 1e-9) continue;
        const gap = subtract(other[j], path[i]);
        const t = crossXZ(gap, s) / denominator;
        const u = crossXZ(gap, r) / denominator;
        if (Math.min(t, u) < -JUNCTION_EPSILON || Math.max(t, u) > 1 + JUNCTION_EPSILON) continue;
        const from = fractionAt(lengths, i, t);
        const to = fractionAt(otherLengths, j, u);
        if (Math.min(from, to) <= JUNCTION_EPSILON || Math.max(from, to) >= 1 - JUNCTION_EPSILON) continue;
        if (hits.some((hit) => hit.trailIndex === trailIndex && Math.abs(hit.from - from) < JUNCTION_EPSILON &&
          Math.abs(hit.to - to) < JUNCTION_EPSILON)) continue;
        const at = along(path[i], path[i + 1], t);
        const h = height(at);
        if (h >= Math.min(height(path[0]), height(other[0])) - JUNCTION_EPSILON ||
          h <= Math.max(height(path[path.length - 1]), height(other[other.length - 1])) + JUNCTION_EPSILON) continue;
        const arms = [crossingArms(path, i, t, at), crossingArms(other, j, u, at)]
          .flatMap((angles, owner) => angles.map((angle) => ({ angle, owner })))
          .sort((a, b) => a.angle - b.angle);
        // At a polyline bend the four arms must alternate. A touch does not make a junction.
        if (arms.length === 4 && arms.every((arm, k) => {
          const next = arms[(k + 1) % 4];
          const angleGap = (next.angle - arm.angle + 2 * Math.PI) % (2 * Math.PI);
          return arm.owner !== next.owner && angleGap > JUNCTION_EPSILON;
        })) hits.push({ trailIndex, from, to, at });
      }
    }
  }
  return hits.sort((a, b) => a.from - b.from);
}

function changeWidths(path: readonly XZ[], widths: readonly number[], stroke: PaintStroke, terrain: Terrain) {
  const radius = stroke.widthFt / (2 * terrain.horizontalFeetPerUnit);
  return path.map((p, i) => {
    if (!withinPath(p, stroke.points, radius)) return widths[i];
    if (!stroke.erase) return Math.max(widths[i], stroke.widthFt);
    const width = widths[i] - stroke.widthFt;
    return width >= MIN_WIDTH ? width : 0;
  });
}

/** Grow a new centerline in stroke order. Overlay strokes change width without adding a route. */
function assembleDraft(strokes: readonly PaintStroke[], terrain: Terrain, spacing: number) {
  const [first, ...rest] = strokes;
  const path = [...(first?.points ?? [])];
  const widths = path.map(() => first.widthFt);
  const overlays: PaintStroke[] = [];
  const joinRadius = terrain.scale.horizontal / 6;

  for (const stroke of rest) {
    const { points, widthFt, erase } = stroke;
    const tail = path.at(-1);
    const next = points[1];
    if (!erase && tail && next && distance(points[0], tail) <= joinRadius &&
        points.slice(1).some((point) => !withinPath(point, path, 1e-5))) {
      // Keep the existing endpoint. Blend the new width over at most one sample.
      const length = distance(tail, next);
      if (length > spacing) {
        path.push(along(tail, next, spacing / length));
        widths.push(widthFt);
      }
      path.push(...points.slice(1));
      widths.push(...points.slice(1).map(() => widthFt));
    } else if (erase || points.every((point) => withinPath(point, path, widthFt / (2 * terrain.horizontalFeetPerUnit)))) {
      overlays.push(stroke);
    } else {
      return { path, widths, overlays, disconnected: true };
    }
  }
  return { path, widths, overlays, disconnected: false };
}

function acresFor(path: readonly XZ[], widths: readonly number[], terrain: Terrain) {
  let area = 0;
  for (let i = 1; i < path.length; i++) {
    area += distance(path[i - 1], path[i]) * terrain.horizontalFeetPerUnit * (widths[i - 1] + widths[i]) / 2;
  }
  return area / SQ_FT_PER_ACRE;
}

function boundsContains({ x, z }: XZ, terrain: Terrain) {
  const { xMin, xMax, zMin, zMax } = terrain.bounds;
  return x >= xMin && x <= xMax && z >= zMin && z <= zMax;
}

function crossesLift(a: XZ, b: XZ, next: XZ | undefined, top: XZ, bottom: XZ, terrain: Terrain, baseRadius: number) {
  const r = { x: b.x - a.x, z: b.z - a.z };
  const s = { x: bottom.x - top.x, z: bottom.z - top.z };
  const q = { x: top.x - a.x, z: top.z - a.z };
  const cross = (u: XZ, v: XZ) => u.x * v.z - u.z * v.x;
  const divisor = cross(r, s);
  if (Math.abs(divisor) < 1e-9) return false;
  const t = cross(q, s) / divisor;
  const u = cross(q, r) / divisor;
  const epsilon = 1e-5;
  if (t <= epsilon || t > 1 + epsilon || u <= epsilon || u >= 1 - epsilon) return false;
  if (t >= 1 - epsilon) {
    // A trail can touch a line and turn away, or finish at a trail join on it.
    const exitSide = next ? cross({ x: next.x - top.x, z: next.z - top.z }, s) : 0;
    if (cross(q, s) * exitSide <= 0) return false;
  }
  return distance(along(a, b, t), terrain.base) > baseRadius;
}

function summarize(path: XZ[], widths: number[], terrain: Terrain) {
  const pitch = path.length > 1 ? terrain.sustainedPitch(path) * realGradeFactor(terrain) : 0;
  const start = path[0];
  const end = path.at(-1);
  const verticalFt = start && end
    ? Math.round((terrain.height(start.x, start.z) - terrain.height(end.x, end.z)) * terrain.feetPerUnit)
    : 0;
  return {
    path,
    widths,
    pitch,
    difficulty: classifyPitch(pitch),
    lengthFt: pathLengthFt(path, terrain),
    verticalFt,
    acres: acresFor(path, widths, terrain),
  };
}

function walkBackFor(path: readonly XZ[], bottom: XZ, terrain: Terrain) {
  const end = path.at(-1);
  if (!end || distance(end, bottom) <= remoteTrailEndThreshold(terrain)) return null;
  const walk = walkToLiftPath(path, bottom);
  return { ft: pathLengthWorld(walk) * terrain.horizontalFeetPerUnit, minutes: walkDurationMin(walk, terrain) };
}

function rejectedPreview(reason: string): PaintedTrailPreview {
  return {
    path: [],
    draftEnd: null,
    widths: [],
    clearing: { path: [], widths: [] },
    pitch: 0,
    difficulty: "green",
    lengthFt: 0,
    verticalFt: 0,
    acres: 0,
    cost: 0,
    liftIndex: -1,
    trailIndex: null,
    deleteTrail: false,
    reason,
    problemSegments: [],
    walkBack: null,
  };
}

function editTrail(state: PaintState, trailIndex: number, strokes: readonly PaintStroke[], terrain: Terrain): PaintedTrailPreview {
  const trail = state.trails[trailIndex];
  const spacing = Math.min(terrain.scale.horizontal / 12, MIN_WIDTH / terrain.horizontalFeetPerUnit);
  const samples = subdivide(
    trail.path,
    trail.path.map((_, i) => trailWidth(trail, i)),
    spacing,
  );
  if (!samples) return rejectedPreview(DRAFT_TOO_LONG);
  const { path, widths: before } = samples;
  const disconnected = strokes.slice(1).findIndex((stroke) => {
    const radius = Math.max(terrain.scale.horizontal / 12, stroke.widthFt / (2 * terrain.horizontalFeetPerUnit));
    return stroke.points.some((point) => !withinPath(point, trail.path, radius));
  });
  const edits = disconnected < 0 ? strokes : strokes.slice(0, disconnected + 1);
  const widths = edits.reduce((last, stroke) => changeWidths(path, last, stroke, terrain), before);
  const deleteTrail = widths.length > 0 && widths.every((width) => width === 0);
  let reason: string | null = null;
  if (disconnected >= 0) {
    reason = "Keep each edit stroke over the same trail.";
  } else if (deleteTrail && hasTrailDependents(state.trails, new Set([trailIndex]))) {
    reason = "Close the trails that connect here first.";
  } else if (deleteTrail && trailsOnLift(state.trails, trail.liftIndex).length === 1) {
    reason = "This lift needs at least one open trail.";
  } else if (!deleteTrail && widths.includes(0)) {
    reason = "Reconnect the trail before cutting.";
  } else if (widths.every((width, i) => width === before[i])) {
    reason = "Paint over this trail to change its width.";
  }
  const added = widths.map((width, i) => Math.max(0, width - before[i]));
  return {
    ...summarize(path, widths, terrain),
    draftEnd: null,
    clearing: { path, widths, previousWidths: before },
    cost: roundTrailCost(acresFor(path, added, terrain) * CLEARING_PER_ACRE),
    liftIndex: trail.liftIndex,
    trailIndex,
    deleteTrail,
    reason,
    walkBack: null,
    problemSegments: path.flatMap((_, i) => i + 1 < widths.length && (!widths[i] || !widths[i + 1]) ? [i] : []),
  };
}

/** Geometry and budget estimate shared by the brush preview and the commit rule. */
export function previewPaintedTrail(
  state: PaintState,
  strokes: readonly PaintStroke[],
  terrain: Terrain = TERRAIN,
  connectCrossings = false,
): PaintedTrailPreview {
  const nonempty: PaintStroke[] = [];
  let authoredPoints = 0;
  for (const stroke of strokes) {
    const { points, widthFt } = stroke;
    if (!points.length) continue;
    authoredPoints += points.length;
    if (authoredPoints > MAX_DRAFT_POINTS) return rejectedPreview(DRAFT_TOO_LONG);
    if (!BRUSH_WIDTHS.some((width) => width === widthFt) ||
      points.some((p) => !boundsContains(p, terrain))) {
      return rejectedPreview("Keep the brush inside the mountain and choose a listed width.");
    }
    nonempty.push(stroke);
  }
  const H = terrain.scale.horizontal;
  const active = nonempty.map((stroke) => ({
    ...stroke,
    points: simplifyStroke(stroke.points, Math.min(0.05 * H, stroke.widthFt / (4 * terrain.horizontalFeetPerUnit))),
  }));
  const first = active[0];
  const baseRadius = rulesFor(terrain).baseAreaRadius;
  const spacing = Math.min(H / 12, MIN_WIDTH / terrain.horizontalFeetPerUnit);
  const { path, widths: draftWidths, overlays, disconnected } = assembleDraft(active, terrain, spacing);
  const firstPoint = path[0];
  const start = firstPoint && trailHit(firstPoint, state, H / 6, terrain);
  if (start) {
    const samples = subdivide(path, draftWidths, spacing);
    if (!samples) return rejectedPreview(DRAFT_TOO_LONG);
    const editTarget = state.trails[start.index];
    const radius = Math.max(H / 12, STANDARD_BRUSH_WIDTH / (2 * terrain.horizontalFeetPerUnit));
    const covered = samples.path.filter((p) => withinPath(p, editTarget.path, radius)).length;
    if (first.erase || covered >= samples.path.length * 0.8) {
      return editTrail(state, start.index, active, terrain);
    }
  }

  let nearestLift = -1;
  let nearestDistance = H / 6;
  if (firstPoint) {
    state.lifts.forEach((lift, i) => {
      const gap = distance(firstPoint, lift.anchor);
      if (lift.confirmed && gap <= nearestDistance) {
        nearestLift = i;
        nearestDistance = gap;
      }
    });
  }

  const enterByTrail = start && start.fraction > JUNCTION_EPSILON && start.fraction < 1 - JUNCTION_EPSILON &&
    !state.lifts[state.trails[start.index].liftIndex].closing &&
    (nearestLift < 0 || start.distance < nearestDistance);
  const liftIndex = enterByTrail ? state.trails[start.index].liftIndex : nearestLift;
  const end = path.at(-1);
  let bottom: XZ | undefined;
  if (end && !disconnected) {
    let reach = baseConnectRadius(terrain, active.at(-1)?.widthFt ?? STANDARD_BRUSH_WIDTH);
    const runouts = [terrain.base, ...state.lifts.flatMap((lift) => lift.confirmed && lift.bottom ? [lift.bottom] : [])];
    for (const at of runouts) {
      const gap = distance(end, at);
      if (gap <= reach) {
        bottom = at;
        reach = gap;
      }
    }
  }
  const finish = !disconnected && !bottom && end && trailHit(end, state, H * TRAIL_JOIN_FRACTION, terrain, true);
  if (path.length && liftIndex >= 0) path[0] = enterByTrail ? start.at : state.lifts[liftIndex].anchor;
  if (path.length > 1 && finish) path[path.length - 1] = finish.at;
  if (path.length > 1 && bottom && end && distance(end, bottom) > 1e-8) {
    path.push(bottom);
    draftWidths.push(draftWidths.at(-1)!);
  }

  let reason: string | null = null;
  if (!first || path.length < 2) reason = "Paint a trail down the hill.";
  else if (first.erase) reason = "Start on an existing trail to erase it.";
  else if (liftIndex < 0) reason = "Start at a lift top or an open trail.";
  else if (disconnected) reason = DISCONNECTED_STROKE;
  else if (trailsOnLift(state.trails, liftIndex).length >= MAX_TRAILS_PER_LIFT) reason = "Three trails per lift is the limit.";
  else if (state.trails.filter((trail) => trail.open).length >= MAX_TRAILS_TOTAL) reason = "Dutch Hill has room for eight trails, no more.";
  else if (state.trails.length >= MAX_SAVED_TRAILS) reason = "This winter has hit its trail-cutting limit.";

  const full = subdivide(path, draftWidths, spacing);
  if (!full) return rejectedPreview(DRAFT_TOO_LONG);
  const before = full.widths;
  const widths = overlays.reduce((last, stroke) => changeWidths(full.path, last, stroke, terrain), before);
  const problemSegments: number[] = [];
  let climbFloor = full.path[0] ? terrain.height(full.path[0].x, full.path[0].z) : 0;
  for (let i = 1; i < full.path.length; i++) {
    const a = full.path[i - 1];
    const b = full.path[i];
    const height = terrain.height(b.x, b.z);
    climbFloor = Math.min(climbFloor, height);
    let problem: string | null = null;
    if (!boundsContains(a, terrain) || !boundsContains(b, terrain)) problem = "Keep the trail inside the mountain.";
    else if ((!onLease(a, terrain) && !onExistingTrail(a, state)) || (!onLease(b, terrain) && !onExistingTrail(b, state))) {
      problem = OFF_LEASE_MESSAGE;
    }
    else if ((height - climbFloor) * terrain.feetPerUnit > 16.4) problem = "That trail climbs too far uphill. Skiers prefer going down.";
    else if (state.lifts.some((lift) => lift.confirmed
      && crossesLift(a, b, full.path[i + 1], lift.anchor, lift.bottom ?? terrain.base, terrain, baseRadius))) {
      problem = "That trail crosses a lift line. Reroute around it.";
    } else if (!widths[i - 1] || !widths[i]) problem = "Reconnect the trail before cutting.";
    if (problem) {
      problemSegments.push(i - 1);
      reason ??= problem;
    }
  }

  const summary = summarize(full.path, widths, terrain);
  if (summary.pitch > MAX_PAINTED_PITCH) {
    reason ??= "Too steep for the guests. Find a gentler line.";
    for (let i = 1; i < full.path.length; i++) {
      const a = full.path[i - 1];
      const b = full.path[i];
      const grade = (terrain.height(a.x, a.z) - terrain.height(b.x, b.z)) / distance(a, b);
      if (grade * realGradeFactor(terrain) > MAX_PAINTED_PITCH
        && !problemSegments.includes(i - 1)) problemSegments.push(i - 1);
    }
  }
  if (summary.verticalFt < 16.4) reason ??= "A trail has to drop at least 16.4 ft.";
  if (!bottom && !finish) reason ??= "End at the base or join a trail that leads there.";
  const links: TrailLinks = {};
  if (enterByTrail) links.start = { trailIndex: start.index, from: 0, to: start.fraction, at: start.at };
  if (finish) links.end = { trailIndex: finish.index, from: 1, to: finish.fraction, at: finish.at };
  if (connectCrossings && !reason) {
    const crossings = findCrossings(path, state, terrain);
    if (crossings.length) links.crossings = crossings;
  }
  return {
    ...summary,
    draftEnd: end ?? null,
    clearing: { path: full.path, widths },
    cost: full.path.length >= 2 ? roundTrailCost(150 + summary.acres * CLEARING_PER_ACRE) : 0,
    liftIndex,
    trailIndex: null,
    deleteTrail: false,
    reason,
    problemSegments,
    ...(links.start || links.end || links.crossings ? { links } : {}),
    walkBack: bottom ? walkBackFor(full.path, state.lifts[liftIndex]?.bottom ?? terrain.base, terrain) : null,
  };
}
