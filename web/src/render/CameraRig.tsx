"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { OrbitControlsImpl } from "./orbitControlsType";
import * as THREE from "three";
import type { AssetTarget } from "@/game/assetNames";
import { TERRAIN } from "@/game/terrain";
import { useGameStore } from "@/game/store";
import { useCameraUi } from "@/ui/cameraUi";
import { motionPref } from "@/ui/motion";
import { usePlacementDraft } from "@/ui/placementDraft";
import { currentLayer } from "@/ui/overlayUi";
import { pickSceneAsset } from "./assetPick";
import {
  cameraPosition,
  frameView,
  type SafeRect,
  framingAspect,
  homeView,
  isPortraitAspect,
} from "./cameraFraming";
import {
  FOCUS_DISTANCE,
  GLIDE_MAX_FRAMES,
  TARGET_Y_MAX,
  classifyPointer,
  clampToLease,
  elevationOf,
  exceedsTapSlop,
  insideLease,
  marchToTerrain,
  paintTiltElevation,
  withElevation,
  type PointerEv,
  type TapRecord,
} from "./cameraControls";
import type { FollowedRef } from "./Guests";
import { LIFT_TERMINAL_H } from "./layout";
import { sceneCameraTarget } from "./sceneCamera";
import { cameraBus } from "./cameraBus";
import { cameraDebug, cameraDebugEnabled, inferLockReason, ORBIT_PAN_STATES } from "./cameraDebug";
import { useCameraKeys } from "./useCameraKeys";
import { useReducedMotion } from "./useReducedMotion";

function orbitControlState(controls: OrbitControlsImpl): number | null {
  const state = (controls as OrbitControlsImpl & { state?: number }).state;
  return typeof state === "number" ? state : null;
}

/** Length of the paint tilt, in milliseconds. */
const TILT_MS = 320;
const GOAL = new THREE.Vector3();
const AWAY = new THREE.Vector3();
const RAY = new THREE.Raycaster();

