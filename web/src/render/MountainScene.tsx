"use client";

import { BuildGrid } from "./BuildGrid";
import { LeaseBoundary } from "./LeaseBoundary";
import { CameraRig } from "./CameraRig";

import { MountainOrbitControls } from "./MountainOrbitControls";
import { useFrame, useThree } from "@react-three/fiber";
import { lazy, Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import type { AssetTarget } from "@/game/assetNames";
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
import { ChimneySmoke } from "./ChimneySmoke";
import { homeAzimuth } from "./cameraFraming";
import { MAX_DISTANCE, MIN_DISTANCE } from "./cameraControls";
import { Guests } from "./Guests";
import type { GuestPlacement } from "./guestPlacement";
import { Lift } from "./Lift";
import { LiftPlacementMotion } from "./LiftPlacementMotion";
import { Village } from "./Lodge";
import { SnowGuns } from "./SnowGuns";
import { RenderStats } from "./RenderStats";
import { OverlayScene } from "./OverlayScene";
import { Road, Terrain } from "./Terrain";
import { TrailSign } from "./TrailSign";

const TrailMapKiosk = lazy(() =>
  import("./TrailMapKiosk").then((m) => ({ default: m.TrailMapKiosk })),
);
const DirectionSigns = lazy(() =>
  import("./DirectionSign").then((m) => ({ default: m.DirectionSigns })),
);
const RopeGate = lazy(() => import("./RopeGate").then((m) => ({ default: m.RopeGate })));
const TubingHillDressing = lazy(() =>
  import("./TubingHillDressing").then((m) => ({ default: m.TubingHillDressing })),
);
const RinkSkaters = lazy(() => import("./RinkSkaters").then((m) => ({ default: m.RinkSkaters })));
import { Trees } from "./Trees";
import { ArrivalArea } from "./Vehicles";

/** Tilt (elevation above the horizon) and orbit limits, and the closest zoom. */
const MIN_ELEVATION = 0.35;
const MAX_ELEVATION = 1.25;
const AZIMUTH_RANGE = 1.4;

const FALLBACK_ANCHOR: LiftAnchor = REFERENCE_TOPS[0] ?? { x: -1.2, z: 0.2 };

export function MountainScene({ lowDetail = false, onInspectAsset }: {
  lowDetail?: boolean;
  onInspectAsset?: (target: AssetTarget) => void;
}) {
  const speed = useSpeed((s) => s.speed);
  const followId = useGameStore((s) => s.followId);
  const guests = useGameStore((s) => s.guests);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const snowQuality = useGameStore((s) => s.snowQuality);
  const snowDepth = useGameStore((s) => s.snowDepth);
  const snowPreset = useGameStore((s) => s.snow);
  const runsByTrail = useGameStore((s) => s.dayStats.runsByTrail);
  const lifts = useGameStore((s) => s.lifts);
  const trailRuns = useGameStore((s) => s.trails);
  const usingBuildTool = usePlacementDraft((s) => s.active && !s.moveCamera);
  const trailKey = useGameStore((s) => snowKey(snowCarriers(s.trails)));
  const trailSnow = useMemo(() => decodeSnowKey(trailKey), [trailKey]);
  const canvas = useThree((s) => s.gl.domElement);
  const azimuth = useThree((s) => homeAzimuth(s.size.width / Math.max(1, s.size.height)));

  const followedRef = useRef<GuestPlacement | null>(null);

  const confirmedLifts = useMemo(() => lifts.flatMap((lift, index) => lift.confirmed ? [{ lift, index }] : []), [lifts]);
  const primaryLine = useMemo(
    (): LiftLine =>
      confirmedLifts[0]
        ? liftLineOf(confirmedLifts[0].lift)
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
    () => confirmedLifts.map(({ lift }) => liftLineOf(lift)),
    [confirmedLifts],
  );
  const forestPaths = useMemo(
    () => trailRuns.filter((run) => run.open && run.builtDay === undefined).map((run) => run.path),
    [trailRuns],
  );

  useFrame((_, delta) => {
    const game = useGameStore.getState();
    if (game.phase === "day" && !game.paused) game.tick(scaledTickMs(delta, speed));
  });

  const terrainSnow = Math.min(1, snowQuality * 0.75 + snowDepth * 0.25);

  return (
    <>
      <RenderStats />
      <Atmosphere lowDetail={lowDetail} />
      <Terrain
        lowDetail={lowDetail}
        snowQuality={terrainSnow}
        snowDepth={snowDepth}
        trails={trailSnow}
        groomed={trailRuns.map((t) => t.groomed)}
        gunCovered={trailRuns.map((t) => t.gunCovered)}
        snowPreset={snowPreset}
        runsByTrail={runsByTrail}
        paths={trailRuns.map((t) => t.open ? t.path : [])}
        pathWidths={trailRuns.map((t) => t.widths)}
        forestPaths={forestPaths}
        lines={clearingLines}
      />
      <Road />
      <LeaseBoundary />
      <OverlayScene />
      <BuildGrid />
      <Suspense fallback={null}>
        <Village />
        <ChimneySmoke />
        <DirectionSigns />
        <TubingHillDressing />
        <RinkSkaters />
        <ArrivalArea guests={guests} dayIndex={dayIndex} />
        <SnowGuns />
        <Trees lowDetail={lowDetail} lines={clearingLines} paths={forestPaths} />

        {trailRuns.map((run, ti) => {
          const liftOk = lifts[run.liftIndex]?.confirmed;
          if (!liftOk || run.path.length < 2) return null;
          if (run.open) {
            const lane = trailRuns.slice(0, ti).filter((trail) => trail.open && trail.liftIndex === run.liftIndex).length;
            return <TrailSign key={ti} index={ti} run={run} lane={lane} />;
          }
          return (
            <Suspense key={ti} fallback={null}>
              <RopeGate run={run} index={ti} />
            </Suspense>
          );
        })}

        {confirmedLifts.map(({ lift, index }) => {
          const key = `lift-${index}-${lift.type}-${lift.anchor.x}-${lift.anchor.z}`;
          const line = liftLineOf(lift);
          return (
            <group key={key} userData={{ asset: { kind: "lift", index } }}>
              <LiftPlacementMotion liftKey={key} preview={false}>
                <Lift line={line} previewInvalid={false} type={lift.type} closing={lift.closing} />
              </LiftPlacementMotion>
              <Suspense fallback={null}>
                <TrailMapKiosk line={line} trails={trailRuns} liftIndex={index} />
              </Suspense>
            </group>
          );
        })}

        <BuildScenePreview />
        <Guests lifts={guestLifts} trailPaths={trailPaths} followedRef={followedRef} />
      </Suspense>
      <PlacementController />
      <CameraRig followId={followId} followedRef={followedRef} onInspectAsset={onInspectAsset} />
      <MountainOrbitControls
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
