"use client";

import { useGameStore } from "@/game/store";
import { trailToggleProblem, undoableTrailIndex } from "@/game/rules";
import { ropeToggled } from "@/ui/feel";
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
        {state.trails.length === 0 ? (
          <p className="text-sm font-bold text-ink-soft">
            No trails yet. Paint one from a lift top to start skiing.
          </p>
        ) : (
          <ul className="divide-y-2 divide-snow-2">
            {state.trails.map((trail, index) => {
              const problem = trail.open ? trailToggleProblem(state, index) : null;
              return (
                <li key={`${trail.liftIndex}-${index}`} className="flex items-center gap-2 py-2 text-sm font-bold first:pt-0 last:pb-0">
                  <DifficultyIcon difficulty={trail.difficulty} size={16} />
                  <span className="min-w-0 flex-1 truncate">
                    {trail.name}
                    {!trail.open && <span className="ml-1.5 text-xs text-barn-deep">(Roped off)</span>}
                  </span>
                  <span className="tabular-nums text-ink-soft">{trail.lengthFt} ft</span>
                  {state.phase === "day" && (
                    <button
                      type="button"
                      disabled={Boolean(problem)}
                      onClick={() => {
                        state.toggleTrailOpen(index);
                        ropeToggled();
                      }}
                      className="key key-sm press min-h-9 px-2 text-xs font-extrabold [--lift:2px]"
                    >
                      {trail.open ? "Rope off" : "Reopen"}
                    </button>
                  )}
                </li>
              );
            })}
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