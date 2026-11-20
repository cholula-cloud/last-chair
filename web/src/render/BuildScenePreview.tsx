"use client";

import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
import { ASSET_CATALOG, lodgeAttachPads } from "@/game/base";
import { checkAssetMove, checkAssetPlacement, checkGunPlacement, checkPaint, checkPlacement } from "@/game/rules";
import { useGameStore } from "@/game/store";
import { TERRAIN, type XZ } from "@/game/terrain";
import { usePlacementDraft } from "@/ui/placementDraft";
import { liftReadout } from "@/ui/liftGesture";
import { BrushCursor } from "./BrushCursor";
import { LiftGhost } from "./LiftGhost";
import { baseConnectRadius, finishZoneRadius, STANDARD_BRUSH_WIDTH } from "@/game/paintedTrail";
import { contextColor, DIFFICULTY_COLOR, ribbonColor } from "./paintAssist";
import { PALETTE } from "./palette";
import { LIFT_BUILD_ANCHORS } from "./placementTap";
import { TrailRibbon } from "./TrailRibbon";

const NO_PROBLEMS: readonly number[] = [];

function TerrainRing({ at, radius, color, guide = false, name }: {
  name?: string;
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
    <mesh name={name} geometry={geometry} renderOrder={3}>
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
  const kind = usePlacementDraft((s) => s.kind);
  if (!active) return null;
  return kind === "lift" ? <LiftPreview /> : kind === "trail" ? <TrailPreview /> : <SitePreview />;
}

/** Selectors only: pointer moves and clock ticks do not recompute the anchor list. */
function LiftPreview() {
  const type = usePlacementDraft((s) => s.type);
  const top = usePlacementDraft((s) => s.top);
  const bottom = usePlacementDraft((s) => s.bottom) ?? TERRAIN.base;
  const snapped = usePlacementDraft((s) => s.snapped);
  const review = usePlacementDraft((s) => s.review);
  const lifts = useGameStore((s) => s.lifts);
  const cash = useGameStore((s) => s.cash);
  const assets = useGameStore((s) => s.assets);
  const lodgeTier = useGameStore((s) => s.lodgeTier);
  const talentsOwned = useGameStore((s) => s.talentsOwned);
  const founderId = useGameStore(s => s.founderId);
  const rules = useMemo(() => ({ lifts, cash, assets, lodgeTier, talentsOwned, founderId }),
    [lifts, cash, assets, lodgeTier, talentsOwned, founderId]);
  const anchors = useMemo(() => review ? [] : LIFT_BUILD_ANCHORS
    .filter((at) => checkPlacement(rules, type, { bottom, top: at }).ok),
  [review, rules, type, bottom]);
  const line = useMemo(() => top ? { top, bottom } : null, [top, bottom]);
  const readout = useMemo(() => line ? liftReadout(rules, type, line) : null, [line, rules, type]);
  return <LiftGhost line={line} bottom={bottom} type={type} readout={readout} snapped={snapped} anchors={anchors} />;
}

/**
 * The painted trail and its guides. Selectors are narrow, so a clock tick or a pointer move that
 * adds no stroke point does not rebuild the ribbon.
 */
function TrailPreview() {
  const { strokes, activeStroke, review, erasing, moveCamera } = usePlacementDraft(useShallow((s) => ({
    strokes: s.strokes,
    activeStroke: s.activeStroke,
    review: s.review,
    erasing: s.erasing,
    moveCamera: s.moveCamera,
  })));
  const lifts = useGameStore((s) => s.lifts);
  const trails = useGameStore((s) => s.trails);
  const cash = useGameStore((s) => s.cash);
  const phase = useGameStore((s) => s.phase);
  const clearedCells = useGameStore((s) => s.clearedCells);
  const glade = usePlacementDraft((s) => s.glade);
  const connectCrossings = usePlacementDraft((s) => s.connectCrossings);
  const brushWidth = usePlacementDraft((s) => s.brushWidth);
  const all = useMemo(
    () => activeStroke ? [...strokes, activeStroke] : strokes,
    [strokes, activeStroke],
  );
  // The same check the panel and the commit use, so the colour agrees with what Cut trail will do.
  const painted = useMemo(
    () => all.length ? checkPaint(useGameStore.getState(), all, glade, connectCrossings) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the slices below are what the check reads
    [lifts, trails, cash, phase, clearedCells, all, glade, connectCrossings],
  );
  const confirmed = useMemo(
    () => trails.flatMap((trail, index) => trail.open && lifts[trail.liftIndex]?.confirmed && trail.path.length > 1
      ? [{
        index,
        path: trail.path,
        widths: trail.widths ?? trail.path.map(() => STANDARD_BRUSH_WIDTH),
        color: contextColor(DIFFICULTY_COLOR[trail.difficulty]),
      }]
      : []),
    [trails, lifts],
  );
  const continuation = painted?.draftEnd;
  const color = painted ? ribbonColor(painted.difficulty) : DIFFICULTY_COLOR.green;
  return (
    <>
      {!review && !erasing && (
        <>
          <TerrainRing guide at={TERRAIN.base} radius={finishZoneRadius(TERRAIN)} color={PALETTE.snowShade} />
          <TerrainRing guide at={TERRAIN.base} radius={baseConnectRadius(TERRAIN, brushWidth)} color={PALETTE.marker} />
        </>
      )}
      {!review && !erasing && lifts.map(({ confirmed, bottom }, i) => (
        confirmed && bottom && Math.hypot(bottom.x - TERRAIN.base.x, bottom.z - TERRAIN.base.z) > 0.1 &&
        <TerrainRing key={i} guide at={bottom} radius={baseConnectRadius(TERRAIN, brushWidth)} color={PALETTE.marker} />
      ))}
      {!review && !activeStroke && !all.length && lifts
        .filter((lift) => lift.confirmed)
        .map(({ anchor }) => (
          <TerrainRing guide key={`${anchor.x}/${anchor.z}`} at={anchor} radius={0.65} color={DIFFICULTY_COLOR.green} />
        ))}
      {confirmed.map((trail) => (
        <TrailRibbon key={`context-${trail.index}`} context path={trail.path} widths={trail.widths}
          color={trail.color} problemSegments={NO_PROBLEMS} />
      ))}
      {painted && painted.path.length > 1 && (
        <TrailRibbon path={painted.path} widths={painted.widths} color={color}
          problemSegments={painted.problemSegments} live={!!activeStroke} outline />
      )}
      {painted?.links?.crossings?.map(({ at, from, trailIndex }) => (
        <TerrainRing key={`${trailIndex}/${from}`} guide at={at} radius={0.34} color={PALETTE.marker} />
      ))}
      {continuation && !review && !activeStroke && !erasing && !moveCamera && (
        <TerrainRing name="trail-continuation" guide at={continuation} radius={0.4} color={PALETTE.marker} />
      )}
      <BrushCursor />
    </>
  );
}

function LodgePadGuides() {
  const { active, kind, asset, lodgePad, review } = usePlacementDraft(useShallow((d) => ({
    active: d.active, kind: d.kind, asset: d.asset, lodgePad: d.lodgePad, review: d.review,
  })));
  const tier = useGameStore((s) => s.lodgeTier);
  const assets = useGameStore((s) => s.assets);
  if (!active || kind !== "asset" || !asset || !ASSET_CATALOG[asset].attachable || review) return null;
  const occupied = new Set(assets.map((a) => a.attachPad).filter((p): p is number => p !== undefined));
  return (
    <>
      {lodgeAttachPads(tier).map((at, i) => (
        <TerrainRing
          key={i}
          guide
          at={at}
          radius={occupied.has(i) ? 0.28 : 0.42}
          color={lodgePad === i ? PALETTE.valid : occupied.has(i) ? PALETTE.snowOld : PALETTE.marker}
        />
      ))}
    </>
  );
}

function SitePreview() {
  const draft = usePlacementDraft();
  const state = useGameStore();
  if (!draft.tapPoint) {
    return <LodgePadGuides />;
  }
  const check = draft.movingAssetIndex !== undefined ? checkAssetMove(state, draft.movingAssetIndex, draft.tapPoint) : draft.kind === "gun"
    ? checkGunPlacement(state, draft.tapPoint)
    : draft.asset ? checkAssetPlacement(state, draft.asset, draft.tapPoint) : null;
  return (
    <>
      <LodgePadGuides />
      <TerrainRing at={check?.ok ? check.placement.at : draft.tapPoint}
        radius={draft.kind === "gun" ? 0.36 : 0.6}
        color={check?.ok ? PALETTE.valid : PALETTE.invalid}
      />
    </>
  );
}
