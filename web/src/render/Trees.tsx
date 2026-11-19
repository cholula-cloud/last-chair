"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { isClearedAt } from "@/game/clearing";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import {
  farForest,
  leaseForest,
  sameForestClearings,
  type ForestClearings,
  type LeaseCell,
  type TreeSpot,
} from "./forest";
import { SHADOW_LAYER_MASK } from "./kit";
import { outsideWeight, patchLeaseDim } from "./leaseDim";
import { PALETTE } from "./palette";

/**
 * Width and height of each pine variant, matching the three kit pines (a, b, c) at the
 * scale the old near forest used. One shared low-poly pine is stretched per variant.
 */
const PINE_SIZE = [
  [0.46, 0.75],
  [0.34, 0.86],
  [0.56, 0.82],
] as const;
const BIRCH_SCALE = 0.12;
/** A far tree is drawn this wide and tall (before its own scale), close to an average lease pine. */
const FAR_SIZE = [0.5, 0.8] as const;

type Tier = { y0: number; y1: number; r: number; base: string };

/** One cone with a green rim fading to snow at the tip: a vertex-coloured stand-in for a kit pine tier. */
function pushCone(pos: number[], col: number[], tier: Tier, sides: number, twist: number) {
  const base = new THREE.Color(tier.base);
  const tip = base.clone().lerp(new THREE.Color(PALETTE.snow), 0.62);
  for (let i = 0; i < sides; i++) {
    const a0 = twist + (i / sides) * Math.PI * 2;
    const a1 = twist + ((i + 1) / sides) * Math.PI * 2;
    pos.push(
      Math.cos(a0) * tier.r, tier.y0, Math.sin(a0) * tier.r,
      Math.cos(a1) * tier.r, tier.y0, Math.sin(a1) * tier.r,
      0, tier.y1, 0,
    );
    col.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
  }
}

function build(pos: number[], col: number[], normals?: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  if (normals) g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  else g.computeVertexNormals();
  return g;
}

/** Three stacked four-sided cones, 1 unit tall and 1 wide: 12 triangles. */
function leasePine(): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const tiers: Tier[] = [
    { y0: 0.04, y1: 0.42, r: 0.5, base: PALETTE.pineDeep },
    { y0: 0.3, y1: 0.7, r: 0.36, base: PALETTE.pine },
    { y0: 0.56, y1: 1, r: 0.22, base: PALETTE.pineCool },
  ];
  tiers.forEach((t, i) => pushCone(pos, col, t, 4, i * (Math.PI / 4)));
  return build(pos, col);
}

/** The birch of the old near forest with fewer sides: a pale trunk and two gold crowns. */
function leaseBirch(): THREE.BufferGeometry {
  const parts: { geo: THREE.BufferGeometry; color: string; pos: [number, number, number]; rot?: number }[] = [
    { geo: new THREE.CylinderGeometry(0.06, 0.09, 1.1, 4, 1, true), color: PALETTE.trimWhite, pos: [0, 0.55, 0] },
    { geo: new THREE.ConeGeometry(0.2, 0.35, 4, 1, true), color: PALETTE.birchCrown, pos: [0, 1.05, 0] },
    { geo: new THREE.ConeGeometry(0.14, 0.28, 4, 1, true), color: PALETTE.birchCrown, pos: [0.08, 1.28, 0], rot: 0.4 },
  ];
  const pos: number[] = [];
  const col: number[] = [];
  const nor: number[] = [];
  const m = new THREE.Matrix4();
  const v = new THREE.Vector3();
  for (const part of parts) {
    const g = part.geo.toNonIndexed();
    m.makeRotationY(part.rot ?? 0).setPosition(...part.pos);
    g.applyMatrix4(m);
    const c = new THREE.Color(part.color);
    const p = g.attributes.position;
    const n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      v.set(n.getX(i), n.getY(i), n.getZ(i)).transformDirection(m);
      nor.push(v.x, v.y, v.z);
      col.push(c.r, c.g, c.b);
    }
    g.dispose();
  }
  return build(pos, col, nor);
}

/** A three-sided cone that only casts a shadow. */
function shadowProxy(): THREE.BufferGeometry {
  return new THREE.ConeGeometry(0.3, 0.8, 3, 1, true).translate(0, 0.45, 0);
}

/**
 * A tree for the far tier: two crossed planes, each a stack of two tier triangles.
 * The material draws both sides, so the shape costs 4 triangles.
 */
function farTree(): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const nor: number[] = [];
  const tiers = [
    { y0: 0.04, y1: 0.62, hw: 0.5, base: PALETTE.pineDeep },
    { y0: 0.36, y1: 1, hw: 0.34, base: PALETTE.pine },
  ];
  for (const turn of [0, 1]) {
    for (const tier of tiers) {
      const base = new THREE.Color(tier.base);
      const tip = base.clone().lerp(new THREE.Color(PALETTE.snow), 0.62);
      // Plane 0 faces +z and plane 1 faces +x. Horizontal normals light both sides alike.
      const corner = (u: number, y: number) => (turn === 0 ? [u, y, 0] : [0, y, u]);
      pos.push(...corner(-tier.hw, tier.y0), ...corner(tier.hw, tier.y0), ...corner(0, tier.y1));
      col.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
      const n = turn === 0 ? [0, 0, 1] : [1, 0, 0];
      nor.push(...n, ...n, ...n);
    }
  }
  return build(pos, col, nor);
}

