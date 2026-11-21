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

/** World width and height per pine variant (kit silhouettes a–d), bumped ~18% from the old stretched cone. */
const PINE_SIZE: readonly (readonly [number, number])[] = [
  [0.54, 0.88],
  [0.4, 1.02],
  [0.66, 0.96],
  [0.62, 0.74],
];
/** Far billboards: slightly wider so they do not read skinny vs lease pines, still one draw call. */
const FAR_SIZE = [0.56, 0.88] as const;
const PINE_SIDES = 6;
const PINE_VARIANTS = 4 as const;

type Tier = { y0: number; y1: number; r: number; base: string };

/** One cone with dense green at the base and a slightly lighter green at the tip. */
function pushCone(pos: number[], col: number[], tier: Tier, sides: number, twist: number) {
  const base = new THREE.Color(tier.base);
  const tip = base.clone().lerp(new THREE.Color(PALETTE.pineTip), 0.55).lerp(new THREE.Color(PALETTE.snow), 0.12);
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

function pushTrunk(pos: number[], col: number[], height: number, rBot = 0.052, rTop = 0.036) {
  const g = new THREE.CylinderGeometry(rTop, rBot, height, 5, 1, true).translate(0, height / 2, 0).toNonIndexed();
  const bark = new THREE.Color(PALETTE.bark);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    pos.push(p.getX(i), p.getY(i), p.getZ(i));
    col.push(bark.r, bark.g, bark.b);
  }
  g.dispose();
}

function build(pos: number[], col: number[], normals?: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  if (normals) g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  else g.computeVertexNormals();
  return g;
}

function leasePineBody(tiers: Tier[], trunkH: number, twistStep = Math.PI / PINE_SIDES): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  pushTrunk(pos, col, trunkH);
  tiers.forEach((t, i) => pushCone(pos, col, t, PINE_SIDES, i * twistStep));
  return build(pos, col);
}

/** pine-a: three medium tiers (kit default). */
function pineA(): THREE.BufferGeometry {
  return leasePineBody([
    { y0: 0.12, y1: 0.48, r: 0.52, base: PALETTE.pineDeep },
    { y0: 0.36, y1: 0.72, r: 0.38, base: PALETTE.pine },
    { y0: 0.56, y1: 1, r: 0.24, base: PALETTE.pineCool },
  ], 0.14);
}

/** pine-b: tall and slim, four tiers. */
function pineB(): THREE.BufferGeometry {
  const slim = 0.86;
  return leasePineBody([
    { y0: 0.1, y1: 0.4, r: 0.48 * slim, base: PALETTE.pineDeep },
    { y0: 0.3, y1: 0.58, r: 0.4 * slim, base: PALETTE.pine },
    { y0: 0.48, y1: 0.78, r: 0.3 * slim, base: PALETTE.pineCool },
    { y0: 0.66, y1: 1, r: 0.2 * slim, base: PALETTE.pine },
  ], 0.16);
}

/** pine-c: wide crown (kit pine-c). */
function pineC(): THREE.BufferGeometry {
  return leasePineBody([
    { y0: 0.12, y1: 0.46, r: 0.58, base: PALETTE.pineDeep },
    { y0: 0.34, y1: 0.72, r: 0.44, base: PALETTE.pine },
    { y0: 0.54, y1: 1, r: 0.28, base: PALETTE.pineCool },
  ], 0.14);
}

/** pine-d: stocky understory, two wide tiers. */
function pineD(): THREE.BufferGeometry {
  return leasePineBody([
    { y0: 0.14, y1: 0.56, r: 0.58, base: PALETTE.pineDeep },
    { y0: 0.4, y1: 0.9, r: 0.42, base: PALETTE.pine },
  ], 0.1);
}

/** Low graphics: one four-sided cone, all variants share it. */
function leasePineLow(): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  pushCone(pos, col, { y0: 0.04, y1: 1, r: 0.52, base: PALETTE.pineDeep }, 4, 0);
  return build(pos, col);
}

function buildLeasePines(lowDetail: boolean): readonly [THREE.BufferGeometry, THREE.BufferGeometry, THREE.BufferGeometry, THREE.BufferGeometry] {
  if (lowDetail) {
    const g = leasePineLow();
    return [g, g, g, g];
  }
  return [pineA(), pineB(), pineC(), pineD()];
}

