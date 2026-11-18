"use client";

import { formatMoney } from "@/game/format";
import { trailOptions, undoableTrailIndex } from "@/game/rules";
import { useGameStore } from "@/game/store";
import { LIFT_LABELS, type LiftType } from "@/game/types";
import { DifficultyIcon } from "@/ui/kit/icons";
import { requestFocus } from "@/ui/placementDraft";
import { setTrailPreview } from "@/ui/trailPreview";
import { PrimaryButton, SectionHeading } from "@/ui/kit/parts";

export function TrailsPanel() {
  const lifts = useGameStore((s) => s.lifts);
  const trails = useGameStore((s) => s.trails);
  const cash = useGameStore((s) => s.cash);
  const cutTrail = useGameStore((s) => s.cutTrail);
  const undo = useGameStore((s) => s.undoTrail);
  const state = useGameStore((s) => s);
  const undoIdx = undoableTrailIndex(state);

  const openLifts = lifts
    .map((l, i) => ({ lift: l, index: i }))
    .filter(({ lift }) => lift.confirmed);

  if (openLifts.length === 0) return null;

  return (
    <div className="panel px-3.5 pb-4 pt-3.5 short:col-span-2">
      <SectionHeading>Trails</SectionHeading>
      <ul className="space-y-4">
        {openLifts.map(({ lift, index: liftIndex }) => {
          const onLift = trails.filter((t) => t.liftIndex === liftIndex && t.open);
          const opts = trailOptions(state, liftIndex);
          const type = lift.type as LiftType;
          return (
            <li key={liftIndex}>
              <p className="text-[0.9rem] font-extrabold text-ink-soft">
                {LIFT_LABELS[type]} top
              </p>
              <ul className="mt-1.5 space-y-1">
                {onLift.map((t, j) => (
                  <li
                    key={`${liftIndex}-${j}-${t.name}`}
                    className="flex items-center gap-2 text-[0.88rem] font-bold"
                  >
                    <DifficultyIcon difficulty={t.difficulty} size={16} />
                    <span className="min-w-0 flex-1 truncate">{t.name}</span>
                    <span className="tabular-nums text-ink-soft">{t.lengthFt} ft</span>
                  </li>
                ))}
              </ul>
              {opts.length > 0 && onLift.length < 3 && (
                <ul className="mt-2 space-y-1.5">
                  {opts.map((opt, oi) => {
                    const need = opt.cost - cash;
                    return (
                      <li key={`${liftIndex}-opt-${oi}`}>
                        <button
                          type="button"
                          disabled={need > 0}
                          className="key press flex w-full min-h-[52px] items-center gap-2 px-2.5 py-2 text-left"
                          onPointerEnter={() => {
                            setTrailPreview(opt.path);
                            requestFocus([lift.anchor, opt.path[0] ?? lift.anchor]);
                          }}
                          onPointerLeave={() => setTrailPreview(null)}
                          onClick={() => {
                            setTrailPreview(null);
                            requestFocus(opt.path);
                            cutTrail(liftIndex, oi);
                          }}
                        >
                          <DifficultyIcon difficulty={opt.difficulty} size={16} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[0.92rem] font-extrabold">{opt.name}</span>
                            <span className="block text-[0.78rem] font-bold text-ink-soft">
                              {opt.lengthFt} ft · {need > 0 ? `Need ${formatMoney(need)} more` : "Cut trail"}
                            </span>
                          </span>
                          <span className="display text-[0.95rem] tabular-nums">
                            {formatMoney(opt.cost)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {undoIdx >= 0 && (
        <PrimaryButton className="mt-3 min-h-10 w-full" onClick={() => undo()}>
          Undo last trail cut
        </PrimaryButton>
      )}
    </div>
  );
}