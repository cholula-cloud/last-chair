"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { bakeKit, METERS_TO_WORLD, SHADOW_LAYER_MASK, TOY_SCALE, useKit } from "./kit";
import type { GuestVariant } from "./guestLook";
import { OVERLAY_DIM } from "./terrainOverlay";

const SPLIT = ["jacket", "helmet"] as const;
const SHADOW = new THREE.BoxGeometry(0.5, 1.7, 0.4).translate(0, 0.85, 0);

export type VariantMeshes = {
  base: THREE.InstancedMesh;
  jacket: THREE.InstancedMesh;
  hat: THREE.InstancedMesh;
  shadow: THREE.InstancedMesh;
};

export function GuestVariantLayer({
  variant,
  max,
  onReady,
}: {
  variant: GuestVariant;
  max: number;
  onReady: (variant: GuestVariant, meshes: VariantMeshes | null) => void;
}) {
  const kit = bakeKit(useKit(variant), SPLIT);
  const baseRef = useRef<THREE.InstancedMesh>(null);
  const jacketRef = useRef<THREE.InstancedMesh>(null);
  const hatRef = useRef<THREE.InstancedMesh>(null);
  const shadowRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const base = baseRef.current;
    const jacket = jacketRef.current;
    const hat = hatRef.current;
    const shadow = shadowRef.current;
    if (base && jacket && hat && shadow) onReady(variant, { base, jacket, hat, shadow });
    else onReady(variant, null);
    return () => onReady(variant, null);
  }, [variant, onReady, kit]);

  return (
    <group name={`guests-${variant}`}>
      <instancedMesh ref={baseRef} args={[kit.body, undefined, max]} frustumCulled={false}>
        <meshLambertMaterial vertexColors {...OVERLAY_DIM} />
      </instancedMesh>
      <instancedMesh ref={jacketRef} args={[kit.split.jacket, undefined, max]} frustumCulled={false}>
        <meshLambertMaterial vertexColors {...OVERLAY_DIM} />
      </instancedMesh>
      <instancedMesh ref={hatRef} args={[kit.split.helmet, undefined, max]} frustumCulled={false}>
        <meshLambertMaterial vertexColors {...OVERLAY_DIM} />
      </instancedMesh>
      <instancedMesh
        ref={shadowRef}
        args={[SHADOW, undefined, max]}
        castShadow
        frustumCulled={false}
        layers={SHADOW_LAYER_MASK}
      >
        <meshBasicMaterial colorWrite={false} />
      </instancedMesh>
    </group>
  );
}

export const GUEST_VARIANTS = ["skier", "skier-kid", "skier-coat", "boarder", "boarder-kid"] as const satisfies readonly GuestVariant[];
export const GUEST_SCALE = METERS_TO_WORLD * TOY_SCALE;