"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { REFERENCE_TOPS, checkLiftLine, type LiftAnchor } from "@/game/descent";
import { decodeSnowKey, snowKey } from "@/game/snow";
import { TERRAIN } from "@/game/terrain";
import { useGameStore } from "@/game/store";
import type { LiftType } from "@/game/types";
import { useCameraUi } from "@/ui/cameraUi";
import { usePlacementDraft } from "@/ui/placementDraft";
import { Atmosphere } from "./Atmosphere";
import { cameraPosition, framingAspect, homeAzimuth, homeView, isPortraitAspect } from "./cameraFraming";
import {
  FOCUS_DISTANCE,
  GLIDE_MAX_FRAMES,
  MAX_DISTANCE,
  MIN_DISTANCE,
  PLAY_AREA,
  TARGET_Y_MAX,
  classifyPointer,
  clampTarget,
  exceedsTapSlop,
  insideArea,
  marchToTerrain,
  type PointerEv,
  type TapRecord,
} from "./cameraControls";
import { Guests, type FollowedRef } from "./Guests";
import type { GuestPlacement } from "./guestPlacement";
import { Lift } from "./Lift";
import { Village } from "./Lodge";
import { SnowGuns } from "./SnowGuns";
import { Road, Terrain } from "./Terrain";
import { TrailRibbon } from "./TrailRibbon";
import { sceneCameraTarget } from "./sceneCamera";
import { Trees } from "./Trees";
import { ArrivalArea } from "./Vehicles";
import { useCameraKeys } from "./useCameraKeys";

/** Tilt (elevation above the horizon) and orbit limits, and the closest zoom. */
const MIN_ELEVATION = 0.35;
const MAX_ELEVATION = 1.25;
const AZIMUTH_RANGE = 1.4;

const FALLBACK_ANCHOR: LiftAnchor = REFERENCE_TOPS[0] ?? { x: -1.2, z: 0.2 };
const GOAL = new THREE.Vector3();
const AWAY = new THREE.Vector3();
const RAY = new THREE.Raycaster();

