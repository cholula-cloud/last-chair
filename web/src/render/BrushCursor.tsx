"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BufferGeometry, Float32BufferAttribute, type Mesh, type PerspectiveCamera } from "three";
import { TERRAIN } from "@/game/terrain";
import { usePlacementDraft } from "@/ui/placementDraft";
import { brushState } from "./brushState";
import { brushRadius, pixelWorldSize } from "./paintAssist";
import { PALETTE } from "./palette";
import { useReducedMotion } from "./useReducedMotion";

/** Time constant of the cursor's follow, in seconds. */
export const BRUSH_FOLLOW_TAU = 0.06;
/** Outline thicknesses in screen pixels: the light line and the dark line outside it. */
const LINE_PX = 2;
const SHADOW_PX = 1.5;
const SEGMENTS = 48;
const LIFT = 0.12;

type Shown = { x: number; z: number } | null;

function discGeometry() {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array((SEGMENTS + 1) * 3), 3));
  const indices: number[] = [];
  for (let i = 0; i < SEGMENTS; i++) indices.push(0, 1 + i, 1 + ((i + 1) % SEGMENTS));
  geometry.setIndex(indices);
  return geometry;
}

function ringGeometry() {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(SEGMENTS * 2 * 3), 3));
  const indices: number[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const next = (i + 1) % SEGMENTS;
    indices.push(i * 2, i * 2 + 1, next * 2, i * 2 + 1, next * 2 + 1, next * 2);
  }
  geometry.setIndex(indices);
  return geometry;
}

/** Lays the disc on the terrain around (cx, cz). */
function fillDisc(geometry: BufferGeometry, cx: number, cz: number, radius: number) {
  const position = geometry.getAttribute("position");
  position.setXYZ(0, cx, TERRAIN.height(cx, cz) + LIFT, cz);
  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius;
    const z = cz + Math.sin(angle) * radius;
    position.setXYZ(1 + i, x, TERRAIN.height(x, z) + LIFT, z);
  }
  position.needsUpdate = true;
}

/** Lays a ring between two radii on the terrain around (cx, cz). */
function fillRing(geometry: BufferGeometry, cx: number, cz: number, inner: number, outer: number) {
  const position = geometry.getAttribute("position");
  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const ox = cx + cos * outer;
    const oz = cz + sin * outer;
    const ix = cx + cos * inner;
    const iz = cz + sin * inner;
    position.setXYZ(i * 2, ox, TERRAIN.height(ox, oz) + LIFT, oz);
    position.setXYZ(i * 2 + 1, ix, TERRAIN.height(ix, iz) + LIFT, iz);
  }
  position.needsUpdate = true;
}

/**
 * The paint brush: a translucent disc at the true brush width with a crisp outline. A mouse shows
 * it on hover, a finger shows it while down. It chases the pointer on a short spring by writing
 * vertex positions in the frame loop, so nothing re-renders as it moves.
 */
export function BrushCursor() {
  const visible = usePlacementDraft((s) => s.active && s.kind === "trail" && !s.review && !s.moveCamera);
  const widthFt = usePlacementDraft((s) => s.brushWidth);
  const erasing = usePlacementDraft((s) => s.erasing);
  const reduced = useReducedMotion();
  const shown = useRef<Shown>(null);
  const radius = useRef(brushRadius(widthFt));
  const disc = useRef<Mesh>(null);
  const line = useRef<Mesh>(null);
  const shadow = useRef<Mesh>(null);
  const geometry = useMemo(() => ({ disc: discGeometry(), line: ringGeometry(), shadow: ringGeometry() }), []);

  useEffect(() => {
    radius.current = brushRadius(widthFt);
  }, [widthFt]);
  useEffect(() => () => {
    geometry.disc.dispose();
    geometry.line.dispose();
    geometry.shadow.dispose();
  }, [geometry]);

  useFrame(({ camera, size }, dt) => {
    const meshes = [disc.current, line.current, shadow.current];
    const show = visible && brushState.visible;
    for (const mesh of meshes) if (mesh) mesh.visible = show;
    if (!show) {
      shown.current = null;
      return;
    }
    const want = brushState;
    const k = reduced.current || !shown.current ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) / BRUSH_FOLLOW_TAU);
    const prev = shown.current ?? want;
    const x = prev.x + (want.x - prev.x) * k;
    const z = prev.z + (want.z - prev.z) * k;
    shown.current = { x, z };

    const r = radius.current;
    const cam = camera as PerspectiveCamera;
    const away = Math.hypot(cam.position.x - x, cam.position.y - TERRAIN.height(x, z), cam.position.z - z);
    const px = pixelWorldSize(away, cam.fov, size.height);
    const lineWidth = Math.min(r * 0.5, LINE_PX * px);
    const shadowWidth = Math.min(r * 0.5, SHADOW_PX * px);
    fillDisc(geometry.disc, x, z, r);
    fillRing(geometry.line, x, z, r - lineWidth, r);
    fillRing(geometry.shadow, x, z, r, r + shadowWidth);
  });

  const tint = erasing ? PALETTE.invalid : PALETTE.white;
  return (
    <>
      <mesh ref={disc} geometry={geometry.disc} renderOrder={3} visible={false} frustumCulled={false}>
        <meshBasicMaterial color={tint} transparent opacity={erasing ? 0.38 : 0.34} depthWrite={false}
          toneMapped={false} polygonOffset polygonOffsetFactor={-6} />
      </mesh>
      <mesh ref={shadow} geometry={geometry.shadow} renderOrder={4} visible={false} frustumCulled={false}>
        <meshBasicMaterial color={PALETTE.inkDeep} transparent opacity={0.8} depthTest={false} depthWrite={false}
          toneMapped={false} />
      </mesh>
      <mesh ref={line} geometry={geometry.line} renderOrder={5} visible={false} frustumCulled={false}>
        <meshBasicMaterial color={tint} transparent opacity={1} depthTest={false} depthWrite={false}
          toneMapped={false} />
      </mesh>
    </>
  );
}
