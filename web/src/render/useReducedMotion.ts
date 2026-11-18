"use client";

import { useEffect, useRef } from "react";

/** Tracks prefers-reduced-motion in a ref so the frame loop never queries it. */
export function useReducedMotion() {
  const reduced = useRef(false);
  useEffect(() => {
    let query: MediaQueryList;
    try {
      query = window.matchMedia("(prefers-reduced-motion: reduce)");
    } catch {
      return;
    }
    const update = () => { reduced.current = query.matches; };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}
