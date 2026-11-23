"use client";

import type { ReactNode } from "react";

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  title?: string;
  /** Overrides accessible name (defaults to label). */
  ariaLabel?: string;
  dataAttr?: Record<string, string>;
};

/** Recessed `.seg` track: one active choice pops green. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
  size = "md",
  layout = "row",
  role = "group",
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  className?: string;
  size?: "sm" | "md";
  /** Default row; `grid` wraps long option sets (e.g. village styles). */
  layout?: "row" | "grid";
  role?: "group" | "tablist";
}) {
  const btn =
    size === "sm"
      ? "seg-btn flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1 px-1.5 text-xs font-extrabold leading-snug"
      : "seg-btn flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 px-2 text-sm font-extrabold leading-snug";
  const track =
    layout === "grid"
      ? `seg grid grid-cols-2 gap-0.5 ${className}`
      : `seg flex gap-0.5 ${className}`;
  return (
    <div role={role} aria-label={ariaLabel} className={track}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role={role === "tablist" ? "tab" : undefined}
            aria-selected={role === "tablist" ? selected : undefined}
            aria-pressed={role === "tablist" ? undefined : selected}
            aria-label={opt.ariaLabel}
            disabled={opt.disabled}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={`${btn} ${
              role === "tablist" && selected ? "bg-sign-green text-white shadow-[0_2px_0_var(--ink)]" : ""
            }`}
            {...opt.dataAttr}
          >
            {opt.icon}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
