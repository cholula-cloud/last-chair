"use client";

import { useEffect, useRef } from "react";
import { PrimaryButton } from "@/ui/kit/parts";

export type BuildFact = { label: string; value: string };

export function BuildImpactCard({
  title, facts, problem, confirmLabel, onConfirm, onCancel,
}: {
  title: string;
  facts: readonly BuildFact[];
  problem?: string | null;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  return (
    <section aria-label={title} className="panel beat-swap overflow-y-auto px-3.5 pb-4 pt-3.5">
      <h3 ref={heading} tabIndex={-1} className="display text-lg outline-none">{title}</h3>
      <dl className="well my-2.5 grid grid-cols-1 gap-y-2 p-2.5 sm:grid-cols-2 sm:gap-x-3">
        {facts.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-2 sm:block">
            <dt className="text-xs font-bold text-ink-soft">{label}</dt>
            <dd className="text-sm font-extrabold tabular-nums sm:mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>
      {problem && <p role="status" className="mb-2 text-sm font-extrabold text-barn-deep">{problem}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="key press min-h-11 px-2 text-sm font-extrabold [--lift:3px]">
          Back
        </button>
        <PrimaryButton className="min-h-11" disabled={!!problem} onClick={onConfirm}>
          {confirmLabel}
        </PrimaryButton>
      </div>
    </section>
  );
}