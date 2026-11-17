"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const PAN_KEYS: Record<string, [number, number]> = {
  w: [0, 1], arrowup: [0, 1], s: [0, -1], arrowdown: [0, -1],
  a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0],
};
const ROTATE_KEYS: Record<string, number> = { q: 1, e: -1 };
const ZOOM_KEYS: Record<string, number> = { "+": 1, "=": 1, "-": -1, _: -1 };
const ROTATE_RATE = 1.2; // rad/s
const ZOOM_RATE = 1.2; // log distance per second
const PAN_RATE = 0.9; // distances per second

const offset = new THREE.Vector3();
const move = new THREE.Vector3();

/** True when the key event came from a text field, which owns its keystrokes. */
export function isTypingTarget(t: EventTarget | null) {
  return t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
}

/**
 * Keyboard camera: WASD / arrows pan along the ground relative to the view
 * heading, Q/E rotate, +/- zoom, F focuses and Home or H recenters.
 */
export function useCameraKeys({ onFocus, onHome }: { onFocus: () => void; onHome: () => void }) {
  const controls = useThree((s) => s.controls as OrbitControlsImpl | undefined);
  const camera = useThree((s) => s.camera);
  const held = useRef(new Set<string>());
  // Keys released before a frame saw them still move the camera for one frame.
  const released = useRef(new Set<string>());
  const actions = useRef({ onFocus, onHome });
  useEffect(() => {
    actions.current = { onFocus, onHome };
  });

  useEffect(() => {
    const keys = held.current;
    const done = released.current;
    const onDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k in PAN_KEYS || k in ROTATE_KEYS || k in ZOOM_KEYS) {
        keys.add(k);
        done.delete(k);
        if (k.startsWith("arrow")) e.preventDefault();
      } else if (k === "f") actions.current.onFocus();
      else if (k === "h" || k === "home") actions.current.onHome();
    };
    const onUp = (e: KeyboardEvent) => done.add(e.key.toLowerCase());
    const clear = () => {
      keys.clear();
      done.clear();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
    };
  }, []);

  useFrame((_, delta) => {
    const keys = held.current;
    if (!controls || keys.size === 0) return;
    const dt = Math.min(delta, 0.05);
    offset.copy(camera.position).sub(controls.target);
    let right = 0, forward = 0, spin = 0, zoom = 0;
    for (const k of keys) {
      const p = PAN_KEYS[k];
      if (p) { right += p[0]; forward += p[1]; }
      spin += ROTATE_KEYS[k] ?? 0;
      zoom += ZOOM_KEYS[k] ?? 0;
    }
    const dist = offset.length();
    // Rotate and zoom the offset; controls.update() clamps angle and distance.
    if (spin) offset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, spin * ROTATE_RATE * dt);
    if (zoom) offset.multiplyScalar(Math.exp(-zoom * ZOOM_RATE * dt));
    camera.position.copy(controls.target).add(offset);
    if (right || forward) {
      // Ground heading: from the camera toward the target, flattened.
      const hx = -offset.x, hz = -offset.z;
      const hl = Math.hypot(hx, hz) || 1;
      const len = Math.hypot(right, forward) || 1;
      const step = (PAN_RATE * dist * dt) / len;
      move.set((hx * forward - hz * right) / hl, 0, (hz * forward + hx * right) / hl).multiplyScalar(step);
      camera.position.add(move);
      controls.target.add(move);
    }
    controls.update();
    for (const k of released.current) keys.delete(k);
    released.current.clear();
  });
}
