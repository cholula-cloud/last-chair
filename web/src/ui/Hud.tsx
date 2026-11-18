"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { formatMoney } from "@/game/format";
import { formatClock, weekdayLabel } from "@/game/sim";
import type { WeatherKind } from "@/game/types";
import {
  BuildIcon,
  CloseIcon,
  GuestsIcon,
  HomeIcon,
  MoodIcon,
  MountainMoonIcon,
  PauseIcon,
  PlayIcon,
  QueueIcon,
  RecenterIcon,
  SnowIcon,
  SnowfallIcon,
  SunIcon,
  ThawIcon,
} from "@/ui/kit/icons";
import { TONE_CHIP, type Tone } from "@/ui/kit/parts";
import { useSpeed } from "@/ui/speed";

/** Top bar: green play key, a white day and clock chip, and the gold cash chip. */
export function TopBar({
  dayIndex,
  seasonLength,
  clockMin,
  cash,
  paused,
  notStarted,
  onTogglePause,
}: {
  dayIndex: number;
  seasonLength: number;
  clockMin: number;
  cash: number;
  paused: boolean;
  notStarted: boolean;
  onTogglePause: () => void;
}) {
  const speed = useSpeed((s) => s.speed);
  const cycleSpeed = useSpeed((s) => s.cycle);
  return (
    <div className="flex w-full items-center gap-2 sm:w-[min(28rem,100%)]">
      <button
        type="button"
        onClick={onTogglePause}
        aria-label={paused ? "Resume day" : "Pause day"}
        className={`sign sign-btn press flex size-12 shrink-0 items-center justify-center [--lift:4px] ${
          notStarted ? "pulse-ring" : ""
        }`}
      >
        {paused ? <PlayIcon size={22} /> : <PauseIcon size={22} />}
      </button>
      <div className="chip flex h-12 min-w-0 flex-1 items-center gap-2 px-3">
        <div className="flex flex-col leading-tight">
          <span className="whitespace-nowrap text-[0.9rem] font-extrabold tabular-nums">
            Day {dayIndex}/{seasonLength}
          </span>
          <span className="text-[0.75rem] font-bold text-ink-soft">
            {weekdayLabel(dayIndex)}
          </span>
        </div>
        <ClockText text={formatClock(clockMin)} />
      </div>
      <button
        type="button"
        onClick={cycleSpeed}
        aria-label={`Game speed ${speed}x, tap to change`}
        className="chip flex size-12 shrink-0 items-center justify-center text-[0.95rem] font-extrabold tabular-nums"
      >
        {speed}x
      </button>
      <span
        className={`chip display flex h-12 min-w-[5rem] shrink-0 items-center justify-center px-2.5 text-[1.2rem] tabular-nums sm:min-w-[5.6rem] sm:px-3 sm:text-[1.3rem] ${
          cash < 0 ? "bg-barn-deep text-white" : "bg-gold"
        }`}
      >
        {formatMoney(cash)}
      </span>
    </div>
  );
}

/** "6:00 am" with the meridiem set small, so the time never wraps. */
function ClockText({ text }: { text: string }) {
  const [time, meridiem] = text.split(" ");
  return (
    <span className="display ml-auto min-w-[4.6rem] whitespace-nowrap text-right text-[1.25rem] tabular-nums">
      {time}
      {meridiem && (
        <span className="ml-0.5 font-sans text-[0.8rem] font-extrabold text-ink-soft">
          {meridiem.toLowerCase()}
        </span>
      )}
    </span>
  );
}

const WEATHER: Record<WeatherKind, { label: string; icon: ReactNode }> = {
  snow: { label: "Fresh snow", icon: <SnowfallIcon size={20} /> },
  clear: { label: "Clear skies", icon: <SunIcon size={20} /> },
  thaw: { label: "Thaw", icon: <ThawIcon size={20} /> },
};

