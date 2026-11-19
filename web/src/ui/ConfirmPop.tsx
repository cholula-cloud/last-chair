"use client";

import { useEffect } from "react";
import { usePop } from "@/ui/feel";

const SHOW_MS = 1500;

/**
 * A short pop that confirms a build or a lodge tier-up. It scales and fades in over 240 ms,
 * holds, then fades out. Reduced motion keeps the confirmation still.
 */
export function ConfirmPop() {
  const seq = usePop((s) => s.seq);
  const label = usePop((s) => s.label);
  useEffect(() => {
    if (!label) return;
    const timer = window.setTimeout(() => usePop.getState().clear(), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [seq, label]);
  if (!label) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[38%] z-[65] flex justify-center px-4" role="status">
      <p key={seq} className="feel-pop chip bg-sign-green px-4 py-2 text-[1rem] font-extrabold text-white">
        {label}
      </p>
    </div>
  );
}
