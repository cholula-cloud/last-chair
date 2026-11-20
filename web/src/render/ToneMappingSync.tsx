"use client";

import { useFrame } from "@react-three/fiber";
import { sceneMood } from "./Atmosphere";

/** Copies `sceneMood.exposure` onto the WebGL renderer each frame. */
export function ToneMappingSync() {
  useFrame(({ gl }) => {
    gl.toneMappingExposure = sceneMood.exposure;
  });
  return null;
}