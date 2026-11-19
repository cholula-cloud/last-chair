import { rulesFor } from "./descent";
import { OFF_LEASE_MESSAGE, onLease } from "./lease";
import type { GameState } from "./state";
import { TERRAIN, type Terrain, type XZ } from "./terrain";
import {
  classifyPitch,
  MAX_TRAILS_PER_LIFT,
  MAX_TRAILS_TOTAL,
  pathLengthFt,
  realGradeFactor,
  roundTrailCost,
  trailsOnLift,
  type Difficulty,
  type TrailRun,
} from "./trails";

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
const DRAFT_TOO_LONG = "This draft is too long. Undo a stroke or paint a shorter run.";
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
  /** Brush footprint, excluding any inherited links of a new run. */
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
};

type PaintState = Pick<GameState, "lifts" | "trails">;

const distance = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z);

function along(a: XZ, b: XZ, t: number): XZ {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

function project(p: XZ, a: XZ, b: XZ) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2)) : 0;
  const at = along(a, b, t);
  return { at, distance: distance(p, at) };
}

export function simplifyStroke(points: readonly XZ[], tolerance: number): XZ[] {
  if (points.length <= 2) return [...points];
  const keep = new Set([0, points.length - 1]);
  const pending: [number, number][] = [[0, points.length - 1]];
  while (pending.length) {
    const [a, b] = pending.pop()!;
    let farthest = tolerance;
    let split = a;
    for (let i = a + 1; i < b; i++) {
      const d = project(points[i], points[a], points[b]).distance;
      if (d > farthest) {
        farthest = d;
        split = i;
      }
    }
    if (split !== a) {
      keep.add(split);
      pending.push([a, split], [split, b]);
    }
  }
  return points.filter((_, i) => keep.has(i));
}

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

function trailHit(p: XZ, state: PaintState, radius: number) {
  let best: { index: number; segment: number; at: XZ; distance: number } | null = null;
  for (const [index, trail] of state.trails.entries()) {
    if (!trail.open || !state.lifts[trail.liftIndex]?.confirmed) continue;
    for (let i = 1; i < trail.path.length; i++) {
      const hit = project(p, trail.path[i - 1], trail.path[i]);
      if (hit.distance <= radius && (!best || hit.distance < best.distance)) {
        best = { index, segment: i - 1, at: hit.at, distance: hit.distance };
      }
    }
  }
  return best;
}

function withinPath(p: XZ, points: readonly XZ[], radius: number): boolean {
  if (points.length === 1) return distance(p, points[0]) <= radius;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (p.x < Math.min(a.x, b.x) - radius || p.x > Math.max(a.x, b.x) + radius ||
      p.z < Math.min(a.z, b.z) - radius || p.z > Math.max(a.z, b.z) + radius) continue;
    if (project(p, a, b).distance <= radius) return true;
  }
  return false;
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
  } else if (deleteTrail && trailsOnLift(state.trails, trail.liftIndex).length === 1) {
    reason = "This lift needs an open trail.";
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
    problemSegments: path.flatMap((_, i) => i + 1 < widths.length && (!widths[i] || !widths[i + 1]) ? [i] : []),
  };
}

/** Geometry and budget estimate shared by the brush preview and the commit rule. */
export function previewPaintedTrail(
  state: PaintState,
  strokes: readonly PaintStroke[],
  terrain: Terrain = TERRAIN,
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
  const start = firstPoint && trailHit(firstPoint, state, H / 6);
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

  const enterByTrail = start && (nearestLift < 0 || start.distance < nearestDistance);
  const liftIndex = enterByTrail ? state.trails[start.index].liftIndex : nearestLift;
  const end = path.at(-1);
  const atBase = !disconnected && !!end && distance(end, terrain.base) <= baseRadius;
  const finish = !disconnected && !atBase && end && trailHit(end, state, H / 6);
  if (path.length && liftIndex >= 0) path[0] = enterByTrail ? start.at : state.lifts[liftIndex].anchor;
  if (path.length > 1 && finish) path[path.length - 1] = finish.at;
  if (path.length > 1 && atBase && end && distance(end, terrain.base) > 1e-8) {
    path.push(terrain.base);
    draftWidths.push(draftWidths.at(-1)!);
  }

  let reason: string | null = null;
  if (!first || path.length < 2) reason = "Paint a trail down the hill.";
  else if (first.erase) reason = "Start over an existing trail to erase it.";
  else if (liftIndex < 0) reason = "Start at a lift top or an open trail.";
  else if (disconnected) reason = DISCONNECTED_STROKE;
  else if (trailsOnLift(state.trails, liftIndex).length >= MAX_TRAILS_PER_LIFT) reason = "This lift has room for three trails.";
  else if (state.trails.filter((trail) => trail.open).length >= MAX_TRAILS_TOTAL) reason = "The hill has room for eight trails.";
  else if (state.trails.length >= MAX_SAVED_TRAILS) reason = "This winter has reached its trail construction limit.";

  // Keep only the connectors needed to give the new run a complete skiing path.
  const prefix = enterByTrail ? state.trails[start.index].path.slice(0, start.segment + 1) : [];
  const suffix = finish ? state.trails[finish.index].path.slice(finish.segment + 1) : [];
  const prefixWidths = enterByTrail ? prefix.map((_, i) => trailWidth(state.trails[start.index], i)) : [];
  const suffixWidths = finish ? suffix.map((_, i) => trailWidth(state.trails[finish.index], finish.segment + 1 + i)) : [];
  const full = subdivide([...prefix, ...path, ...suffix], [
    ...prefixWidths,
    ...draftWidths,
    ...suffixWidths,
  ], spacing);
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
    else if ((height - climbFloor) * terrain.feetPerUnit > 16.4) problem = "The trail climbs too far uphill.";
    else if (state.lifts.some((lift) => lift.confirmed
      && crossesLift(a, b, full.path[i + 1], lift.anchor, lift.bottom ?? terrain.base, terrain, baseRadius))) {
      problem = "The trail crosses a lift line.";
    } else if (!widths[i - 1] || !widths[i]) problem = "Reconnect the trail before cutting.";
    if (problem) {
      problemSegments.push(i - 1);
      reason ??= problem;
    }
  }

  const summary = summarize(full.path, widths, terrain);
  if (summary.pitch > MAX_PAINTED_PITCH) {
    reason ??= "That pitch is too steep for the guests.";
    for (let i = 1; i < full.path.length; i++) {
      const a = full.path[i - 1];
      const b = full.path[i];
      const grade = (terrain.height(a.x, a.z) - terrain.height(b.x, b.z)) / distance(a, b);
      if (grade * realGradeFactor(terrain) > MAX_PAINTED_PITCH
        && !problemSegments.includes(i - 1)) problemSegments.push(i - 1);
    }
  }
  if (summary.verticalFt < 16.4) reason ??= "The trail needs more downhill.";
  const painted = subdivide(path, draftWidths, spacing);
  if (!painted) return rejectedPreview(DRAFT_TOO_LONG);
  const paintedWidths = overlays.reduce((last, stroke) => changeWidths(painted.path, last, stroke, terrain), painted.widths);
  const acres = acresFor(painted.path, paintedWidths, terrain);
  return {
    ...summary,
    draftEnd: end ?? null,
    clearing: { path: painted.path, widths: paintedWidths },
    cost: painted.path.length >= 2 ? roundTrailCost(150 + acres * CLEARING_PER_ACRE) : 0,
    liftIndex,
    trailIndex: null,
    deleteTrail: false,
    reason,
    problemSegments,
  };
}
