"use client";

import { useEffect, useRef } from "react";
import { motionPref, useReducedMotion as useUiReducedMotion } from "@/ui/motion";

/** Tracks reduced motion in a ref so the frame loop never queries React state. */
export function useReducedMotion() {
  const reduced = useRef(motionPref.get());
  const setting = useUiReducedMotion();
  useEffect(() => {
    reduced.current = setting;
  }, [setting]);
  return reduced;
}