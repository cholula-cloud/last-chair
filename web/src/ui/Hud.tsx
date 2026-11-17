"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { formatMoney } from "@/game/format";
import { formatClock, weekdayLabel } from "@/game/sim";
import type { WeatherKind } from "@/game/types";
import {
  BuildIcon,
  CloseIcon,
  GuestsIcon,
  HomeIcon,
  MoodIcon,
  MoonIcon,
  PauseIcon,
  PlayIcon,
  QueueIcon,
  SnowIcon,
  SnowfallIcon,
  SunIcon,
  ThawIcon,
} from "@/ui/kit/icons";
import { TONE_TEXT, type Tone } from "@/ui/kit/parts";

/** Day pass: pause stub on the left, then day, clock and cash. */
export function TicketStrip({
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
  const stubLabel = paused ? "Resume" : "Pause";
  return (
    <div className="ticket paper flex h-[62px] w-full items-stretch rounded-[10px] sm:w-[400px]">
      <div className="flex w-[72px] shrink-0 items-center justify-center rounded-l-[10px] bg-pine">
        <button
          type="button"
          onClick={onTogglePause}
          aria-label={paused ? "Resume day" : "Pause day"}
          className={`press flex h-[50px] w-[58px] flex-col items-center justify-center rounded-lg text-paper hover:bg-white/10 active:bg-white/15 ${
            notStarted ? "pulse-ring bg-amber-fill" : ""
          }`}
        >
          {paused ? <PlayIcon size={20} /> : <PauseIcon size={20} />}
          <span className="mt-0.5 text-[0.72rem] font-semibold leading-none">
            {stubLabel}
          </span>
        </button>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 border-l-[1.5px] border-dashed border-ink/25 pl-3 pr-3.5">
        <div className="flex flex-col leading-tight">
          <span className="whitespace-nowrap text-[0.8rem] font-semibold text-ink">
            Day {dayIndex}/{seasonLength}
          </span>
          <span className="text-[0.75rem] text-ink-soft">
            {weekdayLabel(dayIndex)}
          </span>
        </div>
        <ClockText text={formatClock(clockMin)} />
        <span className="h-8 w-px bg-ink/15" aria-hidden="true" />
        <span
          className={`num min-w-[4.6rem] text-right text-[1.45rem] font-semibold ${cash < 0 ? "text-barn" : "text-pine"}`}
        >
          {formatMoney(cash)}
        </span>
      </div>
    </div>
  );
}

/** "6:00 AM" with the meridiem set small, so the time never wraps. */
function ClockText({ text }: { text: string }) {
  const [time, meridiem] = text.split(" ");
  return (
    <span className="num ml-auto whitespace-nowrap text-[1.45rem] font-semibold text-ink">
      {time}
      {meridiem && (
        <span className="ml-0.5 text-[0.8rem] font-semibold text-ink-soft">
          {meridiem}
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
  onDismiss,
}: {
  weather: WeatherKind;
  headline: string;
  crewLine: string | null;
  onDismiss: () => void;
}) {
  const w = WEATHER[weather];
  return (
    <aside
      aria-label="Morning note"
      className="paper paper-tilt note-in pointer-events-auto flex w-full max-w-[400px] items-start gap-2.5 rounded-[10px] py-2 pl-3 pr-1"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-pine text-paper">
        {w.icon}
      </span>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-[0.82rem] leading-snug text-ink">
          <span className="font-semibold">{w.label}.</span> {headline}
        </p>
        {crewLine && (
          <p className="pencil mt-0.5 text-[0.85rem] text-pine">{crewLine}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss morning note"
        className="press flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5"
      >
        <CloseIcon size={18} />
      </button>
    </aside>
  );
}

/** Small amber callout under the ticket stub on the very first morning. */
export function StartCallout() {
  return (
    <p className="callout-in pointer-events-none relative ml-2 mt-1 w-max rounded-lg bg-amber-fill px-3 py-1.5 text-[0.82rem] font-semibold text-white shadow-md">
      <span
        className="absolute -top-1.5 left-[1.4rem] size-3 rotate-45 bg-amber-fill"
        aria-hidden="true"
      />
      <span className="relative">Tap Resume to open the hill</span>
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
  tone: Tone;
};

function band(v: number, good: number, watch: number): Tone {
  return v >= good ? "good" : v >= watch ? "watch" : "bad";
}

function worse(a: Tone, b: Tone): Tone {
  const rank: Tone[] = ["good", "watch", "bad"];
  return rank.indexOf(a) > rank.indexOf(b) ? a : b;
}

/** Conditions board: queue, snow, mood with icon, number and a word. */
export function ConditionsBoard({
  avgQueue,
  snowQuality,
  snowDepth,
  mood,
}: {
  avgQueue: number;
  snowQuality: number;
  snowDepth: number;
  mood: number;
}) {
  const queueTone: Tone =
    avgQueue < 3 ? "good" : avgQueue < 5 ? "watch" : "bad";
  const snowTone = worse(
    band(snowQuality, 0.7, 0.45),
    band(snowDepth, 0.6, 0.35),
  );
  const moodTone = band(mood, 70, 50);
  const items: Condition[] = [
    {
      key: "queue",
      icon: <QueueIcon />,
      label: "Queue",
      value: `${avgQueue.toFixed(1)}m`,
      state: { good: "Short", watch: "Busy", bad: "Long", plain: "" }[
        queueTone
      ],
      tone: queueTone,
    },
    {
      key: "snow",
      icon: <SnowIcon />,
      label: "Snow",
      value: `${Math.round(snowQuality * 100)}%`,
      state: { good: "Good", watch: "Thin", bad: "Bare", plain: "" }[snowTone],
      detail: `cover · depth ${Math.round(snowDepth * 100)}%`,
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
      className="paper pointer-events-auto grid w-full grid-cols-3 divide-x divide-dashed divide-ink/20 rounded-xl py-1.5"
    >
      {items.map((c) => (
        <div
          key={c.key}
          className="flex min-w-0 items-center gap-1.5 px-2"
          aria-label={`${c.label} ${c.value}${c.detail ? ` ${c.detail}` : ""}, ${c.state}`}
          role="group"
        >
          <span className={`shrink-0 ${TONE_TEXT[c.tone]}`}>{c.icon}</span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="num text-[1.2rem] font-semibold text-ink">
              {c.value}
            </span>
            <span className="truncate text-[0.72rem] text-ink-soft">
              <span className={`font-semibold ${TONE_TEXT[c.tone]}`}>
                {c.state}
              </span>{" "}
              {c.label.toLowerCase()}
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
  className = "",
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`press paper flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.82rem] font-semibold ${
        active ? "ring-[2.5px] ring-amber" : ""
      } ${className}`}
    >
      <span className="text-pine">{icon}</span>
      {label}
    </button>
  );
}

/** Thumb-zone action row: Home, Build, Guests, and the amber Close hill. */
export function ActionBar({
  buildActive,
  onBuild,
  onGuests,
  onCloseHill,
}: {
  buildActive: boolean;
  onBuild: () => void;
  onGuests: () => void;
  onCloseHill: () => void;
}) {
  return (
    <nav
      aria-label="Hill actions"
      className="pointer-events-auto flex w-full gap-2"
    >
      <Link
        href="/"
        className="press flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-navy/70 text-[0.72rem] font-semibold text-paper ring-1 ring-white/15 backdrop-blur"
      >
        <HomeIcon size={20} />
        Home
      </Link>
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
        className="press btn-primary flex h-14 flex-[1.35] flex-col items-center justify-center gap-0.5 rounded-xl text-[0.88rem] font-bold"
      >
        <MoonIcon />
        Close hill
      </button>
    </nav>
  );
}
