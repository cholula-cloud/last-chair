import type { ReactNode } from "react";
import { MountainIcon } from "@/ui/kit/icons";

/** Section title inside a panel: display face, with an optional quiet aside on the right. */
export function SectionHeading({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-2.5 mt-5 flex items-baseline justify-between gap-3 first:mt-0">
      <h3 className="display text-[1.3rem] text-ink">{children}</h3>
      {aside && (
        <span className="text-[0.82rem] font-bold text-ink-soft">{aside}</span>
      )}
    </div>
  );
}

export type Tone = "good" | "watch" | "bad" | "plain";

/** Text colours that clear 4.5:1 on white and on snow-2. Watch has no safe yellow text, so it stays navy. */
export const TONE_TEXT: Record<Tone, string> = {
  good: "text-sign-green",
  watch: "text-ink",
  bad: "text-barn-deep",
  plain: "text-ink",
};

/** Small status chip fills: green, yellow, barn. Each pairs with a label colour that clears 4.5:1. */
export const TONE_CHIP: Record<Tone, string> = {
  good: "bg-sign-green text-white",
  watch: "bg-sign-yellow text-ink",
  bad: "bg-barn-deep text-white",
  plain: "bg-snow-2 text-ink",
};

/** Road-sign surface: coloured fill, outer navy outline, inner rim. */
export function Sign({
  tone = "green",
  className = "",
  innerClassName = "",
  tab,
  children,
}: {
  tone?: "green" | "brown";
  className?: string;
  innerClassName?: string;
  /** Small white tab chip overlapping the top edge, with a mountain glyph. */
  tab?: ReactNode;
  children: ReactNode;
}) {
  const toneClass =
    tone === "brown" ? "sign-brown" : "";
  return (
    <div className={`sign ${toneClass} ${tab ? "mt-5" : ""} ${className}`}>
      {tab && (
        <span className="chip absolute -top-[19px] left-4 z-10 flex h-7 items-center gap-1.5 px-2.5 text-[0.82rem] font-extrabold leading-none">
          <MountainIcon size={16} />
          {tab}
        </span>
      )}
      <div className={`sign-inner ${innerClassName}`}>{children}</div>
    </div>
  );
}

/** Large display number with a small label underneath. `onSign` is for the white-on-green summary sign. */
export function StatTile({
  label,
  value,
  tone = "plain",
  note,
  onSign = false,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  note?: ReactNode;
  onSign?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start">
      <span
        className={`display tabular-nums text-[1.75rem] ${onSign ? "text-white" : TONE_TEXT[tone]}`}
      >
        {value}
      </span>
      <span
        className={`mt-1 text-[0.82rem] font-bold leading-tight ${onSign ? "text-sign-green-ink" : "text-ink-soft"}`}
      >
        {label}
      </span>
      {note && (
        <span
          className={`text-[0.78rem] font-extrabold leading-tight ${onSign ? "text-sign-green-ink" : TONE_TEXT[tone]}`}
        >
          {note}
        </span>
      )}
    </div>
  );
}

/** Price chip. */
export function PriceTag({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-7 shrink-0 items-center rounded-[10px] border-2 border-ink bg-snow-2 px-2.5 text-[1rem] font-extrabold tabular-nums text-ink ${
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
  /** Small decorative glyph above the label (elevation peaks for fares). */
  glyph?: ReactNode;
};

/**
 * Big raised keys (at least 76 px). Buttons with aria-pressed so each reads as a
 * toggle; the group carries the label. The selected key turns green and sinks.
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
    <div role="group" aria-label={label} className="grid grid-cols-3 gap-2.5">
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(opt.value)}
            className="key press relative flex min-h-[84px] flex-col items-center justify-center px-1.5 py-2 text-center"
          >
            {on && (
              <span
                className="absolute -right-2 -top-2.5 flex size-6 items-center justify-center rounded-full border-2 border-ink bg-white text-ink"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 12 12"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.5 6.4 5 8.8l4.5-5.2" />
                </svg>
              </span>
            )}
            {opt.glyph && <span className="mb-0.5">{opt.glyph}</span>}
            <span className="text-[1rem] font-extrabold leading-tight">
              {opt.label}
            </span>
            {opt.detail && (
              <span className="mt-0.5 text-[0.85rem] font-bold tabular-nums">
                {opt.detail}
              </span>
            )}
            {opt.note && (
              <span
                data-muted
                className="mt-0.5 text-[0.75rem] font-bold leading-tight"
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

/** The one big action on a screen: a green guide-sign button, or brown for the end-of-day action. */
export function PrimaryButton({
  children,
  className = "",
  tone = "green",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "green" | "brown";
}) {
  return (
    <button
      type="button"
      className={`sign sign-btn press block w-full ${tone === "brown" ? "sign-brown" : ""} ${className}`}
      {...rest}
    >
      <span className="sign-inner display flex min-h-[42px] items-center justify-center gap-2 px-3 text-[1.3rem] short:min-h-[34px]">
        {children}
      </span>
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
    direction === "up"
      ? "text-sign-green"
      : direction === "down"
        ? "text-barn-deep"
        : "text-ink-soft";
  const word =
    direction === "up" ? "up" : direction === "down" ? "down" : "unchanged";
  return (
    <span className={`text-[0.85rem] font-extrabold tabular-nums ${tone}`}>
      <span className="sr-only">{`${what} ${word}`}</span>
      {direction === "same" ? (
        <span aria-hidden="true">same</span>
      ) : (
        <span aria-hidden="true">
          {direction === "up" ? "▲" : "▼"} {children}
        </span>
      )}
    </span>
  );
}

/** Full-width disclosure key (at least 48 px). The chevron flips without animating. */
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
      className="key press flex min-h-12 w-full items-center justify-between gap-3 px-3.5 text-left text-[1rem] font-extrabold"
    >
      <span>{children}</span>
      <svg
        viewBox="0 0 12 12"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
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

/** Game copy is written with spaced em dashes; the UI shows commas instead. */
export function tidy(text: string): string {
  return text.replace(/\s+\u2014\s+/g, ", ").replace(/\u2014/g, "none");
}
