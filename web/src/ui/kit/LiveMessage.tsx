"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Mount the live region before its text so assistive technology can observe the first update. */
export function LiveMessage({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setReady(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  if (!enabled) return children;
  return <span role="status" aria-atomic="true">{ready && children}</span>;
}
