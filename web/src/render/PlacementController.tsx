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
import { cameraBus } from "./cameraBus";
import { limitShift } from "./cameraControls";
import { MAX_STROKE_POINTS, PAN_MOVE_PX, edgePanInput, edgePanVelocity, panDrive, usableHeight } from "./paintAssist";
import { pickTerrain } from "./terrainPick";
import { useReducedMotion } from "./useReducedMotion";
import { LIFT_BUILD_ANCHORS, snapRadiusAtHit } from "./placementTap";

const MIN_POINT_DISTANCE = 0.1;
/** Time constant of the auto-pan velocity ramp, in seconds. Reduced motion skips the ramp. */
const PAN_TAU = 0.12;
/** How often the canvas and panel rectangles are re-measured while a stroke is down. */
const LAYOUT_MS = 200;

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

    // Stroke points wait here and reach the store at most once per animation frame.
    const pending: XZ[] = [];
    let full = false;
    // Last screen position of the painting finger, for edge auto-pan between pointer events.
    const screen = { x: 0, y: 0, down: false, movedAt: 0 };
    let panFrame = 0;
    let panLast = 0;
    const panVelocity = { x: 0, z: 0 };
    const input = { x: 0, z: 0 };
    const want = { x: 0, z: 0 };
    const right = { x: 0, z: 0 };
    const forward = { x: 0, z: 0 };
    const layout = { at: -Infinity, left: 0, top: 0, width: 0, height: 0, usable: 0 };

    const measure = (now: number) => {
      if (now - layout.at < LAYOUT_MS) return;
      layout.at = now;
      const rect = dom.getBoundingClientRect();
      const panel = document.querySelector("[data-placement-kind]");
      layout.left = rect.left;
      layout.top = rect.top;
      layout.width = rect.width;
      layout.height = rect.height;
      layout.usable = usableHeight(rect.top, rect.height, panel ? panel.getBoundingClientRect().top : null);
    };

    const pick = (clientX: number, clientY: number) => {
      const rect = dom.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      return pickTerrain({
        x: ((clientX - rect.left) / rect.width) * 2 - 1,
        y: 1 - ((clientY - rect.top) / rect.height) * 2,
      }, get().camera as PerspectiveCamera, TERRAIN.height);
    };

    const flush = () => {
      if (!pending.length) return;
      const draft = usePlacementDraft.getState();
      if (draft.kind !== "trail") {
        pending.length = 0;
        return;
      }
      const stroke: PaintStroke = draft.activeStroke ?? {
        points: [], widthFt: draft.brushWidth, erase: draft.erasing,
      };
      usePlacementDraft.setState({
        tapPoint: pending[pending.length - 1],
        activeStroke: { ...stroke, points: [...stroke.points, ...pending] },
      });
      pending.length = 0;
    };

    /** Queue a stroke point; at the cap it stops taking points and says why once. */
    const queuePoint = (raw: XZ, immediate: boolean) => {
      const stroke = usePlacementDraft.getState().activeStroke;
      const last = pending.length ? pending[pending.length - 1] : stroke?.points.at(-1);
      const count = (stroke?.points.length ?? 0) + pending.length;
      if (count >= MAX_STROKE_POINTS) {
        if (!full) {
          full = true;
          usePlacementDraft.setState({ strokeFull: true });
        }
        return;
      }
      if (last && Math.hypot(last.x - raw.x, last.z - raw.z) < MIN_POINT_DISTANCE) return;
      pending.push(raw);
      if (immediate) flush();
    };

    const moveDraft = (event: PointerEvent, pressing = false) => {
      const draft = usePlacementDraft.getState();
      if (draft.review) return;
      const raw = pick(event.clientX, event.clientY);
      if (!raw) return;

      if (draft.kind === "trail") {
        const rect = dom.getBoundingClientRect();
        const sx = event.clientX - rect.left;
        const sy = event.clientY - rect.top;
        if (pressing || !screen.down || Math.hypot(sx - screen.x, sy - screen.y) >= PAN_MOVE_PX) {
          screen.movedAt = performance.now();
        }
        screen.x = sx;
        screen.y = sy;
        screen.down = true;
        brushState.x = raw.x;
        brushState.z = raw.z;
        brushState.visible = true;
        queuePoint(raw, pressing);
      } else if (draft.kind === "lift") {
        const camera = get().camera as PerspectiveCamera;
        const rect = dom.getBoundingClientRect();
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

    /**
     * One animation frame while a stroke is down: write the queued points, and when the brush is
     * near a screen edge (above the panel at the bottom) slide the map under it.
     */
    const panStep = (now: number) => {
      panFrame = requestAnimationFrame(panStep);
      const dt = Math.min(0.05, Math.max(0, (now - panLast) / 1000));
      panLast = now;
      flush();
      const controls = get().controls as OrbitControlsImpl | null;
      if (!controls || blocked || !screen.down || full || !usePlacementDraft.getState().activeStroke) {
        panVelocity.x = 0;
        panVelocity.z = 0;
        return;
      }
      measure(now);
      if (!layout.width || !layout.height) return;
      const camera = get().camera as PerspectiveCamera;
      const e = camera.matrixWorld.elements;
      const rl = Math.hypot(e[0], e[2]) || 1;
      right.x = e[0] / rl;
      right.z = e[2] / rl;
      const fl = Math.hypot(e[8], e[10]) || 1;
      forward.x = -e[8] / fl;
      forward.z = -e[10] / fl;
      edgePanInput(screen.x, screen.y, layout.width, layout.usable, undefined, input);
      edgePanVelocity(input, right, forward, camera.position.distanceTo(controls.target), undefined, want);
      // A finger resting at the edge stops the map; only a moving one keeps it sliding.
      const drive = panDrive(now - screen.movedAt);
      want.x *= drive;
      want.z *= drive;
      const k = reduced.current ? 1 : 1 - Math.exp(-dt / PAN_TAU);
      panVelocity.x += (want.x - panVelocity.x) * k;
      panVelocity.z += (want.z - panVelocity.z) * k;
      if (Math.abs(panVelocity.x * dt) + Math.abs(panVelocity.z * dt) < 1e-5) return;
      // The shift is limited to the lease so the target never leaves it, even for a frame.
      const shift = limitShift(controls.target, panVelocity.x * dt, panVelocity.z * dt);
      const dx = shift.x;
      const dz = shift.z;
      if (Math.abs(dx) + Math.abs(dz) < 1e-5) return;
      // A tilt or glide in flight would fight the pan, so it stops here.
      cameraBus.cancelMotion?.();
      // The camera rig also clamps the target to the lease on its next frame.
      camera.position.x += dx;
      camera.position.z += dz;
      controls.target.x += dx;
      controls.target.z += dz;
      controls.update();
      camera.updateMatrixWorld();
      const raw = pick(screen.x + layout.left, screen.y + layout.top);
      if (raw) {
        brushState.x = raw.x;
        brushState.z = raw.z;
        queuePoint(raw, false);
      }
    };
    const startPan = () => {
      cancelAnimationFrame(panFrame);
      layout.at = -Infinity;
      panLast = performance.now();
      panFrame = requestAnimationFrame(panStep);
    };
    const stopPan = () => {
      cancelAnimationFrame(panFrame);
      panVelocity.x = 0;
      panVelocity.z = 0;
      screen.down = false;
    };
    const endStroke = () => {
      stopPan();
      pending.length = 0;
      if (full) usePlacementDraft.setState({ strokeFull: false });
      full = false;
    };

    const onDown = (event: PointerEvent) => {
      const draft = usePlacementDraft.getState();
      if (event.button !== 0 || draft.review) return;
      // The paint tilt takes a moment; a press during it would land on a moving map.
      if (draft.kind === "trail" && cameraBus.settling) return;
      pointers.add(event.pointerId);
      if (pointers.size > 1) {
        blocked = true;
        endStroke();
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
      } else if (pointers.size === 0 && event.pointerType !== "touch") {
        const draft = usePlacementDraft.getState();
        if (draft.kind !== "trail" || draft.review) return;
        if (event.buttons !== 0) {
          // An orbit or right-button drag: the brush returns on the next plain hover.
          brushState.visible = false;
          return;
        }
        // A mouse previews the brush on hover.
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
      if (!blocked) {
        // Only a real drag re-solves the draft; a press and release leaves it as the press made it.
        if (moved) moveDraft(event);
        flush();
        const draft = usePlacementDraft.getState();
        if (draft.kind === "trail") {
          const stroke = draft.activeStroke;
          usePlacementDraft.setState({
            activeStroke: null,
            ...(stroke && stroke.points.length > 1 ? { strokes: [...draft.strokes, stroke], redo: [] } : {}),
          });
        }
      }
      endStroke();
      // A finger has no hover, so the brush goes with it. A mouse or pen keeps its hover preview.
      if (event.pointerType === "touch") brushState.visible = false;
      gesture = null;
      blocked = false;
      moved = false;
      grab = "new-top";
    };

    const onCancel = (event: PointerEvent) => {
      if (!pointers.delete(event.pointerId)) return;
      endStroke();
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
      endStroke();
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
