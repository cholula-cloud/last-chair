"use client";

import type { GoalChip } from "@/game/goals";

/** Deterministic slight offsets so hand-punched ride holes feel tactile rather than stamped on a ruler. */
const PUNCH_OFFSETS = [
  "translate-x-[1px] -translate-y-[1px]",
  "-translate-x-[1px] translate-y-[1px]",
  "translate-x-[0.5px] translate-y-[1px]",
  "-translate-x-[1px] -translate-y-[0.5px]",
  "translate-x-[1px] translate-y-0",
  "-translate-x-[0.5px] -translate-y-[1px]",
  "translate-x-0 translate-y-[1px]",
  "translate-x-[1px] -translate-y-[0.5px]",
  "-translate-x-[1px] translate-y-[0.5px]",
  "translate-x-[0.5px] -translate-y-[1px]",
  "-translate-x-[0.5px] translate-y-[1px]",
  "translate-x-[0.5px] translate-y-[0.5px]",
] as const;

export function TicketWicketHole() {
  return (
    <span
      aria-hidden="true"
      className="absolute left-1/2 top-2 z-10 size-3.5 -translate-x-1/2 rounded-full border-2 border-ink bg-[#15293e] shadow-[inset_0_2px_2px_rgba(0,0,0,0.65)] ring-2 ring-[#f8efd4]/85"
    />
  );
}

export function TicketStub({ left, right }: { left: string; right: string }) {
  return (
    <div className="relative mt-auto flex items-center justify-between border-t-2 border-dashed border-ink/40 bg-[#f2e3bc] px-4 py-2.5 text-xs">
      <span
        aria-hidden="true"
        className="absolute -left-2.5 -top-2.5 size-4 rounded-full border-[3px] border-ink bg-[#15293e]"
      />
      <span
        aria-hidden="true"
        className="absolute -right-2.5 -top-2.5 size-4 rounded-full border-[3px] border-ink bg-[#15293e]"
      />
      <span className="font-bold text-ink-soft tabular-nums">{left}</span>
      <span className="font-extrabold text-ink">{right}</span>
    </div>
  );
}

/**
 * Grammy Dot's authentic 12-ride cardstock lift ticket.
 * Shared between the Cold Open flip reveal and the Winter Review last-chair punch ceremony.
 */
