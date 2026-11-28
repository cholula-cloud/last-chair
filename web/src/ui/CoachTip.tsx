"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { nextTip, type CoachContext } from "@/game/coach";
import { useGameStore } from "@/game/store";
import { useSettings } from "@/ui/settingsStore";
import { LiveMessage } from "./kit/LiveMessage";
import { CloseIcon } from "@/ui/kit/icons";

/**
 * One small coach tip at a time, near the top of the map under the HUD (or inline in sheets).
 * A tip is marked seen when the player dismisses it or when the moment it described has passed.
 */
export function CoachTip({
  context,
  compact = false,
  action,
}: {
  context: Omit<CoachContext, "enabled">;
  compact?: boolean;
  action?: ReactNode;
}) {
  const tips = useSettings((s) => s.tips);
  const setSettings = useSettings((s) => s.set);
  const seen = useGameStore((s) => s.tipsSeen);
  const markTipSeen = useGameStore((s) => s.markTipSeen);
  const tip = nextTip(seen, { ...context, enabled: tips });
  const id = tip?.id ?? null;
  const shownId = useRef<string | null>(null);

  // A tip that was on screen and then went away counts as seen.
  useEffect(() => {
    const previous = shownId.current;
    if (tips && previous && previous !== id) markTipSeen(previous);
    shownId.current = id;
  }, [id, markTipSeen, tips]);

  if (!tip) return null;
  return (
    <aside
      aria-label="Tip"
      className={`note-in pointer-events-auto flex w-full flex-col border-[3px] border-ink bg-sign-yellow-soft text-ink shadow-[0_3px_0_var(--ink)] ${
        compact
          ? "min-h-11 rounded-[var(--r-chip)] py-1 pl-2.5 pr-1"
          : "max-w-[400px] rounded-[var(--r-panel)] py-1.5 pl-3 pr-1.5"
      }`}
    >
      <div className="flex w-full items-center gap-2">
        <span
          aria-hidden="true"
          className="flex size-6 shrink-0 rotate-45 items-center justify-center rounded-[5px] border-2 border-ink bg-sign-yellow text-[0.72rem] font-black text-ink"
        >
          <span className="-rotate-45 leading-none">!</span>
        </span>
        <p className={`min-w-0 flex-1 font-extrabold leading-snug ${compact ? "text-[0.8rem]" : "text-[0.88rem]"}`}>
          <LiveMessage>{tip.text}</LiveMessage>
        </p>
        <button
          type="button"
          className="min-h-11 shrink-0 px-1.5 text-xs font-extrabold text-ink-soft underline"
          onClick={() => setSettings({ tips: false })}
        >
          Skip tips
        </button>
        <button
          type="button"
          onClick={() => markTipSeen(tip.id)}
          aria-label="Dismiss tip"
          className="key key-sm press flex size-9 shrink-0 items-center justify-center [--lift:2px]"
        >
          <CloseIcon size={16} />
        </button>
      </div>
      {action && (
        <div className="mt-1 flex items-center justify-end pr-1">
          {action}
        </div>
      )}
    </aside>
  );
}