/** Cone that only casts a shadow; sized to match wider crowns. */
function shadowProxy(): THREE.BufferGeometry {
  return new THREE.ConeGeometry(0.38, 0.92, 4, 1, true).translate(0, 0.5, 0);
}

/**
 * Far tier: crossed planes (~4 tris). Slightly wider than before so the ring matches lease scale
 * without adding geometry or draw calls.
 */
function farTree(): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const nor: number[] = [];
  const tiers = [
    { y0: 0.04, y1: 0.62, hw: 0.54, base: PALETTE.pineDeep },
    { y0: 0.36, y1: 1, hw: 0.38, base: PALETTE.pine },
  ];
  for (const turn of [0, 1]) {
    for (const tier of tiers) {
      const base = new THREE.Color(tier.base);
      const tip = base.clone().lerp(new THREE.Color(PALETTE.pineTip), 0.55).lerp(new THREE.Color(PALETTE.snow), 0.12);
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
  mesh.computeBoundingSphere();
}

type Shared = {
  pines: readonly [THREE.BufferGeometry, THREE.BufferGeometry, THREE.BufferGeometry, THREE.BufferGeometry];
  proxy: THREE.BufferGeometry;
};

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

const pineSize = (p: TreeSpot) => PINE_SIZE[p.variant] ?? PINE_SIZE[0];
const proxySize = () => [1, 1] as const;
const farSize = () => FAR_SIZE;

function LeaseCellTrees({ cell, shared }: { cell: LeaseCell; shared: Shared }) {
  const byVariant = useMemo(() => {
    const buckets: TreeSpot[][] = [[], [], [], []];
    for (const p of cell.pines) buckets[p.variant].push(p);
    return buckets;
  }, [cell.pines]);
  return (
    <group>
      {Array.from({ length: PINE_VARIANTS }, (_, v) => (
        <Instances key={v} geo={shared.pines[v]} spots={byVariant[v]} size={pineSize} />
      ))}
      <Instances geo={shared.proxy} spots={cell.pines} size={proxySize} shadowOnly />
    </group>
  );
}

/** The far tier: every tree in one instanced mesh, one draw call. */
function FarTrees({ geo, spots }: { geo: THREE.BufferGeometry; spots: readonly TreeSpot[] }) {
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

export const Trees = memo(function Trees({ lines, paths, lowDetail }: ForestClearings & { lowDetail: boolean }) {
  const shared = useMemo<Shared>(() => {
    const pines = buildLeasePines(lowDetail);
    return { pines, proxy: shadowProxy() };
  }, [lowDetail]);
  const far = useMemo(() => farTree(), []);
  useEffect(() => () => {
    const seen = new Set<THREE.BufferGeometry>();
    for (const g of shared.pines) {
      if (!seen.has(g)) {
        seen.add(g);
        g.dispose();
      }
    }
    shared.proxy.dispose();
  }, [shared]);
  useEffect(() => () => far.dispose(), [far]);

  const clearedCells = useGameStore((s) => s.clearedCells);
  const cells = useMemo(() => leaseForest({ lines, paths }), [lines, paths]);
  const visible = useMemo(() => {
    if (!clearedCells.length) return cells;
    const cut = new Set(clearedCells);
    const keep = (spot: TreeSpot) => !isClearedAt(spot, cut);
    return cells.map((cell) => ({ ...cell, pines: cell.pines.filter(keep) }));
  }, [cells, clearedCells]);

  const farSpots = useMemo(() => {
    const spots = farForest({ lines, paths });
    if (!clearedCells.length) return spots;
    const cut = new Set(clearedCells);
    return spots.filter((spot) => !isClearedAt(spot, cut));
  }, [lines, paths, clearedCells]);

  return (
    <group>
      {visible.map((cell) => <LeaseCellTrees key={cell.key} cell={cell} shared={shared} />)}
      <FarTrees geo={far} spots={farSpots} />
    </group>
  );
}, (prev, next) => prev.lowDetail === next.lowDetail && sameForestClearings(prev, next));