/** Frames the hill on mount / rotation, follows the followed guest, then eases home. */
function CameraRig({
  followId,
  followedRef,
}: {
  followId: string | null;
  followedRef: FollowedRef;
}) {
  const controls = useThree((s) => s.controls as OrbitControlsImpl | undefined);
  const get = useThree((s) => s.get);
  const dom = useThree((s) => s.gl.domElement);
  // Floored to the 0.05 framing bucket (see framingAspect): a phone browser's
  // collapsing toolbar stays in one bucket and does not reset the camera, and
  // the view is framed for an aspect no wider than the real one.
  const aspect = useThree((s) => framingAspect(s.size.width / Math.max(1, s.size.height)));
  // The framed home view for this aspect; the follow camera eases back to its target.
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
  const wasFollowing = useRef(false);
  // A pan drag ended follow on purpose: do not ease back to the home view.
  const suppressReturn = useRef(false);
  // True once the user has orbited, panned or zoomed since the home view was applied.
  const userMoved = useRef(false);
  const appliedPortrait = useRef<boolean | null>(null);
  const interacting = useRef(false);
  // Unclamped target, so the soft clamp resists without compounding frame to frame.
  const raw = useRef(new THREE.Vector3());
  const applied = useRef(new THREE.Vector3());
  const rawReady = useRef(false);
  // A camera glide (double-tap focus, recenter, F): target and camera position goals.
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
  useCameraKeys({
    onFocus: focus,
    onHome: goHome,
    onUserMoved: () => {
      userMoved.current = true;
    },
  });

  // Pan drag ends follow (the chip offers to resume); zoom and rotate keep following.
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
      glide.current = null;
      returning.current = false;
    };
    const onEnd = () => {
      interacting.current = false;
    };
    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);
    return () => {
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
    };
  }, [controls]);

  // Gestures beside OrbitControls: a one-finger drag ends follow, a double-tap focuses.
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
      const kind = classifyPointer(events, prevTap);
      prevTap = kind === "TAP" ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null;
      events = [];
      panEnded = false;
      if (kind !== "DOUBLE_TAP") return;
      const rect = dom.getBoundingClientRect();
      RAY.setFromCamera(
        new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1),
        get().camera,
      );
      const hit = marchToTerrain(RAY.ray.origin, RAY.ray.direction, TERRAIN.height);
      if (!hit) return;
      endFollow();
      userMoved.current = true;
      const snapped = insideArea(hit, PLAY_AREA);
      glideTo(new THREE.Vector3(snapped.x, TERRAIN.height(snapped.x, snapped.z), snapped.z), FOCUS_DISTANCE);
    };
    const onDown = (e: PointerEvent) => {
      if (active.size === 0) {
        events = [];
        panEnded = false;
      }
      active.add(e.pointerId);
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
  }, [controls, dom, get, endFollow, glideTo]);

  // The recenter button glides to the home view.
  const recenterNonce = useCameraUi((s) => s.recenterNonce);
  const seenNonce = useRef(recenterNonce);
  useEffect(() => {
    if (seenNonce.current === recenterNonce) return;
    seenNonce.current = recenterNonce;
    userMoved.current = false;
    goHome();
  }, [recenterNonce, goHome]);

  // Re-home on first mount and on a portrait/landscape flip; for a resize
  // within a mode, only while the user has not moved the camera.
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
    if (followId) {
      useCameraUi.setState({ resumeFollowId: null });
    } else if (suppressReturn.current) {
      suppressReturn.current = false;
    } else {
      returning.current = true;
    }
  }, [followId]);

  useFrame(() => {
    if (!controls) return;
    const cam = get().camera;
    let moved = false;
    const g = glide.current;
    if (g) {
      controls.target.lerp(g.target, 0.14);
      cam.position.lerp(g.position, 0.14);
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
    const pos = useGameStore.getState().followId ? followedRef.current : null;
    if (pos) {
      if (glide.current) glide.current = null;
      wasFollowing.current = true;
      GOAL.set(pos.x, pos.y + 0.35, pos.z);
      controls.target.lerp(GOAL, 0.12);
      moved = true;
    } else {
      // The followed guest left the hill: ease back to the default view.
      if (wasFollowing.current) returning.current = !suppressReturn.current;
      wasFollowing.current = false;
      if (returning.current) {
        controls.target.lerp(home.target, 0.08);
        if (controls.target.distanceTo(home.target) < 0.02) returning.current = false;
        moved = true;
      }
    }

    // Soft clamp on the unclamped target; after release it eases back inside the area.
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
    if (!interacting.current) {
      const inside = insideArea(r, PLAY_AREA);
      r.x += (inside.x - r.x) * 0.1;
      r.z += (inside.z - r.z) * 0.1;
    }
    r.y = Math.min(TARGET_Y_MAX, Math.max(0, r.y));
    const c = clampTarget(r, PLAY_AREA);
    GOAL.set(c.x, r.y, c.z).sub(controls.target);
    if (GOAL.lengthSq() > 1e-10) {
      // Shift the camera with the target so the view slides rather than re-aims.
      cam.position.add(GOAL);
      controls.target.add(GOAL);
      moved = true;
    }
    applied.current.copy(controls.target);
    sceneCameraTarget.x = controls.target.x;
    sceneCameraTarget.z = controls.target.z;
    if (moved) controls.update();
  });

  return null;
}

