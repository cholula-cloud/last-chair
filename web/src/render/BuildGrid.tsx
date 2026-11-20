"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import { leaseBounds, onLease } from "@/game/lease";
import { ASSET_CATALOG } from "@/game/base";
import { constructionDraw } from "@/game/economy";
import { GUN_COST } from "@/game/guns";
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
): Dot[] {
  const size = terrain.scale.horizontal / 2;
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

export const snapBottom = (bottom: XZ): XZ => ({
  x: Math.round(bottom.x / LIFT_BOTTOM_STEP) * LIFT_BOTTOM_STEP,
  z: Math.round(bottom.z / LIFT_BOTTOM_STEP) * LIFT_BOTTOM_STEP,
});

type LiftRules = Parameters<typeof checkPlacement>[0];

/**
 * Lease cells where the top terminal can legally go for this bottom: the same `checkPlacement`
 * the preview uses, with cash set high so the guide shows terrain, spacing and building rules.
 * One pass over the lease cells; callers memoize on (rules, type, bottom).
 */
export function liftTopCells(rules: Omit<LiftRules, "cash">, type: LiftType, bottom: XZ, terrain = TERRAIN): XZ[] {
  const state = { ...rules, cash: Number.MAX_SAFE_INTEGER };
  const from = snapBottom(bottom);
  return gridDots((top) => checkPlacement(state, type, { bottom: from, top }).ok, terrain)
    .filter((dot) => dot.valid)
    .map(({ x, z }) => ({ x, z }));
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
function DotLayer({ cells, capacity = cells.length, mode, kind, snapped = false }: {
  cells: readonly XZ[];
  capacity?: number;
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
  if (!capacity) return null;
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, capacity]} renderOrder={1} frustumCulled={false}>
      <meshBasicMaterial color={color} transparent opacity={style.opacity} depthWrite={false} toneMapped={false}
        polygonOffset polygonOffsetFactor={-2} />
    </instancedMesh>
  );
}

const cellsOf = (dots: readonly Dot[], valid: boolean | null): XZ[] =>
  dots.filter((dot) => dot.valid === valid).map(({ x, z }) => ({ x, z }));

/** The lift guide: faint dots where the top can go, clear of the cable ghost, fainter once snapped. */
function LiftGrid() {
  const { type, bottom: draftBottom, top, snapped, review } = usePlacementDraft(useShallow((draft) => ({
    type: draft.type, bottom: draft.bottom, top: draft.top, snapped: draft.snapped, review: draft.review,
  })));
  const rules = useGameStore(useShallow((state) => ({ lifts: state.lifts, assets: state.assets, lodgeTier: state.lodgeTier })));
  const bottom = draftBottom ?? TERRAIN.base;
  const stepped = snapBottom(bottom);
  const cells = useMemo(
    () => review ? [] : liftTopCells(rules, type, { x: stepped.x, z: stepped.z }),
    [review, rules, type, stepped.x, stepped.z],
  );
  const shown = useMemo(
    () => clearOfCable(cells, bottom, top, GRID_STYLE.cableClearCells * (TERRAIN.scale.horizontal / 2)),
    [cells, bottom, top],
  );
  return <DotLayer cells={shown} capacity={cells.length} mode="lift" kind="valid" snapped={snapped && !!top} />;
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
      <DotLayer cells={blocked} mode={mode} kind="blocked" />
      <DotLayer cells={valid} mode={mode} kind="valid" />
      <DotLayer cells={neutral} mode={mode} kind="neutral" />
    </>
  );
}
