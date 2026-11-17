"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { REFERENCE_TOPS, checkLiftLine, type LiftAnchor } from "@/game/descent";
import { decodeSnowKey, snowKey } from "@/game/snow";
import { TERRAIN } from "@/game/terrain";
import { useGameStore } from "@/game/store";
import type { LiftType } from "@/game/types";
import { usePlacementDraft } from "@/ui/placementDraft";
import { Atmosphere } from "./Atmosphere";
import { cameraPosition, framingAspect, homeView, isPortraitAspect } from "./cameraFraming";
import { Guests, type FollowedRef } from "./Guests";
import type { GuestPlacement } from "./guestPlacement";
import { Lift } from "./Lift";
import { Village } from "./Lodge";
import { SnowGuns } from "./SnowGuns";
import { Road, Terrain } from "./Terrain";
import { TrailRibbon } from "./TrailRibbon";
import { Trees } from "./Trees";

/** Pan limits for the orbit target: the play area around the base, not the fogged edges. */
const { xMin, xMax, zMin, zMax } = TERRAIN.bounds;
const TARGET_MIN = new THREE.Vector3(xMin * 0.25, 0, zMin * 0.25);
const TARGET_MAX = new THREE.Vector3(xMax * 0.25, 5, zMax * 0.25);

const FALLBACK_ANCHOR: LiftAnchor = REFERENCE_TOPS[0] ?? { x: -1.2, z: 0.2 };
const GOAL = new THREE.Vector3();

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
  // True once the user has orbited, panned or zoomed since the home view was applied.
  const userMoved = useRef(false);
  const appliedPortrait = useRef<boolean | null>(null);

  useEffect(() => {
    if (!controls) return;
    const onStart = () => {
      userMoved.current = true;
    };
    controls.addEventListener("start", onStart);
    return () => controls.removeEventListener("start", onStart);
  }, [controls]);

  // Re-home on first mount and on a portrait/landscape flip; for a resize
  // within a mode, only while the user has not moved the camera.
  useEffect(() => {
    if (!controls) return;
    const modeFlipped = appliedPortrait.current !== home.portrait;
    if (!modeFlipped && userMoved.current) return;
    appliedPortrait.current = home.portrait;
    userMoved.current = false;
    const camera = get().camera as THREE.PerspectiveCamera;
    camera.fov = home.fov;
    camera.position.copy(home.position);
    camera.updateProjectionMatrix();
    controls.target.copy(home.target);
    controls.update();
  }, [controls, get, home]);

  useEffect(() => {
    if (!followId) returning.current = true;
  }, [followId]);

  useFrame(() => {
    if (!controls) return;
    const pos = followedRef.current;
    if (pos) {
      wasFollowing.current = true;
      GOAL.set(pos.x, pos.y + 0.35, pos.z);
      controls.target.lerp(GOAL, 0.12);
    } else {
      // The followed guest left the hill: ease back to the default view.
      if (wasFollowing.current) returning.current = true;
      wasFollowing.current = false;
      if (returning.current) {
        controls.target.lerp(home.target, 0.08);
        if (controls.target.distanceTo(home.target) < 0.02) returning.current = false;
      }
    }
    controls.target.clamp(TARGET_MIN, TARGET_MAX);
    controls.update();
  });

  return null;
}

export function MountainScene() {
  const followId = useGameStore((s) => s.followId);
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
        enableDamping
        dampingFactor={0.12}
        minDistance={5}
        maxDistance={34}
        minPolarAngle={0.3}
        maxPolarAngle={1.22}
        minAzimuthAngle={-1.15}
        maxAzimuthAngle={1.15}
      />
    </>
  );
}