const dummy = new THREE.Object3D();
const tint = new THREE.Color();

function writeInstances(
  mesh: THREE.InstancedMesh,
  spots: readonly TreeSpot[],
  size: (spot: TreeSpot) => readonly [number, number],
  tinted: boolean,
) {
  for (let i = 0; i < spots.length; i++) {
    const p = spots[i];
    const [w, h] = size(p);
    dummy.position.set(p.x, TERRAIN.height(p.x, p.z) - 0.03, p.z);
    dummy.rotation.set(0, p.rot, 0);
    dummy.scale.set(w * p.s, h * p.s, w * p.s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (tinted) {
      tint.setRGB(p.tint, p.tint * 0.98, p.tint * 0.96);
      mesh.setColorAt(i, tint);
    }
  }
  mesh.count = spots.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  // Culling needs a sphere that matches the instances; a stale or missing one hides trees.
  mesh.computeBoundingSphere();
}

type Shared = {
  pine: THREE.BufferGeometry;
  birch: THREE.BufferGeometry;
  proxy: THREE.BufferGeometry;
};

/** Instances for one set of spots, built once per change: no per-frame work. */
function Instances({
  geo,
  spots,
  size,
  shadowOnly = false,
}: {
  geo: THREE.BufferGeometry;
  spots: readonly TreeSpot[];
  size: (spot: TreeSpot) => readonly [number, number];
  shadowOnly?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh | null>(null);
  useLayoutEffect(() => {
    if (ref.current) writeInstances(ref.current, spots, size, !shadowOnly);
  }, [spots, size, shadowOnly]);
  if (!spots.length) return null;
  if (shadowOnly) {
    return (
      <instancedMesh ref={ref} args={[geo, undefined, spots.length]} castShadow layers={SHADOW_LAYER_MASK}>
        <meshBasicMaterial colorWrite={false} />
      </instancedMesh>
    );
  }
  return (
    <instancedMesh ref={ref} args={[geo, undefined, spots.length]} receiveShadow>
      <meshLambertMaterial vertexColors />
    </instancedMesh>
  );
}

const pineSize = (p: TreeSpot) => PINE_SIZE[p.variant];
const birchSize = () => [BIRCH_SCALE, BIRCH_SCALE] as const;
const proxySize = () => [1, 1] as const;
const farSize = () => FAR_SIZE;

function LeaseCellTrees({ cell, shared }: { cell: LeaseCell; shared: Shared }) {
  const all = useMemo(() => [...cell.pines, ...cell.birch], [cell]);
  return (
    <group>
      <Instances geo={shared.pine} spots={cell.pines} size={pineSize} />
      <Instances geo={shared.birch} spots={cell.birch} size={birchSize} />
      <Instances geo={shared.proxy} spots={all} size={proxySize} shadowOnly />
    </group>
  );
}

/** The far tier: every tree in one instanced mesh, one draw call. */
function FarTrees({ geo }: { geo: THREE.BufferGeometry }) {
  const spots = useMemo(() => farForest(), []);
  const far = useMemo(() => {
    const g = geo.clone();
    const weights = new Float32Array(spots.length);
    spots.forEach((p, i) => { weights[i] = outsideWeight(p); });
    g.setAttribute("aOut", new THREE.InstancedBufferAttribute(weights, 1));
    return g;
  }, [geo, spots]);
  const material = useMemo(() => patchLeaseDim(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })), []);
  useEffect(() => () => { far.dispose(); material.dispose(); }, [far, material]);
  const ref = useRef<THREE.InstancedMesh | null>(null);
  useLayoutEffect(() => {
    if (ref.current) writeInstances(ref.current, spots, farSize, true);
  }, [spots]);
  return (
    <instancedMesh ref={ref} args={[far, material, spots.length]} />
  );
}

/**
 * The forest, fixed in world space. Trees on the lease stand at full density in cells
 * that are culled separately; a sparse far tier of crossed planes fills the rest of the
 * map in one draw call. Only a change to lifts, trails or cleared cells rebuilds the lease.
 */
export const Trees = memo(function Trees({ lines, paths }: ForestClearings) {
  const shared = useMemo<Shared>(
    () => ({ pine: leasePine(), birch: leaseBirch(), proxy: shadowProxy() }),
    [],
  );
  const far = useMemo(() => farTree(), []);
  useEffect(() => () => {
    shared.pine.dispose();
    shared.birch.dispose();
    shared.proxy.dispose();
    far.dispose();
  }, [shared, far]);

  const clearedCells = useGameStore((s) => s.clearedCells);
  const cells = useMemo(() => leaseForest({ lines, paths }), [lines, paths]);
  // A confirmed cut changes the hill at once, so it filters here rather than waiting for a rebuild.
  const visible = useMemo(() => {
    if (!clearedCells.length) return cells;
    const cut = new Set(clearedCells);
    const keep = (spot: TreeSpot) => !isClearedAt(spot, cut);
    return cells.map((cell) => ({ ...cell, pines: cell.pines.filter(keep), birch: cell.birch.filter(keep) }));
  }, [cells, clearedCells]);

  return (
    <group>
      {visible.map((cell) => <LeaseCellTrees key={cell.key} cell={cell} shared={shared} />)}
      <FarTrees geo={far} />
    </group>
  );
}, sameForestClearings);
