"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";

declare global {
  interface Window {
    __lcStats?: { calls: number; triangles: number };
  }
}

/**
 * Writes draw-call and triangle counts for `?stats=1` (phone-check and prod builds).
 * Runs at the default priority (0): any positive priority makes R3F skip its own
 * `gl.render`, which leaves the canvas blank. Counts read here are the previous frame's.
 */
export function RenderStats() {
  const gl = useThree((s) => s.gl);
  const enabled =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("stats");
  const acc = useRef(0);

  useFrame((_, delta) => {
    if (!enabled) return;
    acc.current += delta;
    if (acc.current < 1) return;
    acc.current = 0;
    const info = gl.info.render;
    window.__lcStats = { calls: info.calls, triangles: info.triangles };
  });

  return null;
}