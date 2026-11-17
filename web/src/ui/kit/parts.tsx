import type { ReactNode } from "react";

/** Section header: serif small capitals on a pine plate. */
export function PlateHeading({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-2.5 mt-5 flex items-center gap-3 first:mt-1">
      <h3 className="plate rounded-[5px] px-2.5 py-0.5 text-[0.95rem]">
        {children}
      </h3>
      <span className="h-px flex-1 bg-ink/15" aria-hidden="true" />
      {aside && <span className="text-xs text-ink-soft">{aside}</span>}
    </div>
  );
}

export type Tone = "good" | "watch" | "bad" | "plain";

export const TONE_TEXT: Record<Tone, string> = {
  good: "text-pine",
  watch: "text-ochre",
  bad: "text-barn",
  plain: "text-ink",
};

/** Large ledger number with a small label underneath. */
export function StatTile({
  label,
  value,
  tone = "plain",
  note,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  note?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start">
      <span
        className={`num text-[2rem] font-semibold leading-none ${TONE_TEXT[tone]}`}
      >
        {value}
      </span>
      <span className="mt-1.5 text-[0.8rem] font-medium text-ink-soft">
        {label}
      </span>
      {note && (
        <span className={`text-[0.75rem] font-semibold ${TONE_TEXT[tone]}`}>
          {note}
        </span>
      )}
    </div>
  );
}

/** Kraft price tag. */
export function PriceTag({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      className={`tag num inline-flex h-7 shrink-0 items-center rounded-r-[5px] pr-2.5 text-[0.95rem] font-semibold ${
        muted ? "opacity-60" : ""
      }`}
    >
      {children}
    </span>
  );
}

export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  detail?: string;
  /** Expected effect, one short line under the detail (e.g. "~27 skiers"). */
  note?: string;
};

/**
 * Big segmented tiles (≥56 px). Buttons with aria-pressed so each reads as
 * a toggle; the group carries the label.
 */
export function ChoiceTiles<T extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: ChoiceOption<T>[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-3 gap-2">
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(opt.value)}
            className={`press relative flex min-h-[76px] flex-col items-center justify-center rounded-xl border-2 px-1.5 py-2 text-center ${
              on
                ? "border-amber bg-[#fff6ec] text-ink shadow-[0_2px_0_var(--amber)]"
                : "border-ink/15 bg-paper-deep/60 text-ink-soft hover:border-ink/30"
            }`}
          >
            {on && (
              <span
                className="absolute -top-2 right-1.5 flex size-5 items-center justify-center rounded-full bg-amber-fill text-white"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 12 12"
                  width="11"
                  height="11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M2.5 6.2 5 8.5l4.5-5" />
                </svg>
              </span>
            )}
            <span
              className={`text-[0.98rem] ${on ? "font-bold" : "font-semibold"}`}
            >
              {opt.label}
            </span>
            {opt.detail && (
              <span className="num mt-0.5 text-[0.8rem] font-medium">
                {opt.detail}
              </span>
            )}
            {opt.note && (
              <span
                className={`mt-0.5 text-[0.75rem] font-semibold leading-tight ${
                  on ? "text-pine" : "text-ink-soft"
                }`}
              >
                {opt.note}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The one amber action on a screen. */
export function PrimaryButton({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`press btn-primary flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[1.05rem] font-bold ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export type DeltaDirection = "up" | "down" | "same";

/** Change against yesterday: a glyph and words, so the direction never rests on colour alone. */
export function DeltaChip({
  direction,
  children,
  what,
}: {
  direction: DeltaDirection;
  /** The size of the change, already formatted ("6 pts", "$120"). Ignored when `same`. */
  children: ReactNode;
  /** Screen-reader name of the thing that changed ("Skiers"). */
  what: string;
}) {
  const tone =
    direction === "up" ? "text-pine" : direction === "down" ? "text-barn" : "text-ink-soft";
  const word = direction === "up" ? "up" : direction === "down" ? "down" : "unchanged";
  return (
    <span className={`num text-[0.8rem] font-semibold ${tone}`}>
      <span className="sr-only">{`${what} ${word}`}</span>
      {direction === "same" ? (
        <span aria-hidden="true">same</span>
      ) : (
        <span aria-hidden="true">
          {direction === "up" ? "\u25B2" : "\u25BC"} {children}
        </span>
      )}
    </span>
  );
}

/** Full-width disclosure button (≥48 px). Colour-only state change; the chevron flips without animating. */
export function DisclosureButton({
  open,
  controls,
  onToggle,
  children,
}: {
  open: boolean;
  controls: string;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      className={`press flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border-2 px-3.5 text-left text-[0.98rem] font-semibold text-ink ${
        open ? "border-amber bg-[#fff6ec]" : "border-ink/15 bg-paper-deep/60"
      }`}
    >
      <span>{children}</span>
      <svg
        viewBox="0 0 12 12"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={open ? "rotate-180" : ""}
        aria-hidden="true"
      >
        <path d="M2.5 4.5 6 8l3.5-3.5" />
      </svg>
    </button>
  );
}
