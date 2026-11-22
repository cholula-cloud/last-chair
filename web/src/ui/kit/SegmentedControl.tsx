"use client";

type Option<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
  title?: string;
  /** Overrides accessible name (defaults to label). */
  ariaLabel?: string;
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
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  className?: string;
  size?: "sm" | "md";
  /** Default row; `grid` wraps long option sets (e.g. village styles). */
  layout?: "row" | "grid";
}) {
  const btn =
    size === "sm"
      ? "seg-btn flex min-h-9 min-w-0 flex-1 items-center justify-center px-2 text-xs font-extrabold leading-snug"
      : "seg-btn flex min-h-11 min-w-0 flex-1 items-center justify-center px-2.5 text-sm font-extrabold leading-snug";
  const track =
    layout === "grid"
      ? `seg grid grid-cols-2 gap-0.5 ${className}`
      : `seg flex gap-0.5 ${className}`;
  return (
    <div role="group" aria-label={ariaLabel} className={track}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          aria-label={opt.ariaLabel}
          disabled={opt.disabled}
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={btn}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