export function MountainScene() {
  const followId = useGameStore((s) => s.followId);
  const guests = useGameStore((s) => s.guests);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const snowQuality = useGameStore((s) => s.snowQuality);
  const snowDepth = useGameStore((s) => s.snowDepth);
  const lifts = useGameStore((s) => s.lifts);
  const buildMode = useGameStore((s) => s.buildMode);
  const candidateTop = usePlacementDraft((s) => s.candidateTop);
  const selectedLiftType = useGameStore((s) => s.selectedLiftType);
  const buildings = useGameStore((s) => s.buildings);
  const gunsVisible = useGameStore((s) => s.gunsVisible);
  const gunReach = useGameStore((s) => s.gunReach);
  // Snapped trail snow: changes only when the look does, so the terrain repaints rarely.
  const trailKey = useGameStore((s) => snowKey(s.lifts));
  const trails = useMemo(() => decodeSnowKey(trailKey), [trailKey]);
  const groomVisible = useGameStore((s) => s.groomVisible);
  // Orbit stays within about a quarter turn either side of the home heading.
  const azimuth = useThree((s) => homeAzimuth(s.size.width / Math.max(1, s.size.height)));

  // Placements of the followed guest, shared between <Guests> and the camera.
  const followedRef = useRef<GuestPlacement | null>(null);

  const confirmedLifts = useMemo(() => lifts.filter((l) => l.confirmed), [lifts]);
  const primaryAnchor = confirmedLifts[0]?.anchor ?? FALLBACK_ANCHOR;
  const guestLifts = useMemo(
    () =>
      lifts.length > 0
        ? lifts
        : [{ anchor: FALLBACK_ANCHOR, type: "surface" as LiftType }],
    [lifts],
  );
  const previewSlot = candidateTop ?? REFERENCE_TOPS[0];
  const previewValid = previewSlot
    ? checkLiftLine({ bottom: TERRAIN.base, top: previewSlot }).ok
    : false;
  const showPreview = buildMode && !!previewSlot;

  const clearings = useMemo(() => {
    const list: LiftAnchor[] = confirmedLifts.map((l) => l.anchor);
    if (confirmedLifts.length === 0) list.push(primaryAnchor);
    if (showPreview && previewValid) list.push(previewSlot);
    return list;
  }, [confirmedLifts, primaryAnchor, showPreview, previewValid, previewSlot]);

  useFrame((_, delta) => {
    useGameStore.getState().tick(delta * 1000);
  });

  const terrainSnow = Math.min(1, snowQuality * 0.75 + snowDepth * 0.25);

  return (
    <>
      <Atmosphere />
      <Terrain
        snowQuality={terrainSnow}
        snowDepth={snowDepth}
        trails={trails}
        anchors={confirmedLifts.map((l) => l.anchor)}
      />
      <Road />
      {/* Kit (GLB) content; models are preloaded, so this resolves on first load. */}
      <Suspense fallback={null}>
        <Village buildings={buildings} />
        <ArrivalArea guests={guests} dayIndex={dayIndex} />
        {(gunsVisible || buildings.includes("snow_guns")) && (
          <SnowGuns reach={gunReach} anchor={primaryAnchor} />
        )}
        <Trees anchors={clearings} />

        {confirmedLifts.map((lift, i) => (
          <group key={`lift-${i}-${lift.type}-${lift.anchor.x}-${lift.anchor.z}`}>
            <TrailRibbon
              kind="built"
              anchor={lift.anchor}
              groomed={groomVisible}
              trail={trails[i] ?? trails[0]}
            />
            <Lift anchor={lift.anchor} previewInvalid={false} type={lift.type} />
          </group>
        ))}

        {showPreview && (
          <>
            <TrailRibbon kind="preview" anchor={previewSlot} valid={previewValid} />
            <Lift
              anchor={previewSlot}
              preview
              previewInvalid={!previewValid}
              type={selectedLiftType}
            />
          </>
        )}

        <Guests lifts={guestLifts} followedRef={followedRef} />
      </Suspense>
      <CameraRig followId={followId} followedRef={followedRef} />
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        enableDamping
        dampingFactor={0.08}
        screenSpacePanning={false}
        zoomToCursor
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
        minAzimuthAngle={azimuth - AZIMUTH_RANGE}
        maxAzimuthAngle={azimuth + AZIMUTH_RANGE}
        minDistance={MIN_DISTANCE}
        maxDistance={MAX_DISTANCE}
        minPolarAngle={Math.PI / 2 - MAX_ELEVATION}
        maxPolarAngle={Math.PI / 2 - MIN_ELEVATION}
      />
    </>
  );
}
