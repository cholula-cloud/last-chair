import type { ReactNode } from "react";

/** Yellow warning diamond holding a broadcast-waves glyph. */
function RadioDiamond() {
  return (
    <svg
      viewBox="0 0 54 54"
      className="pop size-[54px] shrink-0"
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
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <g
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2.6"
        strokeLinecap="round"
      >
        <circle cx="27" cy="27" r="2.6" fill="var(--ink)" stroke="none" />
        <path d="M31.5 22.5a6.4 6.4 0 0 1 0 9M22.5 22.5a6.4 6.4 0 0 0 0 9" />
        <path d="M35 19a11 11 0 0 1 0 16M19 19a11 11 0 0 0 0 16" />
      </g>
    </svg>
  );
}

/** Story beat from Route 100 Radio: a yellow diamond beside a speech bubble. */
export function RadioCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      aria-label={`Route 100 Radio: ${title}`}
      className="arrive mt-5 flex items-end gap-2"
    >
      <div className="mb-1.5">
        <RadioDiamond />
      </div>
      <div className="bubble min-w-0 flex-1 px-4 pb-3.5 pt-3">
        <p className="text-[0.88rem] font-extrabold leading-tight text-ink-soft">
          Maris on Route 100 Radio
        </p>
        <p className="display mt-1.5 text-[1.2rem] text-ink">{title}</p>
        <p className="mt-1 text-[1rem] font-bold leading-[1.4] text-ink">
          {children}
        </p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </section>
  );
}
