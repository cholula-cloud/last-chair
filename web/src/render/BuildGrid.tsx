"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import { ASSET_CATALOG } from "@/game/base";
import { constructionDraw } from "@/game/economy";
import { GUN_COST } from "@/game/guns";
import { checkAssetPlacement, checkGunPlacement } from "@/game/rules";
import { useGameStore } from "@/game/store";
import { TERRAIN, type XZ } from "@/game/terrain";
import type { LiftType } from "@/game/types";
import { usePlacementDraft } from "@/ui/placementDraft";
import { dotRadius, dotStyle, GRID_STYLE, type DotKind, type GridMode } from "./buildGridStyle";
import {
  buildGridCapacities,
  clearOfCable,
  gridDots,
  LIFT_BOTTOM_DEBOUNCE_MS,
  liftTopCells,
  reachArc,
  reachOf,
  snapBottom,
  type Dot,
} from "./buildGridModel";

export {
  clearOfCable,
  gridDots,
  LIFT_BOTTOM_DEBOUNCE_MS,
  LIFT_BOTTOM_STEP,
  LIFT_GUIDE_STEP,
  liftTopCells,
  reachArc,
  reachOf,
  snapBottom,
} from "./buildGridModel";

const { field: FIELD_CAPACITY, lift: LIFT_CAPACITY } = buildGridCapacities();

/** The rules read cash only as "enough or not", so stand in a figure that gives the same answer. */
function withCash<T extends { canAfford: boolean }>(state: T) {
  return { ...state, cash: state.canAfford ? Number.MAX_SAFE_INTEGER : 0 };
}

/** One instanced layer of flat dots in a single style. Capacity is fixed so a changing count never rebuilds the mesh. */
function DotLayer({ cells, capacity, mode, kind, snapped = false }: {
  cells: readonly XZ[];
  capacity: number;
  mode: GridMode;
  kind: DotKind;
  snapped?: boolean;
}) {
  const style = dotStyle(mode, kind, snapped);
  const color = useMemo(() => new THREE.Color(style.color), [style.color]);
  const geometry = useMemo(() => new THREE.CircleGeometry(dotRadius(mode), 8).rotateX(-Math.PI / 2), [mode]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const matrix = new THREE.Matrix4();
    cells.forEach((cell, i) => {
      matrix.makeTranslation(cell.x, TERRAIN.height(cell.x, cell.z) + GRID_STYLE.height, cell.z);
      m.setMatrixAt(i, matrix);
    });
    m.count = cells.length;
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [cells]);
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, capacity]} renderOrder={1} frustumCulled={false}>
      <meshBasicMaterial color={color} transparent opacity={style.opacity} depthWrite={false} toneMapped={false}
        polygonOffset polygonOffsetFactor={-2} />
    </instancedMesh>
  );
}

const cellsOf = (dots: readonly Dot[], valid: boolean | null): XZ[] =>
  dots.filter((dot) => dot.valid === valid).map(({ x, z }) => ({ x, z }));

/** The reach ring: a thin line on the ground at the longest legal lift, clipped to the lease and hidden near the cable. */
function ReachRing({ bottom, top, type, snapped }: { bottom: XZ; top?: XZ; type: LiftType; snapped: boolean }) {
  const ARC_STEPS = 128;
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ARC_STEPS * 2 * 3), 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const segments = useMemo(() => {
    const clear = GRID_STYLE.cableClearCells * (TERRAIN.scale.horizontal / 2);
    const arc = reachArc(bottom, reachOf(type), TERRAIN, ARC_STEPS);
    const kept = new Set(clearOfCable(arc.filter((p): p is XZ => !!p), bottom, top, clear));
    return arc.flatMap((p, i) => {
      const q = arc[i + 1];
      return p && q && kept.has(p) && kept.has(q) ? [[p, q] as const] : [];
    });
  }, [bottom, top, type]);
  const lines = useRef<THREE.LineSegments>(null);
  useLayoutEffect(() => {
    const target = lines.current?.geometry;
    const attribute = target?.getAttribute("position");
    if (!target || !attribute) return;
    let n = 0;
    for (const [p, q] of segments) {
      for (const at of [p, q]) {
        attribute.setXYZ(n++, at.x, TERRAIN.height(at.x, at.z) + GRID_STYLE.height, at.z);
      }
    }
    attribute.needsUpdate = true;
    target.setDrawRange(0, n);
    target.computeBoundingSphere();
  }, [segments]);
  const style = snapped ? GRID_STYLE.reachSnapped : GRID_STYLE.reach;
  return (
    <lineSegments ref={lines} geometry={geometry} renderOrder={1} frustumCulled={false}>
      <lineBasicMaterial color={style.color} transparent opacity={style.opacity} depthWrite={false} toneMapped={false} />
    </lineSegments>
  );
}

