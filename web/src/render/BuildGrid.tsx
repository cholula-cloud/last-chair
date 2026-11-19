"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import { leaseBounds, onLease } from "@/game/lease";
import { checkAssetPlacement, checkGunPlacement } from "@/game/rules";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { usePlacementDraft } from "@/ui/placementDraft";

const VALID = new THREE.Color("#36a975");
const NEUTRAL = new THREE.Color("#d7e5dd");
const DOT_RADIUS = 0.15;
const DOT_LIFT = 0.08;

type Dot = { x: number; z: number; valid: boolean | null };

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
      const valid = check ? check(at) : null;
      // A cell that cannot take the placement draws nothing: the guide shows only where you can build.
      if (valid === false) continue;
      dots.push({ x: at.x, z: at.z, valid });
    }
  }
  return dots;
}

/**
 * A sampled guide: faint dots at the centres of cells where the chosen item fits. The
 * placement preview remains the final authority. Lift and trail tools draw none.
 */
export function BuildGrid() {
  const { mode, asset } = usePlacementDraft(useShallow((draft) => {
    // Lift mode shows anchor dots and the ghost instead of a grid. Trail mode keeps the map quiet.
    const mode = draft.active
      ? draft.kind === "trail" || draft.kind === "lift" ? null : draft.kind
      : draft.showBuildGrid ? "overview" : null;
    return { mode, asset: mode === "asset" ? draft.asset : undefined };
  }));
  const state = useGameStore(useShallow((state) => mode && mode !== "overview" ? {
    lifts: state.lifts,
    trails: state.trails,
    assets: state.assets,
    guns: state.guns,
    cash: state.cash,
    phase: state.phase,
    dayIndex: state.dayIndex,
    lodgeTier: state.lodgeTier,
  } : null));
  const dots = useMemo(() => {
    if (!mode) return [];
    if (state && mode === "asset" && asset) return gridDots((at) => checkAssetPlacement(state, asset, at).ok);
    if (state && mode === "gun") return gridDots((at) => checkGunPlacement(state, at).ok);
    return gridDots(null);
  }, [mode, asset, state]);

  const geometry = useMemo(() => new THREE.CircleGeometry(DOT_RADIUS, 8).rotateX(-Math.PI / 2), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const matrix = new THREE.Matrix4();
    dots.forEach((dot, i) => {
      matrix.makeTranslation(dot.x, TERRAIN.height(dot.x, dot.z) + DOT_LIFT, dot.z);
      m.setMatrixAt(i, matrix);
      m.setColorAt(i, dot.valid ? VALID : NEUTRAL);
    });
    m.count = dots.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [dots]);

  if (!dots.length) return null;
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, dots.length]} renderOrder={1}>
      <meshBasicMaterial transparent opacity={0.6} depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-2} />
    </instancedMesh>
  );
}
