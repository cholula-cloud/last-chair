"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "@/ui/settingsStore";

/** Tracks reduced motion (in-game setting or OS) in a ref so the frame loop never queries it. */
export function useReducedMotion() {
  const reduced = useRef(false);
  const setting = useSettings((s) => s.reduceMotion);
  useEffect(() => {
    let query: MediaQueryList;
    try {
      query = window.matchMedia("(prefers-reduced-motion: reduce)");
    } catch {
      reduced.current = setting;
      return;
    }
    const update = () => {
      reduced.current = setting || query.matches;
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [setting]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      reduced.current = setting || query.matches;
    } catch {
      reduced.current = setting;
    }
  }, [setting]);
  return reduced;
}