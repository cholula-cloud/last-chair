import { useEffect, type ReactNode } from "react";
import { LiveMessage } from "./LiveMessage";
import { radioArrived } from "@/ui/feel";

/** Compact yellow warning diamond holding a broadcast-waves glyph. */
function RadioDiamond() {
  return (
    <svg
      viewBox="0 0 54 54"
      className="size-[30px] shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="9"
        y="9"
        width="36"
        height="36"
        rx="5"
        transform="rotate(45 27 27)"
        fill="var(--sign-yellow)"
        stroke="var(--ink)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <g
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2.8"
        strokeLinecap="round"
      >
        <circle cx="27" cy="27" r="2.6" fill="var(--ink)" stroke="none" />
        <path d="M31.5 22.5a6.4 6.4 0 0 1 0 9M22.5 22.5a6.4 6.4 0 0 0 0 9" />
        <path d="M35 19a11 11 0 0 1 0 16M19 19a11 11 0 0 0 0 16" />
      </g>
    </svg>
  );
}

const DEFAULT_SPEAKER = "Maris on Route 100 Radio";

/** Story beat from Route 100 Radio: a full-width broadcast card with integrated WVTK masthead. */
export function RadioCard({
  title,
  children,
  action,
  announce = true,
  from = DEFAULT_SPEAKER,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  announce?: boolean;
  /** Who is speaking. Maris unless a named caller is on the line. */
  from?: string;
}) {
  useEffect(() => { if (announce) radioArrived(); }, [announce]);
  return (
    <section
      aria-label={`Route 100 Radio: ${title}`}
      className="arrive panel mt-3 bg-sign-yellow-soft px-4 pb-3.5 pt-3 [--lift:4px]"
    >
      <header className="flex items-center gap-2 border-b-2 border-ink/15 pb-2.5">
        <RadioDiamond />
        <span className="shrink-0 rounded-md border-2 border-ink bg-sign-yellow px-1.5 py-0.5 text-[0.7rem] font-extrabold leading-none text-ink tabular-nums">
          100.7 WVTK
        </span>
        <span className="min-w-0 flex-1 text-[0.8rem] font-extrabold leading-snug text-ink-soft">
          {from}
        </span>
      </header>
      <p className="display mt-2.5 text-[1.22rem] leading-tight text-ink">{title}</p>
      <p className="mt-1.5 text-[0.95rem] font-bold leading-relaxed text-ink">
        <LiveMessage enabled={announce}>
          <span className="sr-only">
            {from === DEFAULT_SPEAKER ? `${title}. ` : `${title}. ${from} says: `}
          </span>
          {children}
        </LiveMessage>
      </p>
      {action && <div className="mt-3.5">{action}</div>}
    </section>
  );
}
