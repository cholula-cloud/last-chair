import { describe, expect, it } from "vitest";
import {
  cameraBasis,
  cameraPosition,
  frameView,
  homeView,
  keyPoints,
  type SafeRect,
  type Vec3,
} from "./cameraFraming";

const MAX_DISTANCE = 34; // OrbitControls maxDistance in MountainScene

/** Independent perspective projection: lookAt from the camera position to the target. */
function project(p: Vec3, cam: Vec3, target: Vec3, fovDeg: number, aspect: number) {
  const f = { x: target.x - cam.x, y: target.y - cam.y, z: target.z - cam.z };
  const fl = Math.hypot(f.x, f.y, f.z);
  f.x /= fl;
  f.y /= fl;
  f.z /= fl;
  // right = f × up(0,1,0)
  const rl = Math.hypot(f.z, f.x);
  const r = { x: -f.z / rl, y: 0, z: f.x / rl };
  const u = {
    x: r.y * f.z - r.z * f.y,
    y: r.z * f.x - r.x * f.z,
    z: r.x * f.y - r.y * f.x,
  };
  const v = { x: p.x - cam.x, y: p.y - cam.y, z: p.z - cam.z };
  const depth = v.x * f.x + v.y * f.y + v.z * f.z;
  const tanV = Math.tan((fovDeg * Math.PI) / 360);
  return {
    x: (v.x * r.x + v.y * r.y + v.z * r.z) / (depth * tanV * aspect),
    y: (v.x * u.x + v.y * u.y + v.z * u.z) / (depth * tanV),
    depth,
  };
}

function expectInside(view: ReturnType<typeof homeView>, aspect: number) {
  const cam = cameraPosition(view.target, view.distance, view.azimuth, view.elevation);
  const eps = 1e-6;
  for (const [i, p] of keyPoints().entries()) {
    const n = project(p, cam, view.target, view.fov, aspect);
    const where = `aspect ${aspect.toFixed(2)} point ${i}`;
    expect(n.depth, where).toBeGreaterThan(0);
    expect(n.x, where).toBeGreaterThanOrEqual(view.safe.xMin - eps);
    expect(n.x, where).toBeLessThanOrEqual(view.safe.xMax + eps);
    expect(n.y, where).toBeGreaterThanOrEqual(view.safe.yMin - eps);
    expect(n.y, where).toBeLessThanOrEqual(view.safe.yMax + eps);
  }
}

describe("frameView", () => {
  it("is orthonormal: right, up and the camera direction are perpendicular unit vectors", () => {
    const { d, r, u } = cameraBasis(-0.3, 0.5);
    const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
    expect(dot(d, d)).toBeCloseTo(1, 12);
    expect(dot(r, r)).toBeCloseTo(1, 12);
    expect(dot(u, u)).toBeCloseTo(1, 12);
    expect(dot(d, r)).toBeCloseTo(0, 12);
    expect(dot(d, u)).toBeCloseTo(0, 12);
    expect(dot(r, u)).toBeCloseTo(0, 12);
    expect(u.y).toBeGreaterThan(0);
  });

  it("fits arbitrary points in a safe rect, and tightly: the nearest camera touches an edge", () => {
    const points: Vec3[] = [
      { x: -3, y: 0, z: 2 },
      { x: 4, y: 3, z: -2 },
      { x: 0, y: 1, z: 5 },
    ];
    const safe: SafeRect = { xMin: -0.8, xMax: 0.8, yMin: -0.5, yMax: 0.7 };
    const input = { points, aspect: 0.6, fov: 45, azimuth: -0.2, elevation: 0.5, safe };
    const f = frameView(input);
    const cam = cameraPosition(f.target, f.distance, input.azimuth, input.elevation);
    let touching = 0;
    for (const p of points) {
      const n = project(p, cam, f.target, input.fov, input.aspect);
      expect(Math.abs(n.x)).toBeLessThanOrEqual(0.8 + 1e-6);
      expect(n.y).toBeGreaterThanOrEqual(-0.5 - 1e-6);
      expect(n.y).toBeLessThanOrEqual(0.7 + 1e-6);
      if (
        Math.abs(Math.abs(n.x) - 0.8) < 1e-4 ||
        Math.abs(n.y + 0.5) < 1e-4 ||
        Math.abs(n.y - 0.7) < 1e-4
      ) {
        touching++;
      }
    }
    expect(touching).toBeGreaterThan(0);
  });
});

describe("home view", () => {
  for (const [name, w, h] of [
    ["iPhone portrait", 390, 844],
    ["phone landscape", 844, 390],
    ["tablet landscape", 1180, 820],
  ] as const) {
    it(`keeps base, lift tops, lodge and trails in the safe rect: ${name}`, () => {
      expectInside(homeView(w / h), w / h);
    });
  }

  it("fits portrait within the orbit camera's maximum distance", () => {
    expect(homeView(390 / 844).distance).toBeLessThanOrEqual(MAX_DISTANCE);
  });
});
