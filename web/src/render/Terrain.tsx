"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { terrainHeight } from "./guestPaths";

function snowColorFromQuality(quality: number): THREE.Color {
  const dirty = new THREE.Color("#8a9aab");
  const clean = new THREE.Color("#f4f7fb");
  return dirty.lerp(clean, Math.max(0, Math.min(1, quality)));
}

export function Terrain({ snowQuality }: { snowQuality: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(16, 14, 56, 48);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, terrainHeight(x, z));
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, []);

  const color = useMemo(
    () => snowColorFromQuality(snowQuality),
    [snowQuality],
  );

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.82 - snowQuality * 0.12}
        metalness={0.02}
      />
    </mesh>
  );
}