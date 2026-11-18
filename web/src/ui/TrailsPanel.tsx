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
    <div className="panel px-3.5 pb-4 pt-3.5 short:col-span-2">
      <SectionHeading>Trails</SectionHeading>
      <ul className="space-y-1">
        {open.map((trail, index) => (
          <li key={`${trail.liftIndex}-${index}`} className="flex items-center gap-2 text-sm font-bold">
            <DifficultyIcon difficulty={trail.difficulty} size={16} />
            <span className="min-w-0 flex-1 truncate">{trail.name}</span>
            <span className="tabular-nums text-ink-soft">{trail.lengthFt} ft</span>
          </li>
        ))}
      </ul>
      <PrimaryButton className="mt-3 min-h-11" disabled={!canPaint} onClick={() => {
        startPaintPlacement();
        onStartPlacement();
      }}>
        Paint a trail
      </PrimaryButton>
      {undoableTrailIndex(state) >= 0 && (
        <button type="button" className="key press mt-2 min-h-11 w-full text-sm font-extrabold" onClick={() => state.undoTrail()}>
          Undo last trail cut
        </button>
      )}
    </div>
  );
}
