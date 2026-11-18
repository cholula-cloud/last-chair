/** Camera framing: where to put an orbit camera so key points stay on screen. */

import { REFERENCE_TOPS } from "@/game/descent";
import { TERRAIN } from "@/game/terrain";
import { DUTCH_HILL } from "@/game/mountains/dutchHill";
import { lotFarCorner } from "@/game/site";
import { HOUSES, LIFT_TERMINAL_H, LODGE, SHOP_POS, SITE } from "./layout";
import { trailPoint } from "./trail";

export type Vec3 = { x: number; y: number; z: number };

/** Rectangle in normalised device coordinates (x right, y up, both -1 to 1). */
export type SafeRect = { xMin: number; xMax: number; yMin: number; yMax: number };

export type FrameInput = {
  points: readonly Vec3[];
  /** Viewport width over height. */
  aspect: number;
  /** Vertical field of view in degrees. */
  fov: number;
  /** Camera yaw around the target (0 looks down -z from +z). */
  azimuth: number;
  /** Camera pitch above the horizon. */
  elevation: number;
  safe: SafeRect;
};

export type FrameResult = { target: Vec3; distance: number };

const MAX_DISTANCE = 800;

/** Unit vector from the target toward the camera, plus the camera's right and up. */
export function cameraBasis(azimuth: number, elevation: number) {
  const d = {
    x: Math.sin(azimuth) * Math.cos(elevation),
    y: Math.sin(elevation),
    z: Math.cos(azimuth) * Math.cos(elevation),
  };
  // right = up × d, up = d × right (three.js lookAt with world up +y).
  const rl = Math.hypot(d.z, d.x);
  const r = { x: d.z / rl, y: 0, z: -d.x / rl };
  const u = {
    x: d.y * r.z - d.z * r.y,
    y: d.z * r.x - d.x * r.z,
    z: d.x * r.y - d.y * r.x,
  };
  return { d, r, u };
}

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;

/**
 * The target and distance at which every point projects inside `safe`: the
 * nearest camera along the view direction whose frustum can be shifted to fit.
 */
export function frameView(input: FrameInput): FrameResult {
  const { points, aspect, fov, azimuth, elevation, safe } = input;
  if (points.length === 0) return { target: { x: 0, y: 0, z: 0 }, distance: 10 };
  const { d, r, u } = cameraBasis(azimuth, elevation);
  const tanV = Math.tan((fov * Math.PI) / 360);
  const tanH = tanV * aspect;

  const c = { x: 0, y: 0, z: 0 };
  for (const p of points) {
    c.x += p.x / points.length;
    c.y += p.y / points.length;
    c.z += p.z / points.length;
  }
  const rel = points.map((p) => {
    const q = { x: p.x - c.x, y: p.y - c.y, z: p.z - c.z };
    return { px: dot(q, r), py: dot(q, u), e: dot(q, d) };
  });

  // Offsets a (right) and b (up) of the target from the centroid. A point is
  // inside when safe.min <= (p - a) / ((D - e) * tan) <= safe.max.
  const solve = (D: number) => {
    let aLo = -Infinity;
    let aHi = Infinity;
    let bLo = -Infinity;
    let bHi = Infinity;
    for (const p of rel) {
      const depth = D - p.e;
      aLo = Math.max(aLo, p.px - safe.xMax * tanH * depth);
      aHi = Math.min(aHi, p.px - safe.xMin * tanH * depth);
      bLo = Math.max(bLo, p.py - safe.yMax * tanV * depth);
      bHi = Math.min(bHi, p.py - safe.yMin * tanV * depth);
    }
    return { ok: aLo <= aHi && bLo <= bHi, a: (aLo + aHi) / 2, b: (bLo + bHi) / 2 };
  };

  let lo = Math.max(...rel.map((p) => p.e)) + 0.05;
  let hi = MAX_DISTANCE;
  if (!solve(hi).ok) {
    const s = solve(hi);
    return {
      target: { x: c.x + r.x * s.a + u.x * s.b, y: c.y + r.y * s.a + u.y * s.b, z: c.z + r.z * s.a + u.z * s.b },
      distance: hi,
    };
  }
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (solve(mid).ok) hi = mid;
    else lo = mid;
  }
  const s = solve(hi);
  return {
    target: { x: c.x + r.x * s.a + u.x * s.b, y: c.y + r.y * s.a + u.y * s.b, z: c.z + r.z * s.a + u.z * s.b },
    distance: hi,
  };
}