/** Frames the hill on mount / rotation, follows the followed guest, then eases home. */
export function CameraRig({
  followId,
  followedRef,
  onInspectAsset,
}: {
  followId: string | null;
  followedRef: FollowedRef;
  onInspectAsset?: (target: AssetTarget) => void;
}) {
  const controls = useThree((s) => s.controls as OrbitControlsImpl | undefined);
  const get = useThree((s) => s.get);
  const dom = useThree((s) => s.gl.domElement);
  const aspect = useThree((s) => framingAspect(s.size.width / Math.max(1, s.size.height)));
  const home = useMemo(() => {
    const v = homeView(aspect);
    const p = cameraPosition(v.target, v.distance, v.azimuth, v.elevation);
    return {
      fov: v.fov,
      portrait: isPortraitAspect(aspect),
      target: new THREE.Vector3(v.target.x, v.target.y, v.target.z),
      position: new THREE.Vector3(p.x, p.y, p.z),
    };
  }, [aspect]);
  const returning = useRef(false);
  const prevFollowId = useRef<string | null>(null);
  const wasFollowing = useRef(false);
  const suppressReturn = useRef(false);
  const userMoved = useRef(false);
  const appliedPortrait = useRef<boolean | null>(null);
  const interacting = useRef(false);
  /** After a drag ends, orbit damping can still move the camera — pause follow/return until it settles. */
  const orbitSettlingUntil = useRef(0);
  const ORBIT_SETTLE_MS = 450;
  const raw = useRef(new THREE.Vector3());
  const applied = useRef(new THREE.Vector3());
  const rawReady = useRef(false);
  const glide = useRef<{ target: THREE.Vector3; position: THREE.Vector3 } | null>(null);
  const glideFrames = useRef(0);

  const glideTo = useCallback(
    (target: THREE.Vector3, distance?: number) => {
      if (!controls) return;
      const cam = get().camera;
      AWAY.copy(cam.position).sub(controls.target);
      const dist = Math.min(distance ?? Infinity, AWAY.length());
      glideFrames.current = 0;
      glide.current = {
        target: target.clone(),
        position: target.clone().add(AWAY.setLength(dist)),
      };
    },
    [controls, get],
  );
  const goHome = useCallback(() => {
    glide.current = { target: home.target.clone(), position: home.position.clone() };
  }, [home]);
  const focus = useCallback(() => {
    const pos = followedRef.current;
    if (pos) glideTo(new THREE.Vector3(pos.x, pos.y + 0.35, pos.z), FOCUS_DISTANCE);
    else goHome();
  }, [followedRef, glideTo, goHome]);
  const clearAutomatedMotion = useCallback(() => {
    returning.current = false;
    glide.current = null;
    cameraBus.cancelMotion?.();
    cameraDebug.push("userOverride");
  }, []);

  useCameraKeys({
    onFocus: focus,
    onHome: goHome,
    onUserMoved: () => {
      userMoved.current = true;
      clearAutomatedMotion();
    },
  });

  const endFollow = useCallback(() => {
    const id = useGameStore.getState().followId;
    if (!id) return;
    useCameraUi.setState({ resumeFollowId: id });
    suppressReturn.current = true;
    wasFollowing.current = false;
    returning.current = false;
    useGameStore.getState().setFollowId(null);
  }, []);

  useEffect(() => {
    if (!controls) return;
    const onStart = () => {
      userMoved.current = true;
      interacting.current = true;
      orbitSettlingUntil.current = 0;
      glide.current = null;
      cameraBus.cancelMotion?.();
      returning.current = false;
      const state = orbitControlState(controls);
      if (state !== null && ORBIT_PAN_STATES.has(state) && useGameStore.getState().followId) {
        endFollow();
        cameraDebug.push("panStartEndFollow");
      }
    };
    const onEnd = () => {
      interacting.current = false;
      orbitSettlingUntil.current = performance.now() + ORBIT_SETTLE_MS;
    };
    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);
    return () => {
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
    };
  }, [controls, endFollow]);

  useEffect(() => {
    if (!controls) return;
    let events: PointerEv[] = [];
    const active = new Set<number>();
    let panEnded = false;
    let prevTap: TapRecord | null = null;
    const push = (e: PointerEvent, type: PointerEv["type"]) =>
      events.push({ id: e.pointerId, type, x: e.clientX, y: e.clientY, t: e.timeStamp });
    const finishGesture = (e: PointerEvent) => {
      if (!active.has(e.pointerId)) return;
      active.delete(e.pointerId);
      push(e, "up");
      if (active.size > 0) return;
      interacting.current = false;
      orbitSettlingUntil.current = performance.now() + ORBIT_SETTLE_MS;
      const kind = classifyPointer(events, prevTap);
      prevTap = kind === "TAP" ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null;
      events = [];
      panEnded = false;
      const { active: building, moveCamera } = usePlacementDraft.getState();
      if (building && !moveCamera) return;
      if (kind === "DRAG" || e.button !== 0) return;
      const state = useGameStore.getState();
      const inspect = onInspectAsset && !building && state.phase === "day";
      if (!inspect && kind !== "DOUBLE_TAP") return;
      const rect = dom.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const { camera, scene } = get();
      RAY.setFromCamera(
        new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1),
        camera,
      );
      const hit = marchToTerrain(RAY.ray.origin, RAY.ray.direction, TERRAIN.height);
      if (inspect) {
        const target = pickSceneAsset(scene, RAY, hit, state, !currentLayer());
        if (target) {
          prevTap = null;
          onInspectAsset(target);
          return;
        }
      }
      if (!hit || kind !== "DOUBLE_TAP") return;
      endFollow();
      userMoved.current = true;
      const snapped = insideLease(hit);
      glideTo(new THREE.Vector3(snapped.x, TERRAIN.height(snapped.x, snapped.z), snapped.z), FOCUS_DISTANCE);
    };
    const onDown = (e: PointerEvent) => {
      const { active: building, moveCamera } = usePlacementDraft.getState();
      if (e.button !== 0 || (building && !moveCamera)) return;
      if (active.size === 0) {
        events = [];
        panEnded = false;
      }
      active.add(e.pointerId);
      interacting.current = true;
      orbitSettlingUntil.current = 0;
      push(e, "down");
    };
    const onMove = (e: PointerEvent) => {
      if (!active.has(e.pointerId)) return;
      push(e, "move");
      const first = events[0];
      const rotates = e.ctrlKey || e.metaKey || e.shiftKey || (e.pointerType === "mouse" && e.buttons > 1);
      if (
        !panEnded &&
        !rotates &&
        active.size === 1 &&
        events.every((v) => v.id === e.pointerId) &&
        exceedsTapSlop(e.clientX - first.x, e.clientY - first.y)
      ) {
        panEnded = true;
        endFollow();
      }
    };
    const onUp = (e: PointerEvent) => finishGesture(e);
    const onCancel = (e: PointerEvent) => {
      active.delete(e.pointerId);
      events = [];
      panEnded = false;
      if (active.size === 0) {
        interacting.current = false;
        orbitSettlingUntil.current = performance.now() + ORBIT_SETTLE_MS;
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
  }, [controls, dom, get, endFollow, glideTo, onInspectAsset]);

  const recenterNonce = useCameraUi((s) => s.recenterNonce);
  const seenNonce = useRef(recenterNonce);
  useEffect(() => {
    if (seenNonce.current === recenterNonce) return;
    seenNonce.current = recenterNonce;
    userMoved.current = false;
    goHome();
  }, [recenterNonce, goHome]);

  const focusPoint = useCameraUi((s) => s.focusPoint);
  const seenFocusPoint = useRef(0);
  useEffect(() => {
    if (!focusPoint || focusPoint.nonce === seenFocusPoint.current) return;
    seenFocusPoint.current = focusPoint.nonce;
    if (motionPref.get()) return;
    const p = insideLease({ x: focusPoint.x, z: focusPoint.z });
    glideTo(new THREE.Vector3(p.x, TERRAIN.height(p.x, p.z) + LIFT_TERMINAL_H * 0.5, p.z), FOCUS_DISTANCE);
  }, [focusPoint, glideTo]);

  const placementFocus = usePlacementDraft((s) => s.focus);
  const seenFocus = useRef(0);
  useEffect(() => {
    if (!controls || !placementFocus || placementFocus.nonce === seenFocus.current) return;
    seenFocus.current = placementFocus.nonce;
    userMoved.current = true;
    const v = homeView(aspect);
    const world = placementFocus.points.map((p, i) => ({
      x: p.x,
      y: TERRAIN.height(p.x, p.z) + (i === 1 ? LIFT_TERMINAL_H : 0),
      z: p.z,
    }));
    if (world.length >= 2) {
      const a = world[0];
      const b = world[1];
      world.push({
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2 + LIFT_TERMINAL_H,
        z: (a.z + b.z) / 2,
      });
    }
    let yMin: number = v.safe.yMin;
    const sheet = document.querySelector("[data-build-sheet]");
    if (sheet) {
      const r = sheet.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      yMin = Math.max(-0.9, 1 - (2 * r.top) / vh);
    }
    const safe: SafeRect = {
      xMin: v.safe.xMin,
      xMax: v.safe.xMax,
      yMin,
      yMax: v.safe.yMax,
    };
    const framed = frameView({
      points: world,
      aspect,
      fov: v.fov,
      azimuth: v.azimuth,
      elevation: v.elevation,
      safe,
    });
    glideTo(
      new THREE.Vector3(framed.target.x, framed.target.y, framed.target.z),
      framed.distance,
    );
  }, [placementFocus, controls, aspect, glideTo]);

  const painting = usePlacementDraft((s) => s.active && s.kind === "trail");
  const savedElevation = useRef<number | null>(null);
  const tilt = useRef<{ from: number; to: number; start: number } | null>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    cameraBus.cancelMotion = () => {
      glide.current = null;
      tilt.current = null;
      cameraBus.settling = false;
    };
    return () => {
      cameraBus.cancelMotion = null;
      cameraBus.settling = false;
    };
  }, []);
  useEffect(() => {
    if (!controls) return;
    const cam = get().camera;
    const tiltTo = (elevation: number) => {
      const from = elevationOf(controls.target, cam.position);
      glide.current = null;
      if (reduced.current) {
        const position = withElevation(controls.target, cam.position, elevation);
        cam.position.set(position.x, position.y, position.z);
        controls.update();
        tilt.current = null;
        cameraBus.settling = false;
      } else {
        tilt.current = { from, to: elevation, start: performance.now() };
        cameraBus.settling = true;
      }
    };
    if (painting) {
      const current = elevationOf(controls.target, cam.position);
      const goal = paintTiltElevation(current);
      if (goal === null) return;
      savedElevation.current = current;
      userMoved.current = true;
      tiltTo(goal);
    } else if (savedElevation.current !== null) {
      const back = savedElevation.current;
      savedElevation.current = null;
      tiltTo(back);
    }
  }, [painting, controls, get, reduced]);

  useEffect(() => {
    if (!controls) return;
    const modeFlipped = appliedPortrait.current !== home.portrait;
    if (!modeFlipped && userMoved.current) return;
    appliedPortrait.current = home.portrait;
    userMoved.current = false;
    glide.current = null;
    const camera = get().camera as THREE.PerspectiveCamera;
    camera.fov = home.fov;
    camera.position.copy(home.position);
    camera.updateProjectionMatrix();
    controls.target.copy(home.target);
    controls.update();
    rawReady.current = false;
  }, [controls, get, home]);

  useEffect(() => {
    const prev = prevFollowId.current;
    prevFollowId.current = followId;
    if (followId) {
      useCameraUi.setState({ resumeFollowId: null });
      cameraDebug.push(`follow ${followId}`);
    } else if (suppressReturn.current) {
      suppressReturn.current = false;
      cameraDebug.push("followEndNoReturn");
    } else if (prev !== null) {
      returning.current = true;
      cameraDebug.push("returnHomeStart");
    }
  }, [followId]);

  useFrame(() => {
    if (!controls) return;
    const cam = get().camera;
    let moved = false;
    const turn = tilt.current;
    if (turn) {
      const t = Math.min(1, (performance.now() - turn.start) / TILT_MS);
      const eased = 1 - (1 - t) ** 3;
      const p = withElevation(controls.target, cam.position, turn.from + (turn.to - turn.from) * eased);
      cam.position.set(p.x, p.y, p.z);
      if (t >= 1) {
        tilt.current = null;
        cameraBus.settling = false;
      }
      moved = true;
    }
    const g = glide.current;
    if (g) {
      controls.target.lerp(g.target, reduced.current ? 1 : 0.14);
      cam.position.lerp(g.position, reduced.current ? 1 : 0.14);
      glideFrames.current += 1;
      if (
        glideFrames.current >= GLIDE_MAX_FRAMES ||
        (controls.target.distanceTo(g.target) < 0.02 && cam.position.distanceTo(g.position) < 0.05)
      ) {
        glide.current = null;
        glideFrames.current = 0;
      }
      moved = true;
    }
    const followActive = useGameStore.getState().followId;
    const userHoldsCamera =
      interacting.current || performance.now() < orbitSettlingUntil.current;
    const pos = followActive && !userHoldsCamera ? followedRef.current : null;
    if (pos) {
      if (glide.current) glide.current = null;
      wasFollowing.current = true;
      GOAL.set(pos.x, pos.y + 0.35, pos.z);
      if (reduced.current) {
        // Translate both ends of the camera ray together to preserve the viewing angle.
        cam.position.add(AWAY.copy(GOAL).sub(controls.target));
        controls.target.copy(GOAL);
      } else {
        controls.target.lerp(GOAL, 0.12);
      }
      moved = true;
    } else {
      if (wasFollowing.current) returning.current = !suppressReturn.current;
      wasFollowing.current = false;
      if (returning.current && !userHoldsCamera) {
        if (reduced.current) cam.position.add(AWAY.copy(home.target).sub(controls.target));
        controls.target.lerp(home.target, reduced.current ? 1 : 0.08);
        if (controls.target.distanceTo(home.target) < 0.02) returning.current = false;
        moved = true;
      }
    }

    if (!rawReady.current) {
      raw.current.copy(controls.target);
      applied.current.copy(controls.target);
      rawReady.current = true;
    }
    const r = raw.current;
    if (!Number.isFinite(r.x) || !Number.isFinite(r.y) || !Number.isFinite(r.z)) {
      rawReady.current = false;
      r.copy(controls.target);
      applied.current.copy(controls.target);
    }
    r.add(GOAL.copy(controls.target).sub(applied.current));
    if (!userHoldsCamera) {
      const inside = insideLease(r);
      r.x += (inside.x - r.x) * 0.1;
      r.z += (inside.z - r.z) * 0.1;
    }
    r.y = Math.min(TARGET_Y_MAX, Math.max(0, r.y));
    const c = clampToLease(r);
    GOAL.set(c.x, r.y, c.z).sub(controls.target);
    if (GOAL.lengthSq() > 1e-10) {
      cam.position.add(GOAL);
      controls.target.add(GOAL);
      moved = true;
    }
    applied.current.copy(controls.target);
    sceneCameraTarget.x = controls.target.x;
    sceneCameraTarget.z = controls.target.z;
    if (moved) controls.update();

    if (cameraDebugEnabled()) {
      const draft = usePlacementDraft.getState();
      cameraDebug.patch({
        followId: followActive,
        returning: returning.current,
        interacting: interacting.current,
        glide: !!glide.current,
        tilt: !!tilt.current,
        building: draft.active,
        moveCamera: draft.moveCamera,
        targetDistFromHome: controls.target.distanceTo(home.target),
        orbitState: orbitControlState(controls),
        lockReason: inferLockReason({
          followId: followActive,
          returning: returning.current,
          glide: !!glide.current,
          tilt: !!tilt.current,
          building: draft.active,
          moveCamera: draft.moveCamera,
          interacting: userHoldsCamera,
        }),
      });
    }
  });

  return null;
}