/** Morning note: weather + headline (+ what the crew learned overnight). */
export function MorningNote({
  weather,
  headline,
  crewLine,
  overnightLine,
  expanded,
  onDismiss,
  onExpand,
}: {
  weather: WeatherKind;
  headline: string;
  crewLine: string | null;
  /** What last night's Snow & service cost ("Overnight: High snow & service, −$350"), if anything. */
  overnightLine?: string | null;
  expanded?: boolean;
  onDismiss: () => void;
  onExpand?: () => void;
}) {
  const w = WEATHER[weather];
  return (
    <aside
      aria-label="Morning note"
      className="panel note-in pointer-events-auto flex w-full max-w-[400px] items-center gap-2 py-1 pl-2 pr-1.5 [--lift:3px]"
    >
      <button
        type="button"
        onClick={onExpand}
        aria-label="Show full morning note"
        className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sky text-ink"
      >
        {w.icon}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-[0.8rem] font-bold leading-snug ${expanded ? "" : "line-clamp-2"}`}>
          <span className="font-extrabold">{w.label}.</span> {headline}
        </p>
        {overnightLine && (
          <p className="mt-0.5 truncate text-[0.74rem] font-bold tabular-nums text-ink-soft">{overnightLine}</p>
        )}
        {crewLine && (
          <p className="mt-0.5 truncate text-[0.8rem] font-extrabold text-sign-green">{crewLine}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss morning note"
        className="key key-sm press flex size-11 shrink-0 items-center justify-center"
      >
        <CloseIcon size={18} />
      </button>
    </aside>
  );
}

/** Small navy callout under the play key on the very first morning. */
export function StartCallout() {
  return (
    <p className="callout-in pointer-events-none relative ml-2 mt-2.5 w-max rounded-xl border-[3px] border-ink bg-ink px-3 py-1.5 text-[0.88rem] font-extrabold text-white">
      <span
        className="absolute -top-2 left-[1.15rem] size-3 rotate-45 bg-ink"
        aria-hidden="true"
      />
      <span className="relative">Tap the play key to open the hill</span>
    </p>
  );
}

type Condition = {
  key: string;
  icon: ReactNode;
  label: string;
  value: string;
  state: string;
  detail?: string;
  /** The state already names the thing; skip the trailing label. */
  bare?: boolean;
  tone: Tone;
};

function band(v: number, good: number, watch: number): Tone {
  return v >= good ? "good" : v >= watch ? "watch" : "bad";
}

function worse(a: Tone, b: Tone): Tone {
  const rank: Tone[] = ["good", "watch", "bad"];
  return rank.indexOf(a) > rank.indexOf(b) ? a : b;
}

/** Conditions board: queue, snow, mood with icon, number and a word chip. */
export function ConditionsBoard({
  avgQueue,
  snowQuality,
  snowDepth,
  snowRead,
  mood,
  anyOnHill = true,
}: {
  avgQueue: number;
  /** False until a guest is on the hill: the queue then reads "No line yet" instead of 0.0m. */
  anyOnHill?: boolean;
  snowQuality: number;
  snowDepth: number;
  /** "tone|label" of the worst trail segment (see snow.ts `readSnow`). */
  snowRead: string;
  mood: number;
}) {
  const queueTone: Tone =
    avgQueue < 3 ? "good" : avgQueue < 5 ? "watch" : "bad";
  const [readTone, snowLabel] = snowRead.split("|");
  // The worst segment sets the word; the mean quality and depth can only make the tone worse.
  const snowTone = worse(
    worse(readTone as Tone, band(snowQuality, 0.7, 0.45)),
    band(snowDepth, 0.6, 0.35),
  );
  const moodTone = band(mood, 70, 50);
  const items: Condition[] = [
    {
      key: "queue",
      icon: <QueueIcon />,
      label: "Queue",
      value: anyOnHill ? `${avgQueue.toFixed(1)}m` : "No line",
      state: anyOnHill
        ? { good: "Short", watch: "Busy", bad: "Long", plain: "" }[queueTone]
        : "yet",
      bare: !anyOnHill,
      tone: anyOnHill ? queueTone : "plain",
    },
    {
      key: "snow",
      icon: <SnowIcon />,
      label: "Snow",
      value: `${Math.round(snowQuality * 100)}%`,
      state: snowLabel,
      bare: true,
      detail: `mean quality, depth ${Math.round(snowDepth * 100)}%`,
      tone: snowTone,
    },
    {
      key: "mood",
      icon: <MoodIcon mood={mood} />,
      label: "Mood",
      value: `${mood}%`,
      state: { good: "Happy", watch: "Mixed", bad: "Grumpy", plain: "" }[
        moodTone
      ],
      tone: moodTone,
    },
  ];
  return (
    <section
      aria-label="Conditions"
      className="panel pointer-events-auto grid w-full grid-cols-3 divide-x-2 divide-snow-2 py-2"
    >
      {items.map((c) => (
        <div
          key={c.key}
          className="flex min-w-0 items-center gap-1.5 px-2"
          aria-label={`${c.label} ${c.value}${c.detail ? ` ${c.detail}` : ""}, ${c.state}`}
          role="group"
        >
          <span className="shrink-0 text-ink">{c.icon}</span>
          <div className="flex min-w-0 flex-col items-start gap-0.5 leading-none">
            <span className="display text-[1.15rem] tabular-nums">
              {c.value}
            </span>
            <span
              className={`max-w-full truncate rounded-md px-1.5 py-0.5 text-[0.7rem] font-extrabold leading-none ${TONE_CHIP[c.tone]}`}
            >
              {c.state}
              {c.bare ? null : (
                <span className="sr-only">{` ${c.label.toLowerCase()}`}</span>
              )}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}

function BarButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="key press flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.85rem] font-extrabold [--lift:4px]"
    >
      {icon}
      {label}
    </button>
  );
}

/** Round on-map button that glides the camera back to the home view. */
export function RecenterButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Recenter the view"
      className="key press pointer-events-auto flex size-12 shrink-0 items-center justify-center !rounded-full [--lift:4px]"
    >
      <RecenterIcon size={22} />
    </button>
  );
}

/** Shown after a pan drag ended follow; restores it. */
export function ResumeFollowChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="chip press pointer-events-auto flex h-11 items-center px-4 text-[0.85rem] font-extrabold"
    >
      Resume follow
    </button>
  );
}

/** Thumb-zone action row: Menu (with a confirm step), Build, Guests, and the barn-red Close hill. */
export function ActionBar({
  buildActive,
  onBuild,
  onGuests,
  onCloseHill,
  confirmMenu = false,
  onConfirmMenuChange,
}: {
  buildActive: boolean;
  onBuild: () => void;
  onGuests: () => void;
  onCloseHill: () => void;
  confirmMenu?: boolean;
  onConfirmMenuChange?: (open: boolean) => void;
}) {
  const menuRef = useRef<HTMLButtonElement>(null);
  const setMenu = (open: boolean) => onConfirmMenuChange?.(open);
  useEffect(() => {
    if (!confirmMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        menuRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setMenu is stable for this effect
  }, [confirmMenu]);
  return (
    <nav
      aria-label="Hill actions"
      className="pointer-events-auto relative flex w-full gap-2"
    >
      {confirmMenu && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Leave the hill?"
          className="panel absolute bottom-full left-0 mb-3 flex w-full flex-col gap-2 p-3"
        >
          <p className="text-[0.88rem] font-bold leading-snug">Leave the hill and go to the menu?</p>
          <div className="flex gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => {
                setMenu(false);
                menuRef.current?.focus();
              }}
              className="key press h-11 flex-1 text-[0.9rem] font-extrabold [--lift:3px]"
            >
              Stay
            </button>
            <Link
              href="/"
              className="key key-solid press flex h-11 flex-1 items-center justify-center text-[0.9rem] font-extrabold [--key-fill:var(--barn-deep)] [--key-ink:#fff] [--lift:3px]"
            >
              Leave
            </Link>
          </div>
        </div>
      )}
      <button
        ref={menuRef}
        type="button"
        onClick={() => setMenu(!confirmMenu)}
        aria-expanded={confirmMenu}
        aria-haspopup="dialog"
        className="key press flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 text-[0.8rem] font-extrabold [--lift:4px]"
      >
        <HomeIcon size={20} />
        Menu
      </button>
      <BarButton
        icon={<BuildIcon />}
        label="Build"
        onClick={onBuild}
        active={buildActive}
      />
      <BarButton icon={<GuestsIcon />} label="Guests" onClick={onGuests} />
      <button
        type="button"
        onClick={onCloseHill}
        className="key key-solid press flex h-14 flex-[1.35] flex-col items-center justify-center gap-0.5 [--key-fill:var(--barn-deep)] [--key-ink:#fff] [--lift:4px]"
      >
        <MountainMoonIcon size={22} />
        <span className="display text-[1.2rem]">Close hill</span>
      </button>
    </nav>
  );
}
