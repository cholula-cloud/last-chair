"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { segmentPath, type SnowLayer } from "@/game/mapLayers";
import { TERRAIN } from "@/game/terrain";
import {
  useLayers,
  useLayerSnapshot,
} from "@/ui/mapLayerStore";
import { useSettings } from "@/ui/settingsStore";
import { drawLayer } from "./mapTexture";
import { overlayUniforms } from "./terrainOverlay";
import { useReducedMotion } from "./useReducedMotion";

export function SnowLayerTexture({ layer }: { layer: SnowLayer }) {
  const { state, model } = useLayerSnapshot(layer);
  const wear = useLayers((s) => s.wear),
    strong = useSettings((s) => s.patternAids);
  const gunView = useLayers((s) => s.gunView);
  const reduced=useReducedMotion();
  const texture = useMemo(() => {
    const out = new THREE.CanvasTexture(
      drawLayer(state, model, layer, wear, strong, gunView),
    );
    out.colorSpace = THREE.SRGBColorSpace;
    return out;
  }, [state, model, layer, wear, strong, gunView]);
  useEffect(() => {
    overlayUniforms.uSnowLayer.value=texture;
    return () => { overlayUniforms.uSnowLayer.value=null; texture.dispose(); };
  },[texture]);
  const spots = useMemo(
    () =>
      layer !== "conditions" || wear
        ? []
        : model.trails.flatMap((cells, i) =>
            cells.flatMap((cell, j) => {
              if (!["fresh", "slush", "ice"].includes(cell.condition))
                return [];
              const path = segmentPath(state.trails[i], j);
              if (!path.length) return [];
              return [
                { a: path[3], b: path[9], slush: cell.condition === "slush" },
              ];
            }),
          ),
    [layer, wear, model, state],
  );
  const marks = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!marks.current) return;
    marks.current.visible = !reduced.current;
    if (reduced.current) return;
    marks.current.children.forEach((child, i) => {
      const spot = spots[i];
      if (!spot) return;
      const t = (clock.elapsedTime * (spot.slush ? 0.18 : 0.35) + i * 0.37) % 1;
      const x = spot.a.x + (spot.b.x - spot.a.x) * t,
        z = spot.a.z + (spot.b.z - spot.a.z) * t;
      child.position.set(x, TERRAIN.height(x, z) + 0.28, z);
      child.scale.setScalar(0.15 + 0.5 * Math.sin(t * Math.PI));
    });
  });
  return (
    <>
      <group ref={marks}>
        {spots.map((s, i) => (
          <mesh key={i}>
            <octahedronGeometry args={[0.42]} />
            <meshBasicMaterial color={s.slush ? "#5baba4" : "#ffffff"} />
          </mesh>
        ))}
      </group>
    </>
  );
}
