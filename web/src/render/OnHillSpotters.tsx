"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { placedAssetTarget, type AssetTarget } from "@/game/assetNames";
import { liftWaitMin } from "@/game/lifts";
import { liftLineOf } from "@/game/rules";
import { TERRAIN } from "@/game/terrain";
import { useGameStore } from "@/game/store";
import { usePlacementDraft } from "@/ui/placementDraft";
import { guestWorldPosition } from "./guestPlacement";
import { LODGE } from "./layout";
import { useReducedMotion } from "./useReducedMotion";

type SpotterKind = "sloane" | "bus" | "alert";

function badgeTexture(kind: SpotterKind): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 96;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  ctx.translate(48, 48);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = kind === "sloane" ? "#1d4ed8" : kind === "bus" ? "#f6c700" : "#e0483e";
  ctx.strokeStyle = "#1b3a57";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(-26, -26, 52, 52, 8);
  ctx.fill();
  ctx.stroke();

  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = kind === "bus" ? "#1b3a57" : "#ffffff";
  ctx.font = "bold 32px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(kind === "sloane" ? "W" : kind === "bus" ? "B" : "!", 0, 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function computeHotspot(
  lifts: ReturnType<typeof useGameStore.getState>["lifts"],
  trails: ReturnType<typeof useGameStore.getState>["trails"],
  talentsOwned: ReturnType<typeof useGameStore.getState>["talentsOwned"],
): { x: number; y: number; z: number; kind: "lift" | "trail"; index: number } | null {
  for (let i = 0; i < lifts.length; i++) {
    const lift = lifts[i];
    if (!lift.confirmed) continue;
    if (liftWaitMin(lift, talentsOwned) > 6) {
      const b = liftLineOf(lift).bottom;
      return { x: b.x, y: TERRAIN.height(b.x, b.z) + 0.95, z: b.z, kind: "lift", index: i };
    }
  }
  for (let i = 0; i < trails.length; i++) {
    const trail = trails[i];
    if (!trail.open || trail.path.length < 2) continue;
    const thin = trail.snow.some((seg) => seg.depth < 0.16 || seg.quality < 0.2);
    if (thin) {
      const mid = trail.path[Math.floor(trail.path.length / 2)];
      if (!mid) continue;
      return { x: mid.x, y: TERRAIN.height(mid.x, mid.z) + 0.85, z: mid.z, kind: "trail", index: i };
    }
  }
  return null;
}

/**
 * Max 3 subtle world-space markers during day play (hidden in build mode)
 * pointing out Sloane's scouting guest, School Bus arrivals, or a critical queue/snow hotspot.
 */
export function OnHillSpotters({
  onInspectAsset,
}: {
  onInspectAsset?: (target: AssetTarget) => void;
}) {
  const phase = useGameStore((s) => s.phase);
  const guests = useGameStore((s) => s.guests);
  const lifts = useGameStore((s) => s.lifts);
  const trails = useGameStore((s) => s.trails);
  const talentsOwned = useGameStore((s) => s.talentsOwned);
  const schoolContract = useGameStore((s) => s.schoolContract);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const placementActive = usePlacementDraft((s) => s.active);
  const reduced = useReducedMotion();

  const sloaneTex = useMemo(() => badgeTexture("sloane"), []);
  const busTex = useMemo(() => badgeTexture("bus"), []);
  const alertTex = useMemo(() => badgeTexture("alert"), []);

  useEffect(
    () => () => {
      sloaneTex?.dispose();
      busTex?.dispose();
      alertTex?.dispose();
    },
    [sloaneTex, busTex, alertTex],
  );

  const sloaneRef = useRef<THREE.Sprite>(null);
  const busRef = useRef<THREE.Sprite>(null);
  const alertRef = useRef<THREE.Sprite>(null);

  const sloaneIndex = guests.findIndex((g) => g.id === "sloane-scout" && g.state !== "pending" && g.state !== "gone");
  const sloaneGuest = sloaneIndex >= 0 ? guests[sloaneIndex] : null;
  const sloanePos = useMemo(() => {
    if (!sloaneGuest) return null;
    const lift = lifts[sloaneGuest.liftIndex ?? 0] ?? lifts[0];
    if (!lift) return null;
    const trailPath = sloaneGuest.trailIndex != null ? trails[sloaneGuest.trailIndex]?.path : undefined;
    return guestWorldPosition(sloaneIndex, sloaneGuest.state, sloaneGuest.progress, liftLineOf(lift), {
      path: trailPath,
      skiLeg: sloaneGuest.skiRoute?.legs[sloaneGuest.skiRoute.current],
    });
  }, [sloaneGuest, sloaneIndex, lifts, trails]);

  const showBus = schoolContract?.decision === "accepted" && schoolContract.day === dayIndex;

  const hotspot = useMemo(() => computeHotspot(lifts, trails, talentsOwned), [lifts, trails, talentsOwned]);

  useFrame(({ clock }) => {
    const bob = reduced.current ? 0 : Math.sin(clock.elapsedTime * 3) * 0.05;
    if (sloaneRef.current && sloanePos) {
      sloaneRef.current.position.set(sloanePos.x, sloanePos.y + 0.85 + bob, sloanePos.z);
    }
    if (busRef.current && showBus) {
      busRef.current.position.set(LODGE.x + 1.15, TERRAIN.height(LODGE.x + 1.15, LODGE.z + 1.2) + 0.85 + bob, LODGE.z + 1.2);
    }
    if (alertRef.current && hotspot) {
      alertRef.current.position.set(hotspot.x, hotspot.y + bob, hotspot.z);
    }
  });

  if (phase !== "day" || placementActive) return null;

  return (
    <group name="on-hill-spotters">
      {sloanePos && sloaneTex && (
        <sprite
          ref={sloaneRef}
          scale={[0.42, 0.42, 1]}
          onClick={(e) => {
            e.stopPropagation();
            useGameStore.getState().setFollowId("sloane-scout");
          }}
        >
          <spriteMaterial map={sloaneTex} transparent depthWrite={false} />
        </sprite>
      )}
      {showBus && busTex && (
        <sprite ref={busRef} scale={[0.4, 0.4, 1]}>
          <spriteMaterial map={busTex} transparent depthWrite={false} />
        </sprite>
      )}
      {hotspot && alertTex && (
        <sprite
          ref={alertRef}
          scale={[0.38, 0.38, 1]}
          onClick={(e) => {
            e.stopPropagation();
            const target = placedAssetTarget(useGameStore.getState(), hotspot.kind, hotspot.index);
            if (target) onInspectAsset?.(target);
          }}
        >
          <spriteMaterial map={alertTex} transparent depthWrite={false} />
        </sprite>
      )}
    </group>
  );
}
