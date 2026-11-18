"use client";

import { useEffect, useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
import { previewPaintedTrail } from "@/game/paintedTrail";
import { checkAssetPlacement, checkGunPlacement, checkPlacement } from "@/game/rules";
import { useGameStore } from "@/game/store";
import { TERRAIN, type XZ } from "@/game/terrain";
import type { TrailDifficulty } from "@/game/types";
import { usePlacementDraft } from "@/ui/placementDraft";
import { liftReadout } from "@/ui/liftGesture";
import { LiftGhost } from "./LiftGhost";
import { PALETTE } from "./palette";
import { SlopeGrid } from "./SlopeGrid";
import { LIFT_BUILD_ANCHORS } from "./placementTap";
import { TrailRibbon } from "./TrailRibbon";

const DIFFICULTY_COLOR: Record<TrailDifficulty, string> = {
  green: "#197641",
  blue: "#195dc4",
  black: "#28263e",
};

function TerrainRing({ at, radius, color, guide = false }: {
  at: XZ;
  radius: number;
  color: string;
  guide?: boolean;
}) {
  const geometry = useMemo(() => {
    const count = 44;
    const point = (index: number, r: number) => {
      const angle = index / count * Math.PI * 2;
      const x = at.x + Math.cos(angle) * r;
      const z = at.z + Math.sin(angle) * r;
      return new Vector3(x, TERRAIN.height(x, z) + 0.12, z);
    };
    const geometry = new BufferGeometry();
    if (!guide) return geometry.setFromPoints(Array.from({ length: count }, (_, i) => point(i, radius)));
    const vertices: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i < count; i++) {
      const outer = point(i, radius);
      const inner = point(i, radius * 0.72);
      vertices.push(outer.x, outer.y, outer.z, inner.x, inner.y, inner.z);
      const next = (i + 1) % count;
      indices.push(i * 2, i * 2 + 1, next * 2, i * 2 + 1, next * 2 + 1, next * 2);
    }
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    return geometry;
  }, [at, guide, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (guide) return (
    <mesh geometry={geometry} renderOrder={3}>
      <meshBasicMaterial color={color} />
    </mesh>
  );
  return (
    <lineLoop geometry={geometry} renderOrder={3}>
      <lineBasicMaterial color={color} />
    </lineLoop>
  );
}

export function BuildScenePreview() {
  const active = usePlacementDraft((s) => s.active);
  return active ? <ActiveBuildScenePreview /> : null;
}

function ActiveBuildScenePreview() {
  const draft = usePlacementDraft();
  const state = useGameStore();
  const strokes = useMemo(
    () => draft.activeStroke ? [...draft.strokes, draft.activeStroke] : draft.strokes,
    [draft.strokes, draft.activeStroke],
  );
  const painted = useMemo(() => draft.kind === "trail" && strokes.length
    ? previewPaintedTrail(state, strokes)
    : null, [draft.kind, state, strokes]);
  const line = useMemo(() => draft.top ? {
    top: draft.top, bottom: draft.bottom ?? TERRAIN.base,
  } : null, [draft.top, draft.bottom]);
  const trailLine = useMemo(() => painted?.path.length ? {
    top: painted.path[0], bottom: painted.path[painted.path.length - 1],
  } : null, [painted]);

  if (draft.kind === "lift") {
    const bottom = draft.bottom ?? TERRAIN.base;
    const readout = line ? liftReadout(state, draft.type, line) : null;
    const anchors = draft.review ? [] : LIFT_BUILD_ANCHORS
      .filter((top) => checkPlacement(state, draft.type, { bottom, top }).ok);
    return (
      <LiftGhost line={line} bottom={bottom} type={draft.type} readout={readout}
        snapped={draft.snapped} anchors={anchors} />
    );
  }

  if (draft.kind === "trail") {
    const continuation = painted?.draftEnd;
    return (
      <>
        {!draft.review && <SlopeGrid />}
        {!draft.review && !draft.erasing && (
          <TerrainRing guide at={TERRAIN.base} radius={0.9} color={PALETTE.marker} />
        )}
        {!draft.review && !draft.activeStroke && !strokes.length && state.lifts
          .filter((lift) => lift.confirmed)
          .map(({ anchor }) => (
            <TerrainRing guide key={`${anchor.x}/${anchor.z}`} at={anchor} radius={0.65} color={DIFFICULTY_COLOR.green} />
          ))}
        {painted && trailLine && painted.path.length > 1 && (
          <TrailRibbon line={trailLine} valid={!painted.reason}
            path={painted.path} widths={painted.widths}
            color={DIFFICULTY_COLOR[painted.difficulty]} problemSegments={painted.problemSegments}
          />
        )}
        {continuation && !draft.review && !draft.activeStroke && !draft.erasing && (
          <TerrainRing guide at={continuation} radius={0.4} color={PALETTE.marker} />
        )}
        {draft.tapPoint && !draft.review && !draft.moveCamera && (
          <TerrainRing at={draft.tapPoint} radius={draft.brushWidth / (2 * TERRAIN.horizontalFeetPerUnit)}
            color={draft.erasing ? PALETTE.invalid : PALETTE.white} />
        )}
      </>
    );
  }

  if (!draft.tapPoint) return null;
  const check = draft.kind === "gun"
    ? checkGunPlacement(state, draft.tapPoint)
    : draft.asset ? checkAssetPlacement(state, draft.asset, draft.tapPoint) : null;
  return (
    <TerrainRing at={check?.ok ? check.placement.at : draft.tapPoint}
      radius={draft.kind === "gun" ? 0.36 : 0.6}
      color={check?.ok ? PALETTE.valid : PALETTE.invalid}
    />
  );
}