/**
 * Points the home view must keep on screen: base, each lift top, the lodge and
 * each trail's middle, plus context so the hill still reads as a hill: the
 * summit, the east end of the village and the houses across the road.
 */
export function keyPoints(): Vec3[] {
  const onTerrain = (x: number, z: number, lift: number): Vec3 => ({
    x,
    y: TERRAIN.height(x, z) + lift,
    z,
  });
  const lot = lotFarCorner(SITE);
  const pts: Vec3[] = [
    onTerrain(TERRAIN.base.x, TERRAIN.base.z, LIFT_TERMINAL_H),
    onTerrain(lot.x, lot.z, 0),
    onTerrain(SITE.arrival.center.x, SITE.arrival.center.z, 0),
    onTerrain(LODGE.x, LODGE.z, 0),
    onTerrain(LODGE.x, LODGE.z, 0.9),
    onTerrain(TERRAIN.toWorld(DUTCH_HILL.summit).x, TERRAIN.toWorld(DUTCH_HILL.summit).z, 0),
    onTerrain(SHOP_POS.x, SHOP_POS.z, 0.5),
    ...HOUSES.map((h) => onTerrain(h.x, h.z, 0.5)),
  ];
  for (const slot of REFERENCE_TOPS) {
    pts.push(onTerrain(slot.x, slot.z, LIFT_TERMINAL_H));
    pts.push(trailPoint(0.5, { bottom: TERRAIN.base, top: slot }));
  }
  return pts;
}

/** Phones held upright get a taller, steeper view; everything else keeps the 3/4 view. */
export const PORTRAIT_ASPECT = 0.9;

const PORTRAIT = {
  fov: 50,
  azimuth: -0.15,
  elevation: 0.62,
  // Clear of the top HUD strip and the bottom action bar.
  safe: { xMin: -0.9, xMax: 0.9, yMin: -0.55, yMax: 0.72 },
} as const;

const LANDSCAPE = {
  fov: 38,
  azimuth: -0.42,
  elevation: 0.44,
  safe: { xMin: -0.9, xMax: 0.9, yMin: -0.62, yMax: 0.78 },
} as const;

/**
 * The aspect the home view is framed for: the real aspect rounded down to the
 * nearest 0.05. A narrower aspect needs a larger distance, so the real, wider
 * viewport always shows at least what was framed, and any aspect in the same
 * 0.05 bucket (a collapsing mobile toolbar) maps to the same view.
 */
export function framingAspect(aspect: number) {
  return Math.floor(aspect * 20) / 20;
}

/** True when the home view for this aspect uses the portrait parameters. */
export function isPortraitAspect(aspect: number) {
  return framingAspect(aspect) < PORTRAIT_ASPECT;
}

/** The home view's azimuth for this aspect (cheap: no framing solve). */
export function homeAzimuth(aspect: number) {
  return framingAspect(aspect) < PORTRAIT_ASPECT ? PORTRAIT.azimuth : LANDSCAPE.azimuth;
}

export function homeView(aspect: number) {
  const framedAspect = framingAspect(aspect);
  const params = framedAspect < PORTRAIT_ASPECT ? PORTRAIT : LANDSCAPE;
  const framed = frameView({ points: keyPoints(), aspect: framedAspect, ...params });
  return { ...params, ...framed, aspect: framedAspect };
}

/** Camera position for a target, distance and view angles. */
export function cameraPosition(
  target: Vec3,
  distance: number,
  azimuth: number,
  elevation: number,
): Vec3 {
  const { d } = cameraBasis(azimuth, elevation);
  return { x: target.x + d.x * distance, y: target.y + d.y * distance, z: target.z + d.z * distance };
}
