"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { segmentPath, type MapLayer } from "@/game/mapLayers";
import { TERRAIN } from "@/game/terrain";
import {
  useActiveLayer,
  useLayers,
  useLayerSnapshot,
} from "@/ui/mapLayerStore";
import { useSettings } from "@/ui/settingsStore";
import { usePlacementDraft } from "@/ui/placementDraft";
import { drawLayer, textureUV } from "./mapTexture";
import { buildGeometry } from "./terrainMesh";
import { pickTerrain } from "./terrainPick";
import { useReducedMotion } from "./useReducedMotion";

function PaintedLayer({ layer }: { layer: MapLayer }) {
  const { state, model } = useLayerSnapshot(layer);
  const wear = useLayers((s) => s.wear),
    strong = useSettings((s) => s.patternAids);
  const gunView = useLayers((s) => s.gunView);
  const painting = usePlacementDraft((s) => s.active);
  const { gl, camera, scene } = useThree();
  const reduced = useReducedMotion();
  const geometry = useMemo(() => {
    const geo = buildGeometry(),
      p = geo.attributes.position,
      uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const [u, v] = textureUV(p.getX(i), p.getZ(i));
      uv[2 * i] = u;
      uv[2 * i + 1] = 1 - v;
    }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return geo;
  }, []);
  const texture = useMemo(() => {
    const out = new THREE.CanvasTexture(
      drawLayer(state, model, layer, wear, strong, gunView),
    );
    out.colorSpace = THREE.SRGBColorSpace;
    return out;
  }, [state, model, layer, wear, strong, gunView]);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    if (painting) return;
    const canvas = gl.domElement;
    let start: { id: number; x: number; y: number; held: boolean } | null =
      null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancel = () => {
      clearTimeout(timer);
      start = null;
    };
    const inspect = (x: number, y: number) => {
      const r = canvas.getBoundingClientRect();
      const at = pickTerrain(
        {
          x: ((x - r.left) / r.width) * 2 - 1,
          y: 1 - ((y - r.top) / r.height) * 2,
        },
        camera,
        TERRAIN.height,
      );
      if (at) useLayers.setState({ point: at });
    };
    const down = (e: PointerEvent) => {
      if (!e.isPrimary || start) {
        cancel();
        return;
      }
      start = { id: e.pointerId, x: e.clientX, y: e.clientY, held: false };
      timer = setTimeout(() => {
        if (start) {
          start.held = true;
          inspect(start.x, start.y);
        }
      }, 450);
    };
    const move = (e: PointerEvent) => {
      if (start && Math.hypot(start.x - e.clientX, start.y - e.clientY) > 7)
        cancel();
    };
    const up = (e: PointerEvent) => {
      if (start?.id === e.pointerId && !start.held)
        inspect(e.clientX, e.clientY);
      cancel();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    return () => {
      cancel();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
    };
  }, [gl, camera, painting]);

  // Keep the original shared materials untouched, including material arrays on imported meshes.
  useEffect(() => {
    const tinted = new Map<THREE.Material, THREE.Material>();
    const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    const tint = (material: THREE.Material) => {
      if (!tinted.has(material)) {
        const clone = material.clone();
        if ("color" in clone && clone.color instanceof THREE.Color)
          clone.color.multiplyScalar(0.45);
        tinted.set(material, clone);
      }
      return tinted.get(material)!;
    };
    const update = () =>
      scene.traverse((node) => {
        if (node.name !== "overlay-context") return;
        node.traverse((mesh) => {
          if (mesh instanceof THREE.Mesh && !originals.has(mesh)) {
            originals.set(mesh, mesh.material);
            mesh.material = Array.isArray(mesh.material)
              ? mesh.material.map(tint)
              : tint(mesh.material);
          }
        });
      });
    update();
    const id = setInterval(update, 1000);
    return () => {
      clearInterval(id);
      originals.forEach((original, mesh) => {
        mesh.material = original;
      });
      tinted.forEach((mat) => mat.dispose());
    };
  }, [scene]);

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
      <mesh geometry={geometry} renderOrder={1} raycast={() => null}>
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={0.83}
          alphaTest={0.02}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-3}
          polygonOffsetUnits={-3}
          toneMapped={false}
        />
      </mesh>
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
export function MapOverlay() {
  const layer = useActiveLayer();
  return layer ? <PaintedLayer layer={layer} /> : null;
}
