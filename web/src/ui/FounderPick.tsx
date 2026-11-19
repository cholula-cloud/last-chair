"use client";

import { FOUNDERS } from "@/game/content";
import { useGameStore } from "@/game/store";
import { useSpeed } from "@/ui/speed";
import { Sheet } from "@/ui/kit/Sheet";

/** Badge stripe per founder, drawn from the scene's jacket palette. */
const BADGE_TINT = [
  "#2d5a4a",
  "#24313f",
  "#a8382b",
  "#2f5f9e",
  "#5d6b2f",
  "#7b4a8f",
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2);
}

export function FounderPick() {
  const phase = useGameStore((s) => s.phase);
  const pickFounder = useGameStore((s) => s.pickFounder);

  if (phase !== "setup") return null;

  return (
    <Sheet
      modal
      z="z-50"
      title="Dutch Hill, winter 1"
      subtitle="Who signs the lease? Your founder’s quirks last the whole winter."
    >
      <ul className="grid gap-3 pb-1 pt-1 sm:grid-cols-2">
        {FOUNDERS.map((f, i) => (
          <li
            key={f.id}
            className="arrive"
            style={{ transitionDelay: `${120 + i * 40}ms` }}
          >
            <button
              type="button"
              onClick={() => {
                useSpeed.getState().reset();
                pickFounder(f.id);
              }}
              className="key press flex h-full w-full overflow-hidden text-left"
            >
              <span
                className="flex w-[68px] shrink-0 items-center justify-center border-r-[3px] border-ink py-3"
                style={{ background: BADGE_TINT[i % BADGE_TINT.length] }}
              >
                <span
                  className="display flex size-11 items-center justify-center rounded-full border-[3px] border-ink bg-white text-[1.15rem]"
                  style={{ color: BADGE_TINT[i % BADGE_TINT.length] }}
                  aria-hidden="true"
                >
                  {initials(f.name)}
                </span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5">
                <span className="display text-[1.2rem]">{f.name}</span>
                <span className="text-[0.85rem] font-extrabold text-sign-green">
                  {f.title}
                </span>
                <span className="mt-1.5 flex items-start gap-1.5 text-[0.85rem] font-bold leading-snug text-ink">
                  <span aria-hidden="true" className="mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full bg-sign-green text-[0.8rem] font-extrabold leading-none text-white">+</span>
                  <span><span className="sr-only">Bonus: </span>{f.bonus}</span>
                </span>
                <span className="mt-1 flex items-start gap-1.5 text-[0.85rem] font-bold leading-snug text-ink-soft">
                  <span aria-hidden="true" className="mt-px flex size-[18px] shrink-0 items-center justify-center text-[0.95rem] leading-none text-[#a8382b]">&#9670;</span>
                  <span><span className="sr-only">Cost: </span>{f.constraint}</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
