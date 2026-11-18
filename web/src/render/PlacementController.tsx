"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { PerspectiveCamera } from "three";
import { useGameStore } from "@/game/store";
import { TERRAIN, type XZ } from "@/game/terrain";
import type { PaintStroke } from "@/game/paintedTrail";
import { liftDrag, liftPress, type LiftGrab } from "@/ui/liftGesture";
import { usePlacementDraft } from "@/ui/placementDraft";
import { brushState } from "./brushState";
import { edgePanInput, edgePanVelocity } from "./paintAssist";
import { pickTerrain } from "./terrainPick";
import { useReducedMotion } from "./useReducedMotion";
import { LIFT_BUILD_ANCHORS, snapRadiusAtHit } from "./placementTap";

const MAX_STROKE_POINTS = 512;
const MIN_POINT_DISTANCE = 0.1;
/** Time constant of the auto-pan velocity ramp, in seconds. Reduced motion skips the ramp. */
const PAN_TAU = 0.12;

/** A single pointer builds. A second pointer cancels the draft gesture and hands the map to the camera. */
export function PlacementController() {
  const active = usePlacementDraft((s) => s.active && !s.moveCamera);
  const dom = useThree((s) => s.gl.domElement);
  const get = useThree((s) => s.get);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active) return;
    const pointers = new Set<number>();
    let gesture: { top?: XZ; bottom?: XZ; tapPoint?: XZ; snapped: boolean } | null = null;
    let grab: LiftGrab = "new-top";
    let offset: XZ = { x: 0, z: 0 };
    let moved = false;
    let blocked = false;
    // Last screen position of the painting finger, for edge auto-pan between pointer events.
    let screen: { x: number; y: number } | null = null;
    let panFrame = 0;
    let panLast = 0;
    const panVelocity = { x: 0, z: 0 };

    const pick = (clientX: number, clientY: number) => {
      const camera = get().camera as PerspectiveCamera;
      const rect = dom.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      return pickTerrain({
        x: ((clientX - rect.left) / rect.width) * 2 - 1,
        y: 1 - ((clientY - rect.top) / rect.height) * 2,
      }, camera, TERRAIN.height);
    };

    const moveDraft = (event: PointerEvent, pressing = false) => {
      const draft = usePlacementDraft.getState();
      if (draft.review) return;
      const camera = get().camera as PerspectiveCamera;
      const rect = dom.getBoundingClientRect();
      const raw = pick(event.clientX, event.clientY);
      if (!raw) return;

      if (draft.kind === "trail") {
        screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        brushState.x = raw.x;
        brushState.z = raw.z;
        brushState.visible = true;
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
        const game = useGameStore.getState();
        if (pressing) {
          const press = liftPress(game, draft.type, draft, raw, radius, LIFT_BUILD_ANCHORS);
          grab = press.grab;
          offset = press.offset;
          usePlacementDraft.setState(press.patch);
        } else {
          usePlacementDraft.setState(liftDrag(game, draft.type, grab, offset, draft, raw, radius, LIFT_BUILD_ANCHORS));
        }
      } else {
        usePlacementDraft.setState({ tapPoint: raw });
      }
    };

    const extendStroke = (raw: XZ) => {
      const draft = usePlacementDraft.getState();
      const stroke = draft.activeStroke;
      if (draft.kind !== "trail" || !stroke) return;
      const last = stroke.points.at(-1);
      if (last && (Math.hypot(last.x - raw.x, last.z - raw.z) < MIN_POINT_DISTANCE ||
        stroke.points.length >= MAX_STROKE_POINTS)) return;
      usePlacementDraft.setState({ tapPoint: raw, activeStroke: { ...stroke, points: [...stroke.points, raw] } });
    };

    /** While a stroke is down and the brush is near a screen edge, slide the map under it. */
    const panStep = (now: number) => {
      panFrame = requestAnimationFrame(panStep);
      const dt = Math.min(0.05, Math.max(0, (now - panLast) / 1000));
      panLast = now;
      const controls = get().controls as OrbitControlsImpl | null;
      const rect = dom.getBoundingClientRect();
      const painting = !blocked && screen && usePlacementDraft.getState().activeStroke;
      if (!controls || !painting || !screen || !rect.width || !rect.height) {
        panVelocity.x = 0;
        panVelocity.z = 0;
        return;
      }
      const camera = get().camera as PerspectiveCamera;
      const e = camera.matrixWorld.elements;
      const flat = (x: number, z: number) => {
        const len = Math.hypot(x, z) || 1;
        return { x: x / len, z: z / len };
      };
      const input = edgePanInput(screen.x, screen.y, rect.width, rect.height);
      const want = edgePanVelocity(input, flat(e[0], e[2]), flat(-e[8], -e[10]),
        camera.position.distanceTo(controls.target));
      const k = reduced.current ? 1 : 1 - Math.exp(-dt / PAN_TAU);
      panVelocity.x += (want.x - panVelocity.x) * k;
      panVelocity.z += (want.z - panVelocity.z) * k;
      const dx = panVelocity.x * dt;
      const dz = panVelocity.z * dt;
      if (Math.abs(dx) + Math.abs(dz) < 1e-5) return;
      // The camera rig soft-clamps the target to the play area on its next frame.
      camera.position.x += dx;
      camera.position.z += dz;
      controls.target.x += dx;
      controls.target.z += dz;
      controls.update();
      camera.updateMatrixWorld();
      const raw = pick(screen.x + rect.left, screen.y + rect.top);
      if (raw) {
        brushState.x = raw.x;
        brushState.z = raw.z;
        extendStroke(raw);
      }
    };
    const startPan = () => {
      cancelAnimationFrame(panFrame);
      panLast = performance.now();
      panFrame = requestAnimationFrame(panStep);
    };
    const stopPan = () => {
      cancelAnimationFrame(panFrame);
      panVelocity.x = 0;
      panVelocity.z = 0;
      screen = null;
    };

    const onDown = (event: PointerEvent) => {
      const draft = usePlacementDraft.getState();
      if (event.button !== 0 || draft.review) return;
      pointers.add(event.pointerId);
      if (pointers.size > 1) {
        blocked = true;
        stopPan();
        if (draft.kind === "trail") brushState.visible = false;
        if (gesture) usePlacementDraft.setState({ ...gesture, activeStroke: null });
        return;
      }
      moved = false;
      gesture = { top: draft.top, bottom: draft.bottom, tapPoint: draft.tapPoint, snapped: draft.snapped };
      dom.setPointerCapture(event.pointerId);
      moveDraft(event, true);
      if (draft.kind === "trail") startPan();
    };

    const onMove = (event: PointerEvent) => {
      if (pointers.has(event.pointerId) && !blocked) {
        moved = true;
        moveDraft(event);
      } else if (pointers.size === 0 && event.pointerType !== "touch" && event.buttons === 0) {
        // A mouse previews the brush on hover.
        const draft = usePlacementDraft.getState();
        if (draft.kind !== "trail" || draft.review) return;
        const raw = pick(event.clientX, event.clientY);
        if (!raw) return;
        brushState.x = raw.x;
        brushState.z = raw.z;
        brushState.visible = true;
      }
    };

    const onLeave = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && pointers.size === 0) brushState.visible = false;
    };

    const onUp = (event: PointerEvent) => {
      if (!pointers.delete(event.pointerId)) return;
      if (pointers.size > 0) return;
      stopPan();
      if (!blocked) {
        // Only a real drag re-solves the draft; a press and release leaves it as the press made it.
        if (moved) moveDraft(event);
        const draft = usePlacementDraft.getState();
        if (draft.kind === "trail") {
          const stroke = draft.activeStroke;
          usePlacementDraft.setState({
            activeStroke: null,
            ...(stroke && stroke.points.length > 1 ? { strokes: [...draft.strokes, stroke], redo: [] } : {}),
          });
        }
      }
      // A finger has no hover, so the brush goes with it. A mouse or pen keeps its hover preview.
      if (event.pointerType === "touch") brushState.visible = false;
      gesture = null;
      blocked = false;
      moved = false;
      grab = "new-top";
    };

    const onCancel = (event: PointerEvent) => {
      if (!pointers.delete(event.pointerId)) return;
      stopPan();
      brushState.visible = false;
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
    dom.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      stopPan();
      brushState.visible = false;
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointermove", onMove);
      dom.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [active, dom, get, reduced]);

  return null;
}
