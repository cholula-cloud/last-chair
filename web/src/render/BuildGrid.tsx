"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import { leaseBounds, onLease } from "@/game/lease";
import { ASSET_CATALOG } from "@/game/base";
import { constructionDraw } from "@/game/economy";
import { GUN_COST } from "@/game/guns";
import { liftLength, rulesFor } from "@/game/descent";
import { checkAssetPlacement, checkGunPlacement, checkPlacement } from "@/game/rules";
import { useGameStore } from "@/game/store";
import { TERRAIN, type XZ } from "@/game/terrain";
import type { LiftType } from "@/game/types";
import { usePlacementDraft } from "@/ui/placementDraft";
import { dotRadius, dotStyle, GRID_STYLE, type DotKind, type GridMode } from "./buildGridStyle";

type Dot = { x: number; z: number; valid: boolean | null };

/** Lift-top cells are judged from a bottom rounded to this step, so a bottom drag recomputes at most once per step. */
export const LIFT_BOTTOM_STEP = 0.5;

/** Centres of the build cells that lie on the lease, with whether a placement there is allowed. */
export function gridDots(
  check: ((at: { x: number; z: number }) => boolean) | null,
  terrain = TERRAIN,
  step = terrain.scale.horizontal / 2,
): Dot[] {
  const size = step;
  const { xMin, xMax, zMin, zMax } = leaseBounds(terrain);
  const dots: Dot[] = [];
  for (let x = Math.floor(xMin / size) * size; x + size <= xMax + size; x += size) {
    for (let z = Math.floor(zMin / size) * size; z + size <= zMax + size; z += size) {
      const at = { x: x + size / 2, z: z + size / 2 };
      if (!onLease(at, terrain)) continue;
      dots.push({ x: at.x, z: at.z, valid: check ? check(at) : null });
    }
  }
  return dots;
}

/** The lift guide samples at half the field's cell step so the legal area reads as an area, not specks. */
export const LIFT_GUIDE_STEP = TERRAIN.scale.horizontal / 4;
/** Debounce of the rounded bottom, so a bottom drag does not recompute mid-gesture. */
export const LIFT_BOTTOM_DEBOUNCE_MS = 160;
/** Constant instance capacities: every lease cell at the sampling each mode uses, so a mesh is never rebuilt. */
const FIELD_CAPACITY = gridDots(null).length;
const LIFT_CAPACITY = gridDots(null, TERRAIN, LIFT_GUIDE_STEP).length;

export const snapBottom = (bottom: XZ): XZ => ({
  x: Math.round(bottom.x / LIFT_BOTTOM_STEP) * LIFT_BOTTOM_STEP,
  z: Math.round(bottom.z / LIFT_BOTTOM_STEP) * LIFT_BOTTOM_STEP,
});

type LiftRules = Parameters<typeof checkPlacement>[0];

/**
 * Lease cells where the top terminal can legally go for this bottom: the same `checkPlacement`
 * the preview uses, with cash set high so the guide shows terrain, spacing and building rules.
 * Cells beyond `maxLiftLength` are skipped before the check using the same constant and length
 * function `checkLiftLine` uses (the 0.02 slack covers the 0.01 rounding `checkPlacement` applies),
 * so the output is unchanged. Callers memoize on (rules, type, bottom).
 * talentsOwned and founderId are intentionally omitted: they change cost, not legality.
 */
export function liftTopCells(
  rules: Omit<LiftRules, "cash"> & { cash?: number },
  type: LiftType,
  bottom: XZ,
  terrain = TERRAIN,
  options: { prefilter?: boolean } = {},
): XZ[] {
  const state = { ...rules, cash: Number.MAX_SAFE_INTEGER };
  const from = snapBottom(bottom);
  const reach = reachOf(type, terrain) + 0.02;
  const near = options.prefilter === false
    ? () => true
    : (at: XZ) => liftLength({ bottom: from, top: at }) <= reach;
  return gridDots((top) => near(top) && checkPlacement(state, type, { bottom: from, top }).ok, terrain, LIFT_GUIDE_STEP)
    .filter((dot) => dot.valid)
    .map(({ x, z }) => ({ x, z }));
}

/** The longest lift of this type, in world units: the rule `checkLiftLine` enforces. */
export const reachOf = (type: LiftType, terrain = TERRAIN) => rulesFor(terrain, type).maxLiftLength;

/**
 * Points of the circle of radius `reach` round the bottom that lie on the lease. The ring is
 * drawn as segments between consecutive kept points.
 */
export function reachArc(bottom: XZ, reach: number, terrain = TERRAIN, steps = 128): (XZ | null)[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = (i / steps) * Math.PI * 2;
    const at = { x: bottom.x + Math.cos(angle) * reach, z: bottom.z + Math.sin(angle) * reach };
    return onLease(at, terrain) ? at : null;
  });
}

/** Cells farther than `clear` from the cable segment (which includes both pads); with no top, from the bottom only. */
export function clearOfCable(cells: readonly XZ[], bottom: XZ, top: XZ | null | undefined, clear: number): XZ[] {
  const end = top ?? bottom;
  const dx = end.x - bottom.x;
  const dz = end.z - bottom.z;
  const len2 = dx * dx + dz * dz;
  return cells.filter((cell) => {
    const t = len2 > 0 ? Math.min(1, Math.max(0, ((cell.x - bottom.x) * dx + (cell.z - bottom.z) * dz) / len2)) : 0;
    return Math.hypot(cell.x - (bottom.x + dx * t), cell.z - (bottom.z + dz * t)) > clear;
  });
}

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