/** The lift guide: a reach ring plus faint dots where the top can go, clear of the cable ghost, fainter once snapped. */
function LiftGrid() {
  const { type, bottom: draftBottom, top, snapped, review } = usePlacementDraft(useShallow((draft) => ({
    type: draft.type, bottom: draft.bottom, top: draft.top, snapped: draft.snapped, review: draft.review,
  })));
  const rules = useGameStore(useShallow((state) => ({ lifts: state.lifts, assets: state.assets, lodgeTier: state.lodgeTier })));
  const bottom = draftBottom ?? TERRAIN.base;
  const stepped = snapBottom(bottom);
  // Trailing debounce of the rounded bottom: a drag settles before the cells are recomputed.
  const [settled, setSettled] = useState(stepped);
  useEffect(() => {
    if (settled.x === stepped.x && settled.z === stepped.z) return;
    const timer = setTimeout(() => setSettled(stepped), LIFT_BOTTOM_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [stepped, settled]);
  const cells = useMemo(
    () => review ? [] : liftTopCells(rules, type, settled),
    [review, rules, type, settled],
  );
  const shown = useMemo(
    () => clearOfCable(cells, bottom, top, GRID_STYLE.cableClearCells * (TERRAIN.scale.horizontal / 2)),
    [cells, bottom, top],
  );
  if (review) return null;
  const fade = snapped && !!top;
  return (
    <>
      {cells.length > 0 && <ReachRing bottom={bottom} top={top} type={type} snapped={fade} />}
      <DotLayer cells={shown} capacity={LIFT_CAPACITY} mode="lift" kind="valid" snapped={fade} />
    </>
  );
}

/**
 * A sampled guide: dots at the centres of lease cells. Valid cells are green; in asset and gun
 * mode blocked cells show as a faint neutral dot so the lease keeps its shape. The placement
 * preview remains the final authority. Lift mode shows a dimmer guide of legal top cells; trail
 * mode draws none.
 */
export function BuildGrid() {
  const { mode, asset, movingAssetIndex } = usePlacementDraft(useShallow((draft) => {
    // Trail mode keeps the map quiet.
    const mode = draft.active
      ? draft.kind === "trail" ? null : draft.kind
      : draft.showBuildGrid ? "overview" : null;
    return { mode, movingAssetIndex: draft.movingAssetIndex, asset: mode === "asset" ? draft.asset : undefined };
  }));
  if (mode === "lift") return <LiftGrid />;
  if (mode !== "asset" && mode !== "gun" && mode !== "overview") return null;
  return <FieldGrid mode={mode} asset={asset} movingAssetIndex={movingAssetIndex} />;
}

function FieldGrid({ mode, asset, movingAssetIndex }: {
  mode: "overview" | "asset" | "gun" | null;
  asset: ReturnType<typeof usePlacementDraft.getState>["asset"];
  movingAssetIndex: number | undefined;
}) {
  const draftAsset = asset;
  const state = useGameStore(useShallow((state) => mode && mode !== "overview" ? {
    lifts: state.lifts,
    trails: state.trails,
    assets: state.assets,
    guns: state.guns,
    // Only whether the item is affordable matters, so a cash tick does not rebuild the dots.
    canAfford: state.cash >= constructionDraw(mode === "gun" ? GUN_COST : ASSET_CATALOG[draftAsset ?? "cafe"]?.cost ?? 0).deposit,
    phase: state.phase,
    dayIndex: state.dayIndex,
    lodgeTier: state.lodgeTier,
  } : null));
  const dots = useMemo(() => {
    if (!mode) return [];
    if (state && mode === "asset" && asset) {
      const placement = withCash(state);
      if (movingAssetIndex !== undefined) {
        placement.assets = placement.assets.filter((_, index) => index !== movingAssetIndex);
        placement.cash = Number.MAX_SAFE_INTEGER;
      }
      return gridDots((at) => checkAssetPlacement(placement, asset, at).ok);
    }
    if (state && mode === "gun") return gridDots((at) => checkGunPlacement(withCash(state), at).ok);
    return gridDots(null);
  }, [mode, asset, movingAssetIndex, state]);
  const valid = useMemo(() => cellsOf(dots, true), [dots]);
  const blocked = useMemo(() => cellsOf(dots, false), [dots]);
  const neutral = useMemo(() => cellsOf(dots, null), [dots]);
  if (!mode) return null;
  return (
    <>
      <DotLayer cells={blocked} capacity={FIELD_CAPACITY} mode={mode} kind="blocked" />
      <DotLayer cells={valid} capacity={FIELD_CAPACITY} mode={mode} kind="valid" />
      <DotLayer cells={neutral} capacity={FIELD_CAPACITY} mode={mode} kind="neutral" />
    </>
  );
}
