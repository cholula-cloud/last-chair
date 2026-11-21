"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { PIPE_REACH_DESIGN } from "@/game/guns";
import { gunRadius } from "@/game/mapLayers";
import { TERRAIN, type XZ } from "@/game/terrain";
import { useGameStore } from "@/game/store";
import { usePlacementDraft } from "@/ui/placementDraft";
import { reachArc } from "./buildGridModel";
import { GRID_STYLE } from "./buildGridStyle";

const ARC_STEPS = 96;

function GroundRing({ at, radius, color, opacity }: { at: XZ; radius: number; color: string; opacity: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ARC_STEPS * 3), 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const line = useRef<THREE.LineLoop>(null);
  useLayoutEffect(() => {
    const mesh = line.current;
    const attr = mesh?.geometry.getAttribute("position");
    if (!mesh || !attr) return;
    for (let i = 0; i < ARC_STEPS; i++) {
      const t = (i / ARC_STEPS) * Math.PI * 2;
      const x = at.x + Math.cos(t) * radius;
      const z = at.z + Math.sin(t) * radius;
      attr.setXYZ(i, x, TERRAIN.height(x, z) + GRID_STYLE.height, z);
    }
    attr.needsUpdate = true;
    mesh.geometry.computeBoundingSphere();
  }, [at, radius]);
  return (
    <lineLoop ref={line} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </lineLoop>
  );
}

/** Pipe reach from each anchor and snow radius at the cursor while placing a gun. */
export function GunPlacementGuide() {
  const { tapPoint, review } = usePlacementDraft((d) => ({ tapPoint: d.tapPoint, review: d.review }));
  const guns = useGameStore((s) => s.guns);
  const talentsOwned = useGameStore((s) => s.talentsOwned);
  const anchors = useMemo(() => [TERRAIN.base, ...guns.map((g) => g.at)], [guns]);
  const pipeReach = PIPE_REACH_DESIGN * TERRAIN.scale.horizontal;
  const snowReach = gunRadius(talentsOwned);
  if (review) return null;
  return (
    <>
      {anchors.map((anchor, i) => (
        <PipeArc key={`pipe-${i}-${anchor.x}-${anchor.z}`} anchor={anchor} reach={pipeReach} />
      ))}
      {tapPoint && <GroundRing at={tapPoint} radius={snowReach} color="#2a6b7a" opacity={0.85} />}
      {tapPoint && <GroundRing at={tapPoint} radius={pipeReach} color="#4a8fb0" opacity={0.55} />}
    </>
  );
}

function PipeArc({ anchor, reach }: { anchor: XZ; reach: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ARC_STEPS * 2 * 3), 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const segments = useMemo(() => {
    const arc = reachArc(anchor, reach, TERRAIN, ARC_STEPS);
    return arc.flatMap((p, i) => {
      const q = arc[i + 1];
      return p && q ? [[p, q] as const] : [];
    });
  }, [anchor, reach]);
  const lines = useRef<THREE.LineSegments>(null);
  useLayoutEffect(() => {
    const target = lines.current?.geometry;
    const attribute = target?.getAttribute("position");
    if (!target || !attribute) return;
    let n = 0;
    for (const [p, q] of segments) {
      for (const at of [p, q]) {
        attribute.setXYZ(n++, at.x, TERRAIN.height(at.x, at.z) + GRID_STYLE.height, at.z);
      }
    }
    attribute.needsUpdate = true;
    target.setDrawRange(0, n);
    target.computeBoundingSphere();
  }, [segments]);
  return (
    <lineSegments ref={lines} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color="#3d7a92" transparent opacity={0.45} depthWrite={false} toneMapped={false} />
    </lineSegments>
  );
}