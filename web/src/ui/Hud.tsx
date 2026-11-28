"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { dayLabel, operatingSeasonLength, seasonCalendar, type MountainId } from "@/game/calendar";
import { LOW_CASH } from "@/game/economy";
import { formatMoney } from "@/game/format";
import { formatClock } from "@/game/sim";
import type { WeatherKind } from "@/game/types";
import {
  BuildIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  EyeIcon,
  EyeOffIcon,
  FlagIcon,
  GuestsIcon,
  HomeIcon,
  MoodIcon,
  MountainMoonIcon,
  OfficeIcon,
  PauseIcon,
  PlayIcon,
  QueueIcon,
  RecenterIcon,
  SnowIcon,
  SnowfallIcon,
  SpeedIcon,
  SunIcon,
  ThawIcon,
  WarningDiamondIcon,
  WindIcon,
} from "@/ui/kit/icons";
import { moodTone, satisfactionMoodWord } from "@/game/moodLabels";
import { TONE_CHIP, type Tone } from "@/ui/kit/parts";
import { undoChipLabel, type UndoKind } from "@/ui/undoLabel";
import { SPEEDS, useSpeed, type GameSpeed } from "@/ui/speed";
import { HudRadioButton } from "@/ui/HudRadio";
import { useReducedMotion } from "@/ui/motion";
import { useSettings } from "@/ui/settingsStore";

const HOLD_SPEED_MS = 280;
const SPEED_OPTIONS: { id: GameSpeed; label: string; tier: 1 | 2 | 3 }[] = [
  { id: "calm", label: "Calm", tier: 1 },
  { id: "normal", label: "Normal", tier: 2 },
  { id: "fast", label: "Fast", tier: 3 },
];

