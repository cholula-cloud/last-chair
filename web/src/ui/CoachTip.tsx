"use client";

import { useEffect, useRef } from "react";
import { nextTip, type CoachContext } from "@/game/coach";
import { useGameStore } from "@/game/store";
import { useSettings } from "@/ui/settingsStore";
import { CloseIcon } from "@/ui/kit/icons";

/**
 * One small coach tip at a time, near the top of the map under the HUD. A tip is marked seen when
 * the player dismisses it or when the moment it described has passed.
 */
export function CoachTip({ context }: { context: Omit<CoachContext, "enabled"> }) {
  const tips = useSettings((s) => s.tips);
  const seen = useGameStore((s) => s.tipsSeen);
  const markTipSeen = useGameStore((s) => s.markTipSeen);
  const tip = nextTip(seen, { ...context, enabled: tips });
  const id = tip?.id ?? null;
  const shownId = useRef<string | null>(null);

  // A tip that was on screen and then went away counts as seen.
  useEffect(() => {
    const previous = shownId.current;
    if (previous && previous !== id) markTipSeen(previous);
    shownId.current = id;
  }, [id, markTipSeen]);

  if (!tip) return null;
  return (
    <aside
      role="status"
      aria-label="Tip"
      className="panel note-in pointer-events-auto flex w-full max-w-[400px] items-center gap-2 py-1 pl-3 pr-1.5 [--lift:3px]"
    >
      <p className="min-w-0 flex-1 text-[0.9rem] font-extrabold leading-snug">{tip.text}</p>
      <button
        type="button"
        onClick={() => markTipSeen(tip.id)}
        aria-label="Dismiss tip"
        className="key key-sm press flex size-11 shrink-0 items-center justify-center"
      >
        <CloseIcon size={18} />
      </button>
    </aside>
  );
}
