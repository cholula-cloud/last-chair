"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { isClearedAt } from "@/game/clearing";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import {
  farForest,
  hash01,
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
import { mountainTheme } from "./mountainThemes";

/**
 * Far kit trees stay impostors for draw-call budget. Flip only after a phone
 * profile; see docs/reference/tree-rendering-guide.md.
 */
const FAR_USE_KIT = false;

type Shared = {
  pines: readonly THREE.BufferGeometry[];
  birch: THREE.BufferGeometry | null;
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
  neutralTint = false,
  mapleRatio = 0,
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
      if (neutralTint) {
        const isMaple = mapleRatio > 0 && hash01(p.x, p.z, 73) < mapleRatio;
        if (isMaple) {
          tint.setRGB(1.06, 0.72, 0.45);
        } else {
          const k = 0.94 + (p.tint - 0.86) * 0.5;
          tint.setRGB(k, k, k * 0.98);
        }
      } else {
        tint.setRGB(p.tint * 0.97, p.tint * 1.02, p.tint * 0.97);
      }
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
  neutralTint = false,
  mapleRatio = 0,
}: {
  geo: THREE.BufferGeometry;
  spots: readonly TreeSpot[];
  size: (spot: TreeSpot) => readonly [number, number];
  shadowOnly?: boolean;
  neutralTint?: boolean;
  mapleRatio?: number;
}) {
  const ref = useRef<THREE.InstancedMesh | null>(null);
  useLayoutEffect(() => {
    if (ref.current) writeInstances(ref.current, spots, size, !shadowOnly, neutralTint, mapleRatio);
  }, [spots, size, shadowOnly, neutralTint, mapleRatio]);
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
      <meshStandardMaterial vertexColors roughness={0.78} metalness={0.02} />
    </instancedMesh>
  );
}

const pineSize = (p: TreeSpot) => {
  const name = pineKitName(p.variant);
  return [treeWorldWidth(name), treeWorldHeight(name)] as const;
};
const BIRCH_SIZE: readonly [number, number] = [treeWorldWidth("birch") * 0.92, treeWorldHeight("birch") * 0.96];
const birchSize = () => BIRCH_SIZE;
const proxySize = () => {
  const [w, h] = farTreeWorldSize();
  return [w, h] as const;
};
const FAR_SIZE = farTreeWorldSize();
const farSize = () => FAR_SIZE;

function isHardwoodSpot(p: TreeSpot, ratio: number): boolean {
  return hash01(p.x, p.z, 19) < ratio;
}

function LeaseCellTrees({
  cell,
  shared,
  hardwoodRatio,
  mapleRatio,
}: {
  cell: LeaseCell;
  shared: Shared;
  hardwoodRatio: number;
  mapleRatio: number;
}) {
  const { buckets, birches } = useMemo(() => {
    const b: TreeSpot[][] = Array.from({ length: PINE_VARIANTS }, () => []);
    const bi: TreeSpot[] = [];
    for (const p of cell.pines) {
      if (shared.birch && isHardwoodSpot(p, hardwoodRatio)) bi.push(p);
      else b[p.variant]?.push(p);
    }
    return { buckets: b, birches: bi };
  }, [cell.pines, shared.birch, hardwoodRatio]);
  return (
    <group>
      {Array.from({ length: PINE_VARIANTS }, (_, v) => (
        <Instances key={v} geo={shared.pines[v]} spots={buckets[v]} size={pineSize} />
      ))}
      {shared.birch && (
        <Instances geo={shared.birch} spots={birches} size={birchSize} neutralTint mapleRatio={mapleRatio} />
      )}
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
  const material = useMemo(() => patchLeaseDim(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.82, metalness: 0.02 })), []);
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

  const mountainId = useGameStore((s) => s.mountainId);
  const theme = mountainTheme(mountainId);
  const hardwoodRatio = theme.birchRatio + theme.mapleRatio;
  const mapleShare = hardwoodRatio > 0 ? theme.mapleRatio / hardwoodRatio : 0;
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
      {visible.map((cell) => (
        <LeaseCellTrees
          key={cell.key}
          cell={cell}
          shared={shared}
          hardwoodRatio={hardwoodRatio}
          mapleRatio={mapleShare}
        />
      ))}
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
      birch: null,
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
    shared.proxy.dispose();
  }, [shared]);
  return <ForestBody shared={shared} lines={lines} paths={paths} />;
}

/**
 * Forest fixed in world space: kit-instanced pines on the lease, three-plane
 * impostors beyond it. lowDetail skips GLBs for soft renderers.
 */
export const Trees = memo(function Trees({ lines, paths, lowDetail }: ForestClearings & { lowDetail: boolean }) {
  if (lowDetail) return <TreesLow lines={lines} paths={paths} />;
  return <TreesKit lines={lines} paths={paths} />;
}, (prev, next) => prev.lowDetail === next.lowDetail && sameForestClearings(prev, next));