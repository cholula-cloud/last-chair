"use client";

import { MapOverlay } from "./MapOverlay";
import { BuildGrid } from "./BuildGrid";
import { LeaseBoundary } from "./LeaseBoundary";
import { CameraRig } from "./CameraRig";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { REFERENCE_TOPS, type LiftAnchor, type LiftLine } from "@/game/descent";
import { liftLineOf } from "@/game/rules";
import { decodeSnowKey, snowKey } from "@/game/snow";
import { snowCarriers, trailsOnLift } from "@/game/trails";
import { TERRAIN } from "@/game/terrain";
import { useGameStore } from "@/game/store";
import type { LiftType } from "@/game/types";
import { usePlacementDraft } from "@/ui/placementDraft";
import { PlacementController } from "./PlacementController";
import { scaledTickMs, useSpeed } from "@/ui/speed";

import { Atmosphere } from "./Atmosphere";
import { BuildScenePreview } from "./BuildScenePreview";
import { homeAzimuth } from "./cameraFraming";
import { MAX_DISTANCE, MIN_DISTANCE } from "./cameraControls";
import { Guests } from "./Guests";
import type { GuestPlacement } from "./guestPlacement";
import { Lift } from "./Lift";
import { Village } from "./Lodge";
import { SnowGuns } from "./SnowGuns";
import { RenderStats } from "./RenderStats";
import { Road, Terrain } from "./Terrain";
import { TrailSign } from "./TrailSign";
import { Trees } from "./Trees";
import { ArrivalArea } from "./Vehicles";

/** Tilt (elevation above the horizon) and orbit limits, and the closest zoom. */
const MIN_ELEVATION = 0.35;
const MAX_ELEVATION = 1.25;
const AZIMUTH_RANGE = 1.4;

const FALLBACK_ANCHOR: LiftAnchor = REFERENCE_TOPS[0] ?? { x: -1.2, z: 0.2 };

export function MountainScene({ coaching = false }: { coaching?: boolean }) {
  const speed = useSpeed((s) => s.speed);
  const followId = useGameStore((s) => s.followId);
  const guests = useGameStore((s) => s.guests);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const snowQuality = useGameStore((s) => s.snowQuality);
  const snowDepth = useGameStore((s) => s.snowDepth);
  const lifts = useGameStore((s) => s.lifts);
  const trailRuns = useGameStore((s) => s.trails);
  const usingBuildTool = usePlacementDraft((s) => s.active && !s.moveCamera);
  const trailKey = useGameStore((s) => snowKey(snowCarriers(s.trails)));
  const trailSnow = useMemo(() => decodeSnowKey(trailKey), [trailKey]);
  const canvas = useThree((s) => s.gl.domElement);
  const azimuth = useThree((s) => homeAzimuth(s.size.width / Math.max(1, s.size.height)));

  const followedRef = useRef<GuestPlacement | null>(null);

  const confirmedLifts = useMemo(() => lifts.filter((l) => l.confirmed), [lifts]);
  const primaryLine = useMemo(
    (): LiftLine =>
      confirmedLifts[0]
        ? liftLineOf(confirmedLifts[0])
        : { bottom: TERRAIN.base, top: FALLBACK_ANCHOR },
    [confirmedLifts],
  );
  const trailPaths = useMemo(
    () => trailRuns.map((t) => t.path),
    [trailRuns],
  );
  const guestLifts = useMemo(
    () =>
      lifts.length > 0
        ? lifts.map((l, i) => {
            const onLift = trailsOnLift(trailRuns, i);
            const path = onLift[0]?.trail.path ?? trailRuns[i]?.path;
            return { line: liftLineOf(l), type: l.type, path };
          })
        : [{ line: primaryLine, type: "surface" as LiftType, path: trailRuns[0]?.path }],
    [lifts, primaryLine, trailRuns],
  );
  const clearingLines = useMemo(
    () => confirmedLifts.map(liftLineOf),
    [confirmedLifts],
  );
  const forestPaths = useMemo(
    () => trailRuns.filter((run) => run.open && run.builtDay === undefined).map((run) => run.path),
    [trailRuns],
  );

  useFrame((_, delta) => {
    const game = useGameStore.getState();
    if (game.phase === "day" && !game.paused) game.tick(scaledTickMs(delta, coaching ? 1 : speed));
  });

  const terrainSnow = Math.min(1, snowQuality * 0.75 + snowDepth * 0.25);

  return (
    <>
      <RenderStats />
      <Atmosphere />
      <Terrain
        snowQuality={terrainSnow}
        snowDepth={snowDepth}
        trails={trailSnow}
        paths={trailRuns.map((t) => t.open ? t.path : [])}
        pathWidths={trailRuns.map((t) => t.widths)}
        forestPaths={forestPaths}
        lines={clearingLines}
      />
      <MapOverlay />
      <Road />
      <LeaseBoundary />
      <BuildGrid />
      <Suspense fallback={null}>
        <group name="overlay-context"><Village /><ArrivalArea guests={guests} dayIndex={dayIndex} /></group>
        <SnowGuns />
        <Trees lines={clearingLines} paths={forestPaths} />

        {trailRuns.map((run, ti) => {
          if (!run.open || !lifts[run.liftIndex]?.confirmed) return null;
          const lane = trailRuns.slice(0, ti).filter((trail) => trail.open && trail.liftIndex === run.liftIndex).length;
          return (
            <TrailSign key={`trail-${ti}-${run.name}`} run={run} lane={lane} />
          );
        })}

        {confirmedLifts.map((lift, i) => (
          <group key={`lift-${i}-${lift.type}-${lift.anchor.x}-${lift.anchor.z}`}>
            <Lift line={liftLineOf(lift)} previewInvalid={false} type={lift.type} closing={lift.closing} />
          </group>
        ))}

        <BuildScenePreview />
        <group name="overlay-context"><Guests lifts={guestLifts} trailPaths={trailPaths} followedRef={followedRef} /></group>
      </Suspense>
      <PlacementController />
      <CameraRig followId={followId} followedRef={followedRef} />
      <OrbitControls
        makeDefault
        domElement={canvas}
        enablePan
        enableZoom
        enableRotate
        enableDamping
        dampingFactor={0.08}
        screenSpacePanning={false}
        zoomToCursor
        touches={{
          ONE: usingBuildTool ? -1 as THREE.TOUCH : THREE.TOUCH.PAN,
          TWO: usingBuildTool ? THREE.TOUCH.DOLLY_PAN : THREE.TOUCH.DOLLY_ROTATE,
        }}
        mouseButtons={{
          LEFT: usingBuildTool ? -1 as THREE.MOUSE : THREE.MOUSE.PAN,
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