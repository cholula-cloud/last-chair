import type { XZ } from "./terrain";

export const distance = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z);

export function along(a: XZ, b: XZ, t: number): XZ {
  if (t === 0) return a;
  if (t === 1) return b;
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

export function project(p: XZ, a: XZ, b: XZ) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2)) : 0;
  const at = along(a, b, t);
  return { at, distance: distance(p, at), t };
}

export function arcLengths(path: readonly XZ[]): number[] {
  const lengths = [0];
  for (let i = 1; i < path.length; i++) lengths.push(lengths[i - 1] + distance(path[i - 1], path[i]));
  return lengths;
}

export function fractionAt(lengths: number[], segment: number, t: number) {
  return (lengths[segment] + (lengths[segment + 1] - lengths[segment]) * t) / (lengths.at(-1) || 1);
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

export function withinPath(p: XZ, points: readonly XZ[], radius: number): boolean {
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