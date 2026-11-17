import type { ReactNode } from "react";

/** Tuning dial with the needle parked on 100. */
function Dial() {
  const ticks = Array.from({ length: 11 }, (_, i) => i);
  return (
    <svg viewBox="0 0 120 34" className="h-[30px] w-[104px]" aria-hidden="true">
      <rect
        x="1"
        y="1"
        width="118"
        height="32"
        rx="6"
        fill="#f3e2b8"
        stroke="#8a6a2c"
        strokeWidth="1.2"
      />
      {ticks.map((i) => (
        <line
          key={i}
          x1={10 + i * 10}
          x2={10 + i * 10}
          y1={i % 5 === 0 ? 8 : 11}
          y2="17"
          stroke="#5a4520"
          strokeWidth={i % 5 === 0 ? 1.4 : 0.9}
        />
      ))}
      <text
        x="10"
        y="28"
        fontSize="7"
        fill="#5a4520"
        textAnchor="middle"
        fontFamily="serif"
      >
        88
      </text>
      <text
        x="60"
        y="28"
        fontSize="7"
        fill="#5a4520"
        textAnchor="middle"
        fontFamily="serif"
      >
        98
      </text>
      <text
        x="110"
        y="28"
        fontSize="7"
        fill="#5a4520"
        textAnchor="middle"
        fontFamily="serif"
      >
        108
      </text>
      <line
        x1="70"
        x2="70"
        y1="4"
        y2="22"
        stroke="#c94b18"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Story beat delivered as a little transistor radio on the night slip. */
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
      className="arrive mt-4 overflow-hidden rounded-2xl bg-gradient-to-b from-[#1b2c47] to-navy text-paper shadow-[0_6px_18px_-6px_rgb(11_22_40/0.6)] ring-1 ring-black/30"
    >
      <div className="flex items-center gap-3 px-3.5 pb-2 pt-3">
        <span
          className="size-11 shrink-0 rounded-full ring-2 ring-[#2c4166]"
          style={{
            background:
              "radial-gradient(circle, #6b7d9c 0 1.2px, transparent 1.6px) 0 0 / 5px 5px, #101d33",
          }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="serif text-[1.05rem] font-semibold leading-tight">
            Route 100 Radio
          </p>
          <p className="text-[0.78rem] text-[#b9c2cf]">with Maris Shaw</p>
        </div>
        <Dial />
      </div>
      <div className="paper mx-2 mb-2 rounded-xl px-3.5 py-3">
        <p className="serif text-[0.95rem] font-semibold text-pine">{title}</p>
        <p className="mt-1 text-[0.95rem] leading-relaxed text-ink">
          {children}
        </p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </section>
  );
}
