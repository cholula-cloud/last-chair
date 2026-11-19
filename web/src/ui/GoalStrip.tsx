"use client";

import { useState } from "react";
import { daysLeftLine, goalChips } from "@/game/goals";
import { useGameStore } from "@/game/store";

/** Compact winter goal under the HUD date: three chips with done or to do state. Tap one for a sentence. */
export function GoalStrip() {
  const lodgeTier = useGameStore((s) => s.lodgeTier);
  const schoolContract = useGameStore((s) => s.schoolContract);
  const outcome = useGameStore((s) => s.outcome);
  const cash = useGameStore((s) => s.cash);
  const loan = useGameStore((s) => s.loan);
  const payables = useGameStore((s) => s.payables);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const seasonLength = useGameStore((s) => s.seasonLength);
  const [open, setOpen] = useState<string | null>(null);
  const chips = goalChips({ lodgeTier, schoolContract, outcome, cash, loan, payables });
  const shown = chips.find((c) => c.id === open);

  return (
    <section aria-label="Winter goal" data-coach="goal" className="mt-1.5">
      <ul className="flex flex-wrap items-center gap-1.5">
        <li className="chip flex min-h-11 items-center px-2.5 text-[0.8rem] font-extrabold">
          {daysLeftLine(dayIndex, seasonLength)}
        </li>
        {chips.map((chip) => (
          <li key={chip.id}>
            <button
              type="button"
              aria-expanded={open === chip.id}
              aria-label={`${chip.label}, ${chip.done ? "done" : "not done"}`}
              onClick={() => setOpen((cur) => (cur === chip.id ? null : chip.id))}
              className={`chip press flex min-h-11 items-center gap-1.5 px-2.5 text-[0.8rem] font-extrabold ${
                chip.done ? "bg-sign-green text-white" : ""
              }`}
            >
              <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center rounded-full border-2 border-current text-[0.65rem] leading-none">
                {chip.done ? "✓" : ""}
              </span>
              {chip.label}
            </button>
          </li>
        ))}
      </ul>
      {shown && (
        <p role="status" className="chip mt-1.5 w-fit max-w-full px-3 py-1.5 text-[0.82rem] font-bold leading-snug">
          {shown.explainer}
        </p>
      )}
    </section>
  );
}
