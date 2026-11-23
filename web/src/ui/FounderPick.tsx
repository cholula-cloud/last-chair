"use client";

import { useState } from "react";
import { FOUNDERS, WINTER_GOAL } from "@/game/content";
import { useGameStore } from "@/game/store";
import type { FounderId } from "@/game/types";
import { useSpeed } from "@/ui/speed";
import { PrimaryButton } from "@/ui/kit/parts";
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
  const [selectedId, setSelectedId] = useState<FounderId>(FOUNDERS[0]!.id);
  if (phase !== "setup") return null;

  const selectedIndex = Math.max(0, FOUNDERS.findIndex((f) => f.id === selectedId));
  const selected = FOUNDERS[selectedIndex] ?? FOUNDERS[0]!;
  const tint = BADGE_TINT[selectedIndex % BADGE_TINT.length]!;

  const detailCard = (
    <section
      key={selected.id}
      aria-label="Partner details"
      className="panel beat-swap flex flex-col gap-2.5 p-3.5"
    >
      <div className="flex items-center gap-3">
        <span
          className="display flex size-12 shrink-0 items-center justify-center rounded-full border-[3px] border-ink text-[1.15rem] text-white"
          style={{ background: tint }}
          aria-hidden="true"
        >
          {initials(selected.name)}
        </span>
        <div className="min-w-0">
          <h3 className="display text-[1.3rem] leading-tight text-ink">{selected.name}</h3>
          <p className="text-[0.85rem] font-extrabold text-sign-green">{selected.title}</p>
        </div>
      </div>

      <p className="text-[0.88rem] font-bold leading-snug text-ink-soft">
        {selected.relationship}
      </p>

      <div className="well space-y-1.5 p-2.5 text-[0.85rem] font-bold leading-snug">
        <p className="text-sign-green">
          <span aria-hidden="true">+ </span>
          <span className="sr-only">Benefit: </span>
          {selected.bonus}
        </p>
        <p className="text-barn-deep">
          <span aria-hidden="true">- </span>
          <span className="sr-only">Tradeoff: </span>
          {selected.constraint}
        </p>
      </div>
    </section>
  );

  return (
    <Sheet
      modal
      wide
      z="z-50"
      title="Dutch Hill, winter 1"
      subtitle="Pick a partner to sign the Dutch Hill lease with you."
      aside={detailCard}
      footer={
        <PrimaryButton
          onClick={() => {
            useSpeed.getState().reset();
            pickFounder(selected.id);
          }}
        >
          Sign lease with {selected.name}
        </PrimaryButton>
      }
    >
      <p className="mb-3 text-sm font-bold leading-snug">
        <strong>Winter goal:</strong> {WINTER_GOAL}
      </p>
      <ul
        role="group"
        aria-label="Founders"
        className="grid grid-cols-2 gap-2 pb-1 sm:grid-cols-3 md:grid-cols-2"
      >
        {FOUNDERS.map((f, i) => {
          const active = f.id === selected.id;
          const color = BADGE_TINT[i % BADGE_TINT.length]!;
          return (
            <li key={f.id}>
              <button
                type="button"
                data-founder-id={f.id}
                aria-pressed={active}
                onClick={() => setSelectedId(f.id)}
                className="key press flex h-full min-h-[68px] w-full items-center gap-2.5 px-2.5 py-2 text-left [--lift:3px]"
              >
                <span
                  className="display flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-white text-[0.9rem]"
                  style={{ color }}
                  aria-hidden="true"
                >
                  {initials(f.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.88rem] font-extrabold leading-tight">
                    {f.name}
                  </span>
                  <span data-muted className="mt-0.5 block text-[0.72rem] font-bold leading-tight">
                    {f.title}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}