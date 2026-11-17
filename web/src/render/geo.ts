import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Small kit for building merged, vertex-coloured low-poly props: each part is
 * a primitive with a colour and transform; `merge` bakes them into one
 * geometry so a whole building or tree costs one draw call.
 */
export type Part = {
  geo: THREE.BufferGeometry;
  color: THREE.ColorRepresentation;
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number];
};

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();

function bake(part: Part): THREE.BufferGeometry {
  const g = part.geo.index ? part.geo.toNonIndexed() : part.geo.clone();
  g.deleteAttribute("uv");
  tmpE.set(...(part.rot ?? [0, 0, 0]));
  tmpQ.setFromEuler(tmpE);
  tmpP.set(...(part.pos ?? [0, 0, 0]));
  tmpS.set(...(part.scale ?? [1, 1, 1]));
  tmpM.compose(tmpP, tmpQ, tmpS);
  g.applyMatrix4(tmpM);
  const c = new THREE.Color(part.color);
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

export function merge(parts: Part[]): THREE.BufferGeometry {
  const baked = parts.map(bake);
  const out = mergeGeometries(baked, false) ?? new THREE.BufferGeometry();
  baked.forEach((b) => b.dispose());
  parts.forEach((p) => p.geo.dispose());
  return out;
}

const UP = new THREE.Vector3(0, 1, 0);

/** Move a list of parts to a world position and rotate it by `yaw` around +Y. */
export function placeParts(parts: Part[], x: number, y: number, z: number, yaw = 0): Part[] {
  const qy = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  return parts.map((p) => {
    const v = new THREE.Vector3(...(p.pos ?? [0, 0, 0])).applyQuaternion(qy);
    const q = qy
      .clone()
      .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...(p.rot ?? [0, 0, 0]))));
    const e = new THREE.Euler().setFromQuaternion(q);
    return { ...p, pos: [v.x + x, v.y + y, v.z + z], rot: [e.x, e.y, e.z] };
  });
}

export const box = (w: number, h: number, d: number) =>
  new THREE.BoxGeometry(w, h, d);
export const cyl = (rt: number, rb: number, h: number, seg = 8) =>
  new THREE.CylinderGeometry(rt, rb, h, seg);
export const cone = (r: number, h: number, seg = 8) =>
  new THREE.ConeGeometry(r, h, seg);
export const sphere = (r: number, w = 8, h = 6) =>
  new THREE.SphereGeometry(r, w, h);

/** Triangular prism for gable ends: base width w, height h, depth d (along Z). */
export function gable(w: number, h: number, d: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

/**
 * Pitched roof slab pair with overhang. Ridge runs along X; returns parts for
 * the roof boards and a thick snow cap on each side.
 */
export function pitchedRoof(opts: {
  width: number; // across the ridge (Z)
  length: number; // along the ridge (X)
  rise: number;
  y: number;
  roof: THREE.ColorRepresentation;
  snow?: THREE.ColorRepresentation;
}): Part[] {
  const half = opts.width / 2 + 0.1;
  const slope = Math.hypot(half, opts.rise);
  const ang = Math.atan2(opts.rise, half);
  const parts: Part[] = [];
  for (const side of [-1, 1]) {
    const cz = (side * half) / 2;
    const cy = opts.y + opts.rise / 2;
    parts.push({
      geo: box(opts.length + 0.16, 0.05, slope + 0.04),
      color: opts.roof,
      pos: [0, cy, cz],
      rot: [side * ang, 0, 0],
    });
    if (opts.snow) {
      const nx = 0;
      const ny = Math.cos(ang) * 0.06;
      const nz = side * Math.sin(ang) * 0.06;
      parts.push({
        geo: box(opts.length + 0.1, 0.09, slope - 0.02),
        color: opts.snow,
        pos: [nx, cy + ny, cz + nz],
        rot: [side * ang, 0, 0],
      });
    }
  }
  return parts;
}
