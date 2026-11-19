"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { getOverlayLayer } from "@/game/overlays";
import { TERRAIN } from "@/game/terrain";
import { usePlacementDraft } from "@/ui/placementDraft";
import { setProbe, useActiveLayer, useOverlayUi } from "@/ui/overlayUi";
import { exceedsTapSlop } from "./cameraControls";
import { buildLeaseMask } from "./overlayMask";
import { PALETTE } from "./palette";
import { overlayDim, overlayUniforms } from "./terrainOverlay";
import { pickTerrain } from "./terrainPick";

/** A touch held this long without moving reads the map under it. */
const HOLD_MS = 450;
const TAP_MS = 250;

/** Writes the active layer into the terrain shader and the dimming uniform. Nothing runs per frame. */
function useOverlayUniforms(mode: number) {
  useEffect(() => {
    if (mode === 0) {
      overlayUniforms.uOverlayMode.value = 0;
      overlayDim.value = 0;
      return;
    }
    const mask = buildLeaseMask(TERRAIN);
    const texture = new THREE.DataTexture(mask.data, mask.size, mask.size, THREE.RedFormat, THREE.UnsignedByteType);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    overlayUniforms.uOverlayMask.value = texture;
    overlayUniforms.uMaskRect.value.set(mask.x0, mask.z0, 1 / mask.spanX, 1 / mask.spanZ);
    overlayUniforms.uOverlayMode.value = mode;
    overlayDim.value = 1;
    return () => {
      overlayUniforms.uOverlayMode.value = 0;
      overlayDim.value = 0;
      overlayUniforms.uOverlayMask.value = null;
      texture.dispose();
    };
  }, [mode]);
}

/** A tap or a hold on the map, with no building tool in use, sets the readout point. */
function useProbe(enabled: boolean) {
  const dom = useThree((s) => s.gl.domElement);
  const get = useThree((s) => s.get);
  useEffect(() => {
    if (!enabled) return;
    let down: { id: number; x: number; y: number; t: number } | null = null;
    let timer = 0;
    const read = (x: number, y: number) => {
      const rect = dom.getBoundingClientRect();
      const at = pickTerrain(
        { x: ((x - rect.left) / rect.width) * 2 - 1, y: -((y - rect.top) / rect.height) * 2 + 1 },
        get().camera,
        TERRAIN.height,
      );
      if (at) setProbe(at);
    };
    const clear = () => {
      window.clearTimeout(timer);
      down = null;
    };
    const onDown = (e: PointerEvent) => {
      if (down) {
        clear();
        return;
      }
      down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
      const { x, y } = down;
      timer = window.setTimeout(() => {
        if (!down) return;
        down = null;
        read(x, y);
      }, HOLD_MS);
    };
    const onMove = (e: PointerEvent) => {
      if (down && e.pointerId === down.id && exceedsTapSlop(e.clientX - down.x, e.clientY - down.y)) clear();
    };
    const onUp = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      const quick = e.timeStamp - down.t < TAP_MS;
      const moved = exceedsTapSlop(e.clientX - down.x, e.clientY - down.y);
      clear();
      if (quick && !moved) read(e.clientX, e.clientY);
    };
    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", clear);
    return () => {
      clear();
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", clear);
    };
  }, [enabled, dom, get]);
}

function ProbeMarker() {
  const probe = useOverlayUi((s) => s.probe);
  const geometry = useMemo(() => {
    if (!probe) return null;
    const count = 36;
    const points = Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2;
      const x = probe.x + Math.cos(a) * 0.5;
      const z = probe.z + Math.sin(a) * 0.5;
      return new THREE.Vector3(x, TERRAIN.height(x, z) + 0.15, z);
    });
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [probe]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!geometry) return null;
  return (
    <lineLoop geometry={geometry} renderOrder={4}>
      <lineBasicMaterial color={PALETTE.marker} depthTest={false} toneMapped={false} />
    </lineLoop>
  );
}

/** The map overlay inside the canvas: shader state, the tap readout and its marker. */
export function OverlayScene() {
  const layerId = useActiveLayer();
  const building = usePlacementDraft((s) => s.active && !s.moveCamera);
  const mode = getOverlayLayer(layerId)?.mode ?? 0;
  useOverlayUniforms(mode);
  useProbe(mode !== 0 && !building);
  return mode !== 0 && !building ? <ProbeMarker /> : null;
}
