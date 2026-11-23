"use client";

import { useGameStore } from "@/game/store";
import { undoableTrailIndex } from "@/game/rules";
import { DifficultyIcon } from "@/ui/kit/icons";
import { startPaintPlacement } from "@/ui/placementDraft";
import { PrimaryButton, SectionHeading } from "@/ui/kit/parts";

export function TrailsPanel({ onStartPlacement }: { onStartPlacement: () => void }) {
  const state = useGameStore();
  const open = state.trails.filter((t) => t.open);
  const canPaint = state.lifts.some((lift) => lift.confirmed);

  return (
    <div className="space-y-3">
      <div className="well-white p-3">
        <SectionHeading aside={open.length > 0 ? `${open.length} open` : undefined}>Trails</SectionHeading>
        {open.length === 0 ? (
          <p className="text-sm font-bold text-ink-soft">
            No open trails yet. Paint one from a lift top to start skiing.
          </p>
        ) : (
          <ul className="divide-y-2 divide-snow-2">
            {open.map((trail, index) => (
              <li key={`${trail.liftIndex}-${index}`} className="flex items-center gap-2 py-2 text-sm font-bold first:pt-0 last:pb-0">
                <DifficultyIcon difficulty={trail.difficulty} size={16} />
                <span className="min-w-0 flex-1 truncate">{trail.name}</span>
                <span className="tabular-nums text-ink-soft">{trail.lengthFt} ft</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <PrimaryButton className="min-h-11" disabled={!canPaint} onClick={() => {
        startPaintPlacement();
        onStartPlacement();
      }}>
        Paint a trail
      </PrimaryButton>
      {undoableTrailIndex(state) >= 0 && (
        <button type="button" className="key press min-h-11 w-full text-sm font-extrabold" onClick={() => state.undoTrail()}>
          Undo last trail cut
        </button>
      )}
    </div>
  );
}