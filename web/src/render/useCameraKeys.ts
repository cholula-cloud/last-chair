"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControlsImpl } from "./orbitControlsType";
import { limitShift } from "./cameraControls";

const PAN_CODES: Record<string, [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};
const ROTATE_CODES: Record<string, number> = { KeyQ: 1, KeyE: -1 };
const ZOOM_CODES: Record<string, number> = { Equal: 1, Minus: -1 };
const ROTATE_RATE = 1.2; // rad/s
const ZOOM_RATE = 1.2; // log distance per second
const PAN_RATE = 0.9; // distances per second

const offset = new THREE.Vector3();
const move = new THREE.Vector3();

/** True when the key event came from a text field, which owns its keystrokes. */
export function isTypingTarget(t: EventTarget | null) {
  return t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
}

/** True when the event target sits inside an open dialog overlay. */
export function isDialogTarget(t: EventTarget | null) {
  return (
    t instanceof Element &&
  t.closest("[role=dialog],[role=alertdialog]") !== null
);
}

/**
 * Keyboard camera: WASD / arrows pan along the ground relative to the view
 * heading, Q/E rotate, +/- zoom, F focuses and Home or H recenters.
 */
export function useCameraKeys({
  onFocus,
  onHome,
  onUserMoved,
}: {
  onFocus: () => void;
  onHome: () => void;
  onUserMoved?: () => void;
}) {
  const controls = useThree((s) => s.controls as OrbitControlsImpl | undefined);
  const camera = useThree((s) => s.camera);
  const held = useRef(new Set<string>());
  const actions = useRef({ onFocus, onHome, onUserMoved });
  useEffect(() => {
    actions.current = { onFocus, onHome, onUserMoved };
  });

  useEffect(() => {
    const codes = held.current;
    const clear = () => codes.clear();
    const onDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || isDialogTarget(e.target)) return;
      if (e.metaKey && e.key === "Meta") {
        clear();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const code = e.code;
      if (code in PAN_CODES || code in ROTATE_CODES || code in ZOOM_CODES) {
        codes.add(code);
        if (code.startsWith("Arrow")) e.preventDefault();
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "f") actions.current.onFocus();
      else if (k === "h" || k === "home") actions.current.onHome();
    };
    const onUp = (e: KeyboardEvent) => {
      codes.delete(e.code);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") clear();
    });
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
    };
  }, []);

  useFrame((_, delta) => {
    const codes = held.current;
    if (!controls || codes.size === 0) return;
    const dt = Math.min(delta, 0.05);
    offset.copy(camera.position).sub(controls.target);
    let right = 0,
      forward = 0,
      spin = 0,
      zoom = 0;
    for (const code of codes) {
      const p = PAN_CODES[code];
      if (p) {
        right += p[0];
        forward += p[1];
      }
      spin += ROTATE_CODES[code] ?? 0;
      zoom += ZOOM_CODES[code] ?? 0;
    }
    const dist = offset.length();
  let moved = false;
    if (spin) {
      offset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, spin * ROTATE_RATE * dt);
      moved = true;
    }
    if (zoom) {
      offset.multiplyScalar(Math.exp(-zoom * ZOOM_RATE * dt));
      moved = true;
    }
    if (moved) {
      camera.position.copy(controls.target).add(offset);
    }
    if (right || forward) {
      const hx = -offset.x,
        hz = -offset.z;
      const hl = Math.hypot(hx, hz) || 1;
      const len = Math.hypot(right, forward) || 1;
      const step = (PAN_RATE * dist * dt) / len;
      move.set((hx * forward - hz * right) / hl, 0, (hz * forward + hx * right) / hl).multiplyScalar(step);
      const shift = limitShift(controls.target, move.x, move.z);
      move.x = shift.x;
      move.z = shift.z;
      camera.position.add(move);
      controls.target.add(move);
      moved = true;
    }
    if (moved) {
      actions.current.onUserMoved?.();
      controls.update();
    }
  });
}