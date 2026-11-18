"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import type { PerspectiveCamera } from "three";
import { useGameStore } from "@/game/store";
import { TERRAIN, type XZ } from "@/game/terrain";
import type { PaintStroke } from "@/game/paintedTrail";
import { liftBottomAt, liftTopAt, resolveLiftGrab, type LiftGrab } from "@/ui/liftGesture";
import { usePlacementDraft } from "@/ui/placementDraft";
import { pickTerrain } from "./terrainPick";
import { LIFT_BUILD_ANCHORS, snapRadiusAtHit } from "./placementTap";

const MAX_STROKE_POINTS = 512;
const MIN_POINT_DISTANCE = 0.1;

/** A single pointer builds. A second pointer cancels the draft gesture and hands the map to the camera. */
export function PlacementController() {
  const active = usePlacementDraft((s) => s.active && !s.moveCamera);
  const dom = useThree((s) => s.gl.domElement);
  const get = useThree((s) => s.get);

  useEffect(() => {
    if (!active) return;
    const pointers = new Set<number>();
    let gesture: { top?: XZ; bottom?: XZ; tapPoint?: XZ; snapped: boolean } | null = null;
    let grab: LiftGrab = "top";
    let moved = false;
    let blocked = false;

    const moveDraft = (event: PointerEvent, pressing = false) => {
      const draft = usePlacementDraft.getState();
      if (draft.review) return;
      const camera = get().camera as PerspectiveCamera;
      const rect = dom.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const raw = pickTerrain({
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: 1 - ((event.clientY - rect.top) / rect.height) * 2,
      }, camera, TERRAIN.height);
      if (!raw) return;

      if (draft.kind === "trail") {
        const stroke: PaintStroke = draft.activeStroke ?? {
          points: [], widthFt: draft.brushWidth, erase: draft.erasing,
        };
        const last = stroke.points.at(-1);
        const addPoint = !last || (
          Math.hypot(last.x - raw.x, last.z - raw.z) >= MIN_POINT_DISTANCE &&
          stroke.points.length < MAX_STROKE_POINTS
        );
        if (addPoint) {
          usePlacementDraft.setState({
            tapPoint: raw,
            activeStroke: { ...stroke, points: [...stroke.points, raw] },
          });
        }
      } else if (draft.kind === "lift") {
        const y = TERRAIN.height(raw.x, raw.z);
        const radius = snapRadiusAtHit(camera, { ...raw, y }, rect.height);
        if (pressing) {
          grab = resolveLiftGrab(raw, { top: draft.top, bottom: draft.bottom ?? TERRAIN.base }, radius);
          if (grab === "base-then-top") usePlacementDraft.setState({ bottom: liftBottomAt(raw), tapPoint: raw });
          else usePlacementDraft.setState({ tapPoint: raw });
          if (grab !== "top") return;
        } else if (grab === "bottom") {
          usePlacementDraft.setState({ bottom: liftBottomAt(raw), tapPoint: raw });
          return;
        }
        const bottom = usePlacementDraft.getState().bottom ?? TERRAIN.base;
        const next = liftTopAt(useGameStore.getState(), draft.type, bottom, raw, radius, LIFT_BUILD_ANCHORS);
        usePlacementDraft.setState({ top: next.top, snapped: next.snapped, tapPoint: raw });
      } else {
        usePlacementDraft.setState({ tapPoint: raw });
      }
    };

    const onDown = (event: PointerEvent) => {
      const draft = usePlacementDraft.getState();
      if (event.button !== 0 || draft.review) return;
      pointers.add(event.pointerId);
      if (pointers.size > 1) {
        blocked = true;
        if (gesture) usePlacementDraft.setState({ ...gesture, activeStroke: null });
        return;
      }
      moved = false;
      gesture = { top: draft.top, bottom: draft.bottom, tapPoint: draft.tapPoint, snapped: draft.snapped };
      dom.setPointerCapture(event.pointerId);
      moveDraft(event, true);
    };

    const onMove = (event: PointerEvent) => {
      if (pointers.has(event.pointerId) && !blocked) {
        moved = true;
        moveDraft(event);
      }
    };

    const onUp = (event: PointerEvent) => {
      if (!pointers.delete(event.pointerId)) return;
      if (pointers.size > 0) return;
      if (!blocked) {
        // A tap on a bottom terminal or in the base has no drag to finish.
        if (grab === "top" || moved) moveDraft(event);
        const draft = usePlacementDraft.getState();
        if (draft.kind === "trail") {
          const stroke = draft.activeStroke;
          usePlacementDraft.setState({
            activeStroke: null,
            ...(stroke && stroke.points.length > 1 ? { strokes: [...draft.strokes, stroke], redo: [] } : {}),
          });
        }
      }
      gesture = null;
      blocked = false;
      moved = false;
      grab = "top";
    };

    const onCancel = (event: PointerEvent) => {
      if (!pointers.delete(event.pointerId)) return;
      if (gesture) usePlacementDraft.setState({ ...gesture, activeStroke: null });
      if (pointers.size === 0) {
        gesture = null;
        blocked = false;
      } else {
        blocked = true;
      }
    };

    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [active, dom, get]);

  return null;
}
