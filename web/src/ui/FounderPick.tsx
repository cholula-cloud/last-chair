"use client";

import { FOUNDERS } from "@/game/content";
import { useGameStore } from "@/game/store";
import { PaperSheet } from "@/ui/kit/PaperSheet";

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
    <PaperSheet
      modal
      z="z-50"
      title="Dutch Hill · Winter 1"
      subtitle="Who signs the lease? Your founder’s quirks last the whole winter."
    >
      <ul className="grid gap-2.5 pt-1 sm:grid-cols-2">
        {FOUNDERS.map((f, i) => (
          <li
            key={f.id}
            className="arrive"
            style={{ transitionDelay: `${120 + i * 40}ms` }}
          >
            <button
              type="button"
              onClick={() => pickFounder(f.id)}
              className="press group relative flex h-full w-full overflow-hidden rounded-xl border border-ink/15 bg-white/55 text-left shadow-[0_1px_2px_rgb(11_22_40/0.15)] hover:border-ink/35"
            >
              <span
                className="flex w-[68px] shrink-0 flex-col items-center justify-center gap-1.5 py-3 text-paper"
                style={{ background: BADGE_TINT[i % BADGE_TINT.length] }}
              >
                <span
                  className="h-1.5 w-6 rounded-full bg-black/30"
                  aria-hidden="true"
                />
                <span
                  className="serif flex size-11 items-center justify-center rounded-full bg-paper text-[1.1rem] font-semibold"
                  style={{ color: BADGE_TINT[i % BADGE_TINT.length] }}
                  aria-hidden="true"
                >
                  {initials(f.name)}
                </span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5">
                <span className="serif text-[1.08rem] font-semibold leading-tight text-ink">
                  {f.name}
                </span>
                <span className="text-[0.8rem] font-semibold text-pine">
                  {f.title}
                </span>
                <span className="mt-1 text-[0.83rem] leading-snug text-ink-soft">
                  {f.blurb}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </PaperSheet>
  );
}