/** Top bar: green play/pause key (hold for speed), day/clock chip, radio key, and cash chip. */
export function TopBar({
  mountainId,
  dayIndex,
  seasonLength,
  operatingDayIndex,
  clockMin,
  cash,
  paused,
  notStarted,
  openingBlocked = false,
  onTogglePause,
}: {
  mountainId: MountainId;
  dayIndex: number;
  seasonLength: number;
  operatingDayIndex: number;
  clockMin: number;
  cash: number;
  paused: boolean;
  notStarted: boolean;
  openingBlocked?: boolean;
  onTogglePause: () => void;
}) {
  const speed = useSpeed((s) => s.speed);
  const setSpeed = useSpeed((s) => s.setSpeed);
  const reducedMotion = useReducedMotion();
  const [speedOpen, setSpeedOpen] = useState(false);
  const speedWrapRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<number | null>(null);
  const openedByHoldRef = useRef(false);
  const suppressClickRef = useRef(false);

  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  useEffect(() => clearHoldTimer, []);

  useEffect(() => {
    if (!speedOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSpeedOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (speedWrapRef.current && e.target instanceof Node && !speedWrapRef.current.contains(e.target)) {
        setSpeedOpen(false);
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!openedByHoldRef.current) return;
      openedByHoldRef.current = false;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const opt = el?.closest<HTMLElement>("[data-speed-option]")?.dataset.speedOption as GameSpeed | undefined;
      if (opt && SPEEDS.includes(opt)) {
        setSpeed(opt);
        setSpeedOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [speedOpen, setSpeed]);

  const speedTier = speed === "calm" ? 1 : speed === "normal" ? 2 : 3;
  const cal = seasonCalendar({ mountainId, seasonLength });
  const openDays = operatingSeasonLength(cal);
  const { weekday, date, note } = dayLabel(cal, dayIndex);
  const lowCash = cash >= 0 && cash < LOW_CASH;
  return (
    <div className="flex w-full items-center gap-1.5 sm:w-[min(27rem,100%)] sm:gap-2">
      <div ref={speedWrapRef} className="relative shrink-0">
        <button
          type="button"
          onPointerDown={(e) => {
            if (openingBlocked || e.button !== 0) return;
            clearHoldTimer();
            openedByHoldRef.current = false;
            suppressClickRef.current = false;
            holdTimerRef.current = window.setTimeout(() => {
              holdTimerRef.current = null;
              openedByHoldRef.current = true;
              suppressClickRef.current = true;
              setSpeedOpen(true);
            }, HOLD_SPEED_MS);
          }}
          onPointerUp={() => {
            clearHoldTimer();
          }}
          onPointerCancel={() => {
            clearHoldTimer();
            openedByHoldRef.current = false;
            suppressClickRef.current = false;
          }}
          onContextMenu={(e) => {
            if (openingBlocked) return;
            e.preventDefault();
            setSpeedOpen((v) => !v);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && !openingBlocked) {
              e.preventDefault();
              setSpeedOpen(true);
            }
          }}
          onClick={() => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            setSpeedOpen(false);
            onTogglePause();
          }}
          disabled={openingBlocked}
          aria-haspopup="menu"
          aria-expanded={speedOpen}
          aria-label={paused ? "Resume day" : "Pause day"}
          title={`${paused ? "Resume day" : "Pause day"} (${speed} speed, hold for speed)`}
          className={`sign sign-btn press relative z-40 flex size-11 select-none items-center justify-center [--lift:3px] sm:size-12 sm:[--lift:4px] ${
            speedOpen ? "!rounded-b-none [--lift:0px]" : ""
          } ${
            notStarted && !openingBlocked && !reducedMotion ? "pulse-ring" : ""
          }`}
        >
          {paused ? <PlayIcon size={20} /> : <PauseIcon size={20} />}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-0.5"
          >
            {[1, 2, 3].map((pip) => (
              <span
                key={pip}
                className={`size-1 rounded-full ${
                  pip <= speedTier ? "bg-white" : "bg-white/35"
                }`}
              />
            ))}
          </span>
        </button>

        {speedOpen && (
          <div
            role="menu"
            aria-label="Game speed"
            className="panel popover-in absolute left-0 top-full z-30 -mt-[3px] flex min-w-[7.25rem] origin-top-left flex-col gap-1 rounded-tl-none p-1.5"
          >
            {SPEED_OPTIONS.map((opt) => {
              const active = speed === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  data-speed-option={opt.id}
                  onClick={() => {
                    setSpeed(opt.id);
                    setSpeedOpen(false);
                  }}
                  className={`key press flex min-h-10 items-center gap-2 px-2.5 py-1.5 text-left text-xs font-extrabold [--lift:2px] ${
                    active ? "key-solid [--key-fill:var(--sign-yellow)]" : ""
                  }`}
                >
                  <SpeedIcon tier={opt.tier} size={15} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="chip flex h-11 min-w-0 flex-1 items-center gap-1 px-2 sm:h-12 sm:gap-2 sm:px-3">
        <div className="flex flex-col leading-tight">
          <span className="whitespace-nowrap text-[0.85rem] font-extrabold tabular-nums sm:text-[0.9rem]">
            Open {operatingDayIndex}/{openDays}
          </span>
          <span className="text-[0.72rem] font-bold text-ink-soft sm:text-[0.75rem]">
            {weekday} <span className="hidden whitespace-nowrap min-[380px]:inline">{date}</span>
            {note && (
              <span className="ml-1 inline-flex items-center gap-0.5 align-middle" title={note}>
                <FlagIcon size={12} />
                <span aria-hidden="true">Holiday</span>
                <span className="sr-only">{note}</span>
              </span>
            )}
          </span>
        </div>
        <ClockText text={formatClock(clockMin)} />
      </div>
      <HudRadioButton />
      <span
        className={`chip display flex h-11 min-w-[4.7rem] shrink-0 items-center justify-center gap-1 whitespace-nowrap px-2 text-[1.12rem] tabular-nums sm:h-12 sm:min-w-[5.5rem] sm:px-3 sm:text-[1.28rem] ${
          cash < 0 ? "bg-barn-deep text-white" : lowCash ? "bg-sign-yellow" : "bg-gold"
        }`}
      >
        {lowCash && <WarningDiamondIcon size={15} className="shrink-0" />}
        <span className="sr-only">{cash < 0 ? "Negative cash" : lowCash ? "Low cash" : "Cash on hand"} </span>
        {formatMoney(cash)}
      </span>
    </div>
  );
}

/** Stack the meridiem on phones where the clock shares a chip with the day. */
function ClockText({ text }: { text: string }) {
  const [time, meridiem] = text.split(" ");
  return (
    <span className="display ml-auto whitespace-nowrap text-right text-[1.15rem] leading-none tabular-nums sm:min-w-[4.6rem] sm:text-[1.25rem]">
      {time}
      {meridiem && (
        <span className="mt-0.5 block font-sans text-[0.65rem] font-extrabold text-ink-soft sm:mt-0 sm:ml-0.5 sm:inline sm:text-[0.8rem]">
          {meridiem.toLowerCase()}
        </span>
      )}
    </span>
  );
}

export const WEATHER_META: Record<WeatherKind, { label: string; icon: ReactNode }> = {
  snow: { label: "Fresh snow", icon: <SnowfallIcon size={18} /> },
  storm: { label: "Snowstorm", icon: <WindIcon size={18} /> },
  clear: { label: "Clear skies", icon: <SunIcon size={18} /> },
  thaw: { label: "Thaw", icon: <ThawIcon size={18} /> },
};

export function parseCrewLine(crewLine: string | null) {
  if (!crewLine) return { main: null as string | null, need: null as string | null, waiting: null as string | null };
  let waiting: string | null = null;
  let rest = crewLine;
  const waitAt = crewLine.indexOf(" Waits for ");
  if (waitAt >= 0) {
    rest = crewLine.slice(0, waitAt);
    waiting = crewLine.slice(waitAt + " Waits for ".length);
  }
  let need: string | null = null;
  let main = rest;
  const needAt = rest.indexOf(" Needs ");
  if (needAt >= 0) {
    main = rest.slice(0, needAt).trimEnd();
    need = rest.slice(needAt + 1).trim();
  }
  return { main: main || null, need, waiting };
}

export function WindHoldCallout({ shortHold }: { shortHold: boolean }) {
  return (
    <p role="status" className="chip note-in mt-1.5 flex w-fit items-center gap-1.5 bg-sign-yellow-soft px-2.5 py-1 text-xs font-extrabold [--lift:2px]">
      <WindIcon size={16} />
      Wind’s holding the chair until {shortHold ? "12:15 PM" : "1 PM"}
    </p>
  );
}

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
  const w = WEATHER_META[weather];
  const { main: skill, need, waiting } = parseCrewLine(crewLine);
  return (
    <aside
      aria-label="Morning note"
      className="panel note-in pointer-events-auto relative z-30 flex w-full max-w-[min(400px,calc(100%-4.25rem))] items-center gap-2 py-1 pl-2 pr-1.5 [--lift:3px]"
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
        {skill && (
          <p className={`mt-0.5 text-[0.8rem] font-extrabold leading-snug text-sign-green ${expanded ? "" : "line-clamp-2"}`}>
            {skill}
            {waiting && (
              <span className="font-bold text-ink-soft"> Waits for {waiting}</span>
            )}
          </p>
        )}
        {need && (
          <p className="mt-0.5">
            <span className="well inline-flex max-w-full truncate px-1.5 py-0.5 text-[0.72rem] font-extrabold text-ink-soft">
              {need}
            </span>
          </p>
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

/** Slim Route 100 dispatch strip shown on the very first morning before the hill opens. */
export function StartCallout({
  step,
  starterCost,
  onUseStarterLine,
}: {
  step: "lift" | "trail" | null;
  starterCost?: number | null;
  onUseStarterLine?: () => void;
}) {
  const instruction = step === "lift" ? "First job: place a lift"
    : step === "trail" ? "Paint a trail from the lift down to the base"
      : "Tap play to open the hill";
  return (
    <div
      role="status"
      className="chip note-in pointer-events-auto flex min-h-11 w-full max-w-[min(27rem,100%)] items-center gap-2 bg-sign-yellow-soft px-2.5 py-1 text-[0.82rem] font-extrabold text-ink [--lift:3px]"
    >
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 rotate-45 items-center justify-center rounded-[5px] border-2 border-ink bg-sign-yellow text-[0.72rem] font-black text-ink"
      >
        <span className="-rotate-45 leading-none">!</span>
      </span>
      <span className="min-w-0 flex-1 truncate">{instruction}</span>
      {step !== null && starterCost != null && onUseStarterLine && (
        <button
          type="button"
          onClick={onUseStarterLine}
          className="key key-solid press shrink-0 px-2.5 py-1 text-[0.75rem] font-extrabold [--key-fill:var(--sign-green)] [--key-ink:#fff] [--lift:2px]"
        >
          Use 1985 line ({formatMoney(starterCost)})
        </button>
      )}
    </div>
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

const TONE_DOT: Record<Tone, string> = {
  good: "bg-sign-green",
  watch: "bg-sign-yellow",
  bad: "bg-barn-deep",
  plain: "bg-ink-soft/45",
};

/** Conditions board: compact 1-line summary pill by default on phone/tablet, expandable for status chips. */
export function ConditionsBoard({
  avgQueue,
  snowQuality,
  snowDepth,
  snowRead,
  mood,
  moodDelta = null,
  moodPulseTick = 0,
  anyOnHill = true,
  expanded = false,
  onToggleExpand,
  onMinimizeBottom,
}: {
  avgQueue: number;
  /** False until a guest is on the hill: the queue then reads "No line yet" instead of 0.0m. */
  anyOnHill?: boolean;
  snowQuality: number;
  snowDepth: number;
  /** "tone|label" of the worst trail segment (see snow.ts `readSnow`). */
  snowRead: string;
  mood: number;
  moodDelta?: number | null;
  moodPulseTick?: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onMinimizeBottom?: () => void;
}) {
  const queueTone: Tone =
    avgQueue < 3 ? "good" : avgQueue < 5 ? "watch" : "bad";
  const [readTone, snowLabel] = snowRead.split("|");
  // The worst segment sets the word; the mean quality and depth can only make the tone worse.
  const snowTone = worse(
    worse(readTone as Tone, band(snowQuality, 0.7, 0.45)),
    band(snowDepth, 0.6, 0.35),
  );
  const moodToneBand = moodTone(mood);
  const reducedMotion = useReducedMotion();
  const items: Condition[] = [
    {
      key: "queue",
      icon: <QueueIcon size={18} />,
      label: "Queue",
      value: anyOnHill ? `${avgQueue.toFixed(1)} min` : "No line",
      state: anyOnHill
        ? { good: "Short", watch: "Busy", bad: "Long", plain: "" }[queueTone]
        : "yet",
      bare: !anyOnHill,
      tone: anyOnHill ? queueTone : "plain",
    },
    {
      key: "snow",
      icon: <SnowIcon size={18} />,
      label: "Snow",
      value: `${Math.round(snowQuality * 100)}%`,
      state: snowLabel,
      bare: true,
      detail: `average quality, snow depth ${Math.round(snowDepth * 100)}%`,
      tone: snowTone,
    },
    {
      key: "mood",
      icon: <MoodIcon mood={mood} size={18} />,
      label: "Mood",
      value: `${mood}%`,
      state: satisfactionMoodWord(mood),
      tone: moodToneBand,
    },
  ];
  return (
    <section
      aria-label="Conditions"
      data-conditions-expanded={expanded ? "true" : "false"}
      className="pointer-events-auto relative flex w-full justify-center"
    >
      {expanded && (
        <div className="panel popover-in origin-bottom absolute bottom-full left-1/2 mb-2 w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 p-3 [--lift:4px]">
          <div className="grid grid-cols-3 gap-2">
            {items.map((c) => (
              <div key={c.key} className="well-white flex flex-col items-start gap-1 p-2">
                <div className="flex items-center gap-1 text-xs font-extrabold text-ink-soft">
                  {c.icon}
                  <span>{c.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="display text-[1.1rem] tabular-nums text-ink">{c.value}</span>
                  {c.key === "mood" && moodDelta != null && (
                    <span
                      className={`text-[0.7rem] font-extrabold tabular-nums ${
                        moodDelta > 0 ? "text-sign-green" : "text-barn-deep"
                      }`}
                    >
                      {moodDelta > 0 ? `+${Math.round(moodDelta)}` : Math.round(moodDelta)}
                    </span>
                  )}
                </div>
                <span className={`rounded-md px-1.5 py-0.5 text-[0.68rem] font-extrabold leading-tight ${TONE_CHIP[c.tone]}`}>
                  {c.state}
                </span>
              </div>
            ))}
          </div>
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="key key-sm press mt-2 flex min-h-9 w-full items-center justify-center text-xs font-extrabold [--lift:2px]"
            >
              Done
            </button>
          )}
        </div>
      )}

      <div className="chip hud-surface flex min-h-10 max-w-full items-center !rounded-full pl-3 pr-1 [--lift:3px]">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          aria-label="Conditions summary, tap for details"
          className="flex min-h-10 min-w-0 items-center gap-2 pr-2 text-left text-[0.76rem] font-extrabold tabular-nums sm:gap-2.5 sm:text-[0.8rem]"
        >
          {items.map((c, idx) => (
            <span
              key={c.key === "mood" ? `${c.key}-${moodPulseTick}` : c.key}
              className={`inline-flex shrink-0 items-center gap-1 ${
                idx > 0 ? "border-l-2 border-snow-2 pl-2 sm:pl-2.5" : ""
              } ${c.key === "mood" && moodPulseTick > 0 && !reducedMotion ? "mood-pulse-active" : ""}`}
              aria-label={`${c.label} ${c.value}${c.detail ? ` ${c.detail}` : ""}, ${c.state}`}
            >
              <span
                aria-hidden="true"
                className={`inline-block size-2 shrink-0 rounded-full border border-ink ${TONE_DOT[c.tone]}`}
              />
              <span className="whitespace-nowrap">
                {c.key === "snow" ? `${c.value} snow` : c.value}
              </span>
              {c.key === "mood" && moodDelta != null && (
                <span
                  className={`text-[0.68rem] font-extrabold ${
                    moodDelta > 0 ? "text-sign-green" : "text-barn-deep"
                  }`}
                >
                  {moodDelta > 0 ? `+${Math.round(moodDelta)}` : Math.round(moodDelta)}
                </span>
              )}
            </span>
          ))}
        </button>
        {onMinimizeBottom && (
          <button
            type="button"
            onClick={onMinimizeBottom}
            aria-label="Minimize hill controls"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border-l-2 border-snow-2 text-ink-soft"
          >
            <ChevronDownIcon size={16} />
          </button>
        )}
      </div>
    </section>
  );
}

function BarButton({
  icon,
  label,
  onClick,
  active,
  barId,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  /** Lets the screen return focus to this button when a sheet it opened closes. */
  barId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-bar={barId}
      className="key press flex h-12 flex-1 flex-col items-center justify-center gap-0.5 px-1.5 text-[0.76rem] font-extrabold [--lift:3px] sm:h-[52px] sm:px-3 sm:text-[0.82rem] sm:[--lift:4px]"
    >
      {icon}
      {label}
    </button>
  );
}

/** Round on-map button that glides the camera back to the home view. */
export function RecenterButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Recenter the view"
      className={`key press pointer-events-auto flex shrink-0 items-center justify-center !rounded-full [--lift:3px] ${
        compact ? "size-11" : "size-12 [--lift:4px]"
      }`}
    >
      <RecenterIcon size={compact ? 20 : 22} />
    </button>
  );
}

/** Restores the conditions readout and action bar after minimizing bottom chrome. */
export function BottomChromeRestoreButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Show hill controls"
      className="key press pointer-events-auto flex min-h-11 items-center justify-center gap-1.5 px-3 text-xs font-extrabold [--lift:3px]"
    >
      <ChevronUpIcon size={16} />
      Show controls
    </button>
  );
}

/** Compact toggle that hides or restores the HUD chrome to maximize the map. */
export function HudToggleButton({
  hidden,
  onClick,
  showLabel = false,
}: {
  hidden: boolean;
  onClick: () => void;
  showLabel?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={hidden}
      aria-label={hidden ? "Show HUD" : "Hide HUD"}
      className={`key press pointer-events-auto flex min-h-11 shrink-0 items-center justify-center gap-1.5 [--lift:3px] ${
        showLabel ? "px-3 text-xs font-extrabold" : "size-11 !rounded-full md:w-auto md:!rounded-[var(--r-key)] md:px-3 md:text-xs md:font-extrabold"
      }`}
    >
      {hidden ? <EyeIcon size={19} /> : <EyeOffIcon size={19} />}
      {showLabel ? (
        <span>{hidden ? "Show HUD" : "Hide HUD"}</span>
      ) : (
        <span className="hidden md:inline">{hidden ? "Show HUD" : "Hide HUD"}</span>
      )}
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
      Follow the skiers again
    </button>
  );
}

/** After a lift is placed, until the clock moves. */
export function LiftUndoChip({
  refund,
  onClick,
  kind = "lift",
}: {
  refund: number;
  onClick: () => void;
  kind?: UndoKind;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="chip press pointer-events-auto flex h-11 items-center px-4 text-[0.85rem] font-extrabold"
    >
      {undoChipLabel(kind, refund)}
    </button>
  );
}

/** Thumb-zone 5-key action row: Menu, Build, Guests, Office, and Close hill. */
export function ActionBar({
  buildActive,
  onBuild,
  onGuests,
  onOffice,
  onCloseHill,
  canCloseHill = true,
  confirmMenu = false,
  onConfirmMenuChange,
  onLeave,
  onStoryLog,
}: {
  buildActive: boolean;
  onBuild: () => void;
  onGuests: () => void;
  onOffice: () => void;
  onCloseHill?: () => void;
  canCloseHill?: boolean;
  confirmMenu?: boolean;
  onConfirmMenuChange?: (open: boolean) => void;
  /** Saves and returns to the title screen. */
  onLeave?: () => void;
  onStoryLog?: () => void;
}) {
  const menuRef = useRef<HTMLButtonElement>(null);
  const soundOn = useSettings((s) => !s.muted);
  const setSettings = useSettings((s) => s.set);
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
      className="pointer-events-auto relative grid w-full grid-cols-5 gap-1.5"
    >
      {confirmMenu && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Leave the hill?"
          className="panel popover-in origin-bottom-left absolute bottom-full left-0 mb-3 flex w-full max-w-xs flex-col gap-2.5 p-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="key press min-h-11 text-sm font-extrabold [--lift:3px]" onClick={() => { setMenu(false); onStoryLog?.(); }}>
              Story log
            </button>
            <button
              type="button"
              aria-pressed={soundOn}
              onClick={() => setSettings({ muted: soundOn })}
              className="key press min-h-11 text-sm font-extrabold [--lift:3px]"
            >
              Sound {soundOn ? "on" : "off"}
            </button>
          </div>
          <div className="well p-2.5 space-y-2">
            <p className="text-[0.85rem] font-bold leading-snug">Head back to the menu? Your winter saves first.</p>
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
              <button
                type="button"
                onClick={onLeave}
                className="key key-solid press flex h-11 flex-1 items-center justify-center text-[0.9rem] font-extrabold [--key-fill:var(--barn-deep)] [--key-ink:#fff] [--lift:3px]"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        ref={menuRef}
        type="button"
        onClick={() => setMenu(!confirmMenu)}
        aria-expanded={confirmMenu}
        aria-haspopup="dialog"
        className="key press flex h-[52px] flex-col items-center justify-center gap-0.5 px-1 text-[0.72rem] font-extrabold [--lift:3px] sm:text-[0.78rem] sm:[--lift:4px]"
      >
        <HomeIcon size={18} />
        Menu
      </button>
      <BarButton
        icon={<BuildIcon size={18} />}
        label="Build"
        onClick={onBuild}
        active={buildActive}
      />
      <BarButton icon={<GuestsIcon size={18} />} label="Guests" onClick={onGuests} />
      <BarButton icon={<OfficeIcon size={18} />} label="Office" onClick={onOffice} barId="office" />
      <button
        type="button"
        onClick={onCloseHill}
        disabled={!canCloseHill || !onCloseHill}
        aria-label="Close for the night"
        className="key key-solid press flex h-[52px] flex-col items-center justify-center gap-0.5 px-1 text-[0.72rem] font-extrabold [--key-fill:var(--sign-brown)] [--key-ink:#fff] [--lift:3px] sm:text-[0.78rem] sm:[--lift:4px]"
      >
        <MountainMoonIcon size={18} />
        Close
      </button>
    </nav>
  );
}
