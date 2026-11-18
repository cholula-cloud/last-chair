"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { projectLiftBottom, snapTop } from "@/game/rules";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { requestFocus, usePlacementDraft } from "@/ui/placementDraft";
import {
  classifyPointer,
  type PointerEv,
  type TapRecord,
} from "./cameraControls";
import { pickTerrain } from "./terrainPick";
import { heightAt, snapRadiusAtHit } from "./placementTap";

const PLACEMENT_TAP_MS = 400;
const PINCH_COOLDOWN_MS = 150;

/** Terrain taps while placement is active (top / bottom steps). */
export function PlacementController() {
  const active = usePlacementDraft((s) => s.active);
  const step = usePlacementDraft((s) => s.step);
  const type = usePlacementDraft((s) => s.type);
  const dom = useThree((s) => s.gl.domElement);
  const get = useThree((s) => s.get);
  const pinchEnd = useRef(0);

  useEffect(() => {
    if (!active) return;
    let events: PointerEv[] = [];
    const activeIds = new Set<number>();
    let prevTap: TapRecord | null = null;

    const push = (e: PointerEvent, kind: PointerEv["type"]) =>
      events.push({ id: e.pointerId, type: kind, x: e.clientX, y: e.clientY, t: e.timeStamp });

    const onTap = (e: PointerEvent) => {
      if (performance.now() - pinchEnd.current < PINCH_COOLDOWN_MS) return;
      const rect = dom.getBoundingClientRect();
      const ndc = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      };
      const camera = get().camera as THREE.PerspectiveCamera;
      const raw = pickTerrain(ndc, camera, TERRAIN.height);
      if (!raw) return;

      const state = useGameStore.getState();
      const draft = usePlacementDraft.getState();
      const bottom = draft.bottom ?? TERRAIN.base;

      if (step === "bottom") {
        const b = projectLiftBottom(raw);
        usePlacementDraft.setState({ bottom: b, step: "top", tapPoint: raw });
        requestFocus([b, draft.top ?? b]);
        return;
      }

      const y = heightAt(raw.x, raw.z);
      const radius = snapRadiusAtHit(camera, { x: raw.x, y, z: raw.z }, rect.height);
      const snapped = snapTop(state, type, { bottom, top: raw }, radius);
      usePlacementDraft.setState({
        top: snapped.top,
        snapped: snapped.snapped,
        tapPoint: raw,
      });
      requestFocus([bottom, snapped.top]);
    };

    const finish = (e: PointerEvent) => {
      if (!activeIds.has(e.pointerId)) return;
      activeIds.delete(e.pointerId);
      push(e, "up");
      if (activeIds.size > 0) return;
      const kind = classifyPointer(events, prevTap, PLACEMENT_TAP_MS);
      events = [];
      if (kind !== "TAP") return;
      prevTap = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      onTap(e);
    };

    const onDown = (e: PointerEvent) => {
      if (activeIds.size === 0) events = [];
      activeIds.add(e.pointerId);
      push(e, "down");
    };
    const onMove = (e: PointerEvent) => {
      if (!activeIds.has(e.pointerId)) return;
      push(e, "move");
      if (activeIds.size >= 2) pinchEnd.current = performance.now();
    };
    const onUp = (e: PointerEvent) => finish(e);
    const onCancel = (e: PointerEvent) => {
      activeIds.delete(e.pointerId);
      events = [];
    };

    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [active, dom, get, step, type]);

  return null;
}