export function PunchCard({
  mode,
  flipped = false,
  onToggleFlip,
  hillName = "Dutch Hill Ski Area",
  seasonBadge = "1984-85",
  operatorLabel,
  twelfthPunched = false,
  canPunchTwelfth = false,
  onPunchTwelfth,
  ribbons = [],
}: {
  mode: "cold-open" | "winter-review";
  flipped?: boolean;
  onToggleFlip?: () => void;
  hillName?: string;
  seasonBadge?: string;
  operatorLabel?: string;
  twelfthPunched?: boolean;
  canPunchTwelfth?: boolean;
  onPunchTwelfth?: () => void;
  ribbons?: GoalChip[];
}) {
  if (mode === "cold-open") {
    return (
      <button
        type="button"
        onClick={onToggleFlip}
        aria-label={
          flipped
            ? "One ride left on the punch card. Tap to continue."
            : "Tap Grammy Dot's 1984-85 punch card to turn it over."
        }
        className="punch-card-scene press-scale pointer-events-auto w-full max-w-xs text-left text-ink"
      >
        <div
          data-flipped={flipped ? "true" : "false"}
          className="punch-card-inner grid"
        >
          <div className="punch-card-face col-start-1 row-start-1 flex flex-col overflow-hidden rounded-[22px] border-[3px] border-ink bg-[#f8efd4] shadow-[0_6px_0_var(--ink)]">
            <TicketWicketHole />
            <div className="flex items-center justify-between border-b-[3px] border-ink bg-sign-green px-4 pb-2.5 pt-6 text-white">
              <span className="text-[0.82rem] font-extrabold text-sign-green-ink">
                {hillName}
              </span>
              <span className="rounded-md border-2 border-ink bg-sign-yellow px-2 py-0.5 text-[0.72rem] font-extrabold text-ink tabular-nums">
                {seasonBadge}
              </span>
            </div>
            <div className="px-4 pb-3 pt-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="display text-[1.22rem] leading-none text-ink">
                  Season Punch Card
                </p>
                <span className="text-xs font-extrabold text-ink-soft">
                  12 rides
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-6 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => {
                  const unpunched = i === 11;
                  if (unpunched) {
                    return (
                      <span
                        key={i}
                        className="flex h-11 flex-col items-center justify-center rounded-md border-2 border-ink bg-sign-yellow-soft px-1 py-1"
                      >
                        <span className="flex size-6 items-center justify-center rounded-full border-2 border-ink bg-sign-yellow text-[0.7rem] font-extrabold leading-none text-ink shadow-[0_1px_0_var(--ink)] tabular-nums">
                          12
                        </span>
                      </span>
                    );
                  }
                  return (
                    <span
                      key={i}
                      className="relative flex h-11 flex-col items-center justify-between rounded-md border border-ink/25 bg-[#f3e4bd] py-1"
                    >
                      <span className="text-[0.58rem] font-extrabold leading-none text-ink-soft/85 tabular-nums">
                        {i + 1}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`size-[18px] rounded-full border-2 border-ink bg-[#15293e] shadow-[inset_0_2px_2px_rgba(0,0,0,0.65)] ${PUNCH_OFFSETS[i]}`}
                      />
                    </span>
                  );
                })}
              </div>
            </div>
            <TicketStub left="No. 01985" right="Tap to turn over" />
          </div>

          <div className="punch-card-face punch-card-back col-start-1 row-start-1 flex flex-col overflow-hidden rounded-[22px] border-[3px] border-ink bg-[#f8efd4] shadow-[0_6px_0_var(--ink)]">
            <TicketWicketHole />
            <div className="flex items-center justify-between border-b-[3px] border-ink bg-[#efe0b5] px-4 pb-2.5 pt-6 text-xs font-extrabold">
              <span className="text-sign-brown">Grammy Dot’s ticket box</span>
              <span className="text-ink-soft tabular-nums">March 1985</span>
            </div>
            <div className="flex flex-1 flex-col justify-between px-4 pb-3 pt-3">
              <div className="flex items-center gap-3">
                <span className="display flex size-12 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-sign-yellow text-base text-ink shadow-[0_2px_0_var(--ink)]">
                  12
                </span>
                <div className="min-w-0">
                  <p className="display text-[1.2rem] leading-tight text-ink">
                    One ride left
                  </p>
                  <p className="mt-0.5 text-xs font-bold leading-snug text-ink-soft">
                    Eleven punched. Number twelve is still whole.
                  </p>
                </div>
              </div>
              <div
                aria-hidden="true"
                className="mt-3 flex items-center justify-between gap-1 rounded-lg border border-ink/25 bg-[#f2e3bc] px-2.5 py-2"
              >
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-sign-yellow text-[0.52rem] font-extrabold leading-none text-ink">
                  12
                </span>
                {Array.from({ length: 11 }, (_, i) => (
                  <span
                    key={i}
                    className="size-3 rounded-full border-[1.5px] border-ink bg-[#15293e] shadow-[inset_0_1px_2px_rgba(0,0,0,0.65)]"
                  />
                ))}
              </div>
            </div>
            <TicketStub left="Keep till closing" right="Tap to continue." />
          </div>
        </div>
      </button>
    );
  }

  return (
    <section
      aria-label="Season punch card"
      className="relative mt-4 flex flex-col overflow-hidden rounded-[22px] border-[3px] border-ink bg-[#f8efd4] text-ink shadow-[0_4px_0_var(--ink)]"
    >
      <TicketWicketHole />
      <div className="flex items-center justify-between border-b-[3px] border-ink bg-sign-green px-4 pb-2.5 pt-6 text-white">
        <span className="text-[0.82rem] font-extrabold text-sign-green-ink">
          {hillName}
        </span>
        <span className="rounded-md border-2 border-ink bg-sign-yellow px-2 py-0.5 text-[0.72rem] font-extrabold text-ink tabular-nums">
          {seasonBadge}
        </span>
      </div>

      <div className="space-y-3 px-4 pb-3 pt-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="display text-[1.15rem] leading-none text-ink">
            Last Chair Card
          </p>
          {operatorLabel && (
            <span className="text-xs font-extrabold text-ink-soft">
              {operatorLabel}
            </span>
          )}
        </div>

        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => {
            const isTwelfth = i === 11;
            const punched = !isTwelfth || twelfthPunched;
            if (!punched) {
              return (
                <span
                  key={i}
                  className="flex h-10 flex-col items-center justify-center rounded-md border-2 border-ink bg-sign-yellow-soft px-1 py-1"
                >
                  <span className="flex size-5 items-center justify-center rounded-full border-2 border-ink bg-sign-yellow text-[0.65rem] font-extrabold leading-none text-ink tabular-nums">
                    12
                  </span>
                </span>
              );
            }
            return (
              <span
                key={i}
                className={`relative flex h-10 flex-col items-center justify-between rounded-md border border-ink/25 py-1 ${
                  isTwelfth ? "bg-sign-yellow-soft ring-2 ring-ink/35" : "bg-[#f3e4bd]"
                }`}
              >
                <span className="text-[0.55rem] font-extrabold leading-none text-ink-soft/85 tabular-nums">
                  {i + 1}
                </span>
                <span
                  aria-hidden="true"
                  className={`size-[16px] rounded-full border-2 border-ink bg-[#15293e] shadow-[inset_0_2px_2px_rgba(0,0,0,0.65)] ${PUNCH_OFFSETS[i]}`}
                />
              </span>
            );
          })}
        </div>

        {ribbons.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5" aria-label="Winter ribbons">
            {ribbons.slice(0, 3).map((r) => {
              const done = r.status === "Done";
              return (
                <div
                  key={r.id}
                  className={`rounded-lg border-2 border-ink px-2 py-1.5 text-center ${
                    done ? "bg-sign-green text-white" : "bg-white/75 text-ink-soft"
                  }`}
                >
                  <p className="truncate text-[0.68rem] font-extrabold leading-tight">
                    {r.label}
                  </p>
                  <p className={`mt-0.5 text-[0.62rem] font-extrabold ${done ? "text-sign-yellow" : "text-ink-soft"}`}>
                    {r.status}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {canPunchTwelfth && !twelfthPunched && onPunchTwelfth && (
          <button
            type="button"
            onClick={onPunchTwelfth}
            className="key key-solid press flex min-h-11 w-full items-center justify-center px-3 text-sm font-extrabold [--key-fill:var(--sign-yellow)] [--lift:3px]"
          >
            Punch the last chair
          </button>
        )}
      </div>

      <TicketStub
        left={twelfthPunched ? "12 of 12 punched" : "11 of 12 punched"}
        right={twelfthPunched ? "Lights stayed on" : "One ride left"}
      />
    </section>
  );
}
