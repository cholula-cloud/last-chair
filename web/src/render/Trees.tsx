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
import {
  farTreeImpostor,
  leaseBirchLow,
  leasePineLow,
  shadowProxyLow,
} from "./treeFallback";
import {
  farTreeWorldSize,
  PINE_VARIANTS,
  pineKitName,
  treeWorldHeight,
  treeWorldWidth,
  useTreeKit,
} from "./treeKit";

/**
 * Far kit trees stay impostors for draw-call budget. Flip only after a phone
 * profile; see docs/reference/tree-rendering-guide.md.
 */
const FAR_USE_KIT = false;

type Shared = {
  pines: readonly THREE.BufferGeometry[];
  birch: THREE.BufferGeometry;
  proxy: THREE.BufferGeometry;
  /** When true, geometries are owned by this component and must be disposed. */
  ownsGeo: boolean;
};

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

const pineSize = (p: TreeSpot) => {
  const name = pineKitName(p.variant);
  return [treeWorldWidth(name), treeWorldHeight(name)] as const;
};
const birchSize = () => [treeWorldWidth("birch"), treeWorldHeight("birch")] as const;
const proxySize = () => {
  const [w, h] = farTreeWorldSize();
  return [w, h] as const;
};
const FAR_SIZE = farTreeWorldSize();
const farSize = () => FAR_SIZE;

function LeaseCellTrees({ cell, shared }: { cell: LeaseCell; shared: Shared }) {
  const byVariant = useMemo(() => {
    const buckets: TreeSpot[][] = Array.from({ length: PINE_VARIANTS }, () => []);
    for (const p of cell.pines) buckets[p.variant]?.push(p);
    return buckets;
  }, [cell.pines]);
  const all = useMemo(() => [...cell.pines, ...cell.birch], [cell]);
  return (
    <group>
      {Array.from({ length: PINE_VARIANTS }, (_, v) => (
        <Instances key={v} geo={shared.pines[v]} spots={byVariant[v]} size={pineSize} />
      ))}
      <Instances geo={shared.birch} spots={cell.birch} size={birchSize} />
      <Instances geo={shared.proxy} spots={all} size={proxySize} shadowOnly />
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
  void FAR_USE_KIT;
  return (
    <instancedMesh ref={ref} args={[far, material, spots.length]} />
  );
}

function ForestBody({
  shared,
  lines,
  paths,
}: ForestClearings & { shared: Shared }) {
  const far = useMemo(() => farTreeImpostor(), []);
  useEffect(() => () => far.dispose(), [far]);

  const clearedCells = useGameStore((s) => s.clearedCells);
  const cells = useMemo(() => leaseForest({ lines, paths }), [lines, paths]);
  const visible = useMemo(() => {
    if (!clearedCells.length) return cells;
    const cut = new Set(clearedCells);
    const keep = (spot: TreeSpot) => !isClearedAt(spot, cut);
    return cells.map((cell) => ({ ...cell, pines: cell.pines.filter(keep), birch: cell.birch.filter(keep) }));
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
}

/** Kit GLB lease forest (must sit under MountainScene Suspense). */
function TreesKit({ lines, paths }: ForestClearings) {
  const kit = useTreeKit();
  const shared = useMemo<Shared>(() => ({
    pines: kit.pines,
    birch: kit.birch,
    proxy: kit.proxy,
    ownsGeo: false,
  }), [kit]);
  return <ForestBody shared={shared} lines={lines} paths={paths} />;
}

/** Procedural cones for low graphics — no GLB load. */
function TreesLow({ lines, paths }: ForestClearings) {
  const shared = useMemo<Shared>(() => {
    const pine = leasePineLow();
    return {
      pines: [pine, pine, pine, pine],
      birch: leaseBirchLow(),
      proxy: shadowProxyLow(),
      ownsGeo: true,
    };
  }, []);
  useEffect(() => () => {
    if (!shared.ownsGeo) return;
    const seen = new Set<THREE.BufferGeometry>();
    for (const g of shared.pines) {
      if (!seen.has(g)) {
        seen.add(g);
        g.dispose();
      }
    }
    shared.birch.dispose();
    shared.proxy.dispose();
  }, [shared]);
  return <ForestBody shared={shared} lines={lines} paths={paths} />;
}

/**
 * Forest fixed in world space: kit-instanced pines and birch on the lease,
 * three-plane impostors beyond it. lowDetail skips GLBs for soft renderers.
 */
export const Trees = memo(function Trees({ lines, paths, lowDetail }: ForestClearings & { lowDetail: boolean }) {
  if (lowDetail) return <TreesLow lines={lines} paths={paths} />;
  return <TreesKit lines={lines} paths={paths} />;
}, (prev, next) => prev.lowDetail === next.lowDetail && sameForestClearings(prev, next));
