"use client";

import { useEffect, useRef, useState } from "react";
import {
  liveRadioBroadcast,
  RADIO_BANDS,
  radioDispatchKey,
  STATION_META,
  type RadioBandId,
} from "@/game/radioChannels";
import { useGameStore } from "@/game/store";
import { radioDialTurned } from "@/ui/feel";
import { ChevronDownIcon, ChevronUpIcon } from "@/ui/kit/icons";
import { tidy } from "@/ui/kit/parts";
import { useSettings } from "@/ui/settingsStore";

const PEEK_MS = 6000;

function WavesGlyph({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity={active ? 1 : 0.35}
      >
        <path d="M15.8 8.2a5.4 5.4 0 0 1 0 7.6M8.2 8.2a5.4 5.4 0 0 0 0 7.6" />
        <path d="M18.8 5.2a9.6 9.6 0 0 1 0 13.6M5.2 5.2a9.6 9.6 0 0 0 0 13.6" />
      </g>
    </svg>
  );
}

/**
 * Compact daytime radio pill and 3-band tuner popover (WVTK 100.7, WXK-44, WRCK 98.3).
 * Auto-peeks new WVTK dispatches for 6 seconds without stealing focus or pausing the hill.
 */
export function HudRadio({ onOpenLog }: { onOpenLog: () => void }) {
  const state = useGameStore((s) => s);
  const radioEnabled = useSettings((s) => s.radioEnabled);
  const radioBand = useSettings((s) => s.radioBand);
  const setSettings = useSettings((s) => s.set);

  const [open, setOpen] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const lastPeekKey = useRef<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const broadcast = liveRadioBroadcast(state, radioBand);
  const wvtkLive = radioBand === "wvtk" ? broadcast : liveRadioBroadcast(state, "wvtk");
  const wvtkKey = radioDispatchKey(wvtkLive, state.dayIndex);
  const meta = STATION_META[radioBand];

  // Auto-peek new WVTK dispatches (including Day 1 Cold Read) when radio is on.
  useEffect(() => {
    if (!radioEnabled || radioBand !== "wvtk") return;
    if (lastPeekKey.current === wvtkKey) return;
    lastPeekKey.current = wvtkKey;
    const startTimer = window.setTimeout(() => setPeeking(true), 0);
    const timer = window.setTimeout(() => setPeeking(false), PEEK_MS);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(timer);
    };
  }, [radioEnabled, radioBand, wvtkKey]);

  // Close the tuner popover on Escape or outside click.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && e.target instanceof Node && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const selectBand = (next: RadioBandId) => {
    radioDialTurned();
    setSettings({ radioBand: next, radioEnabled: true });
    setPeeking(false);
  };

  const togglePower = () => {
    radioDialTurned();
    setSettings({ radioEnabled: !radioEnabled });
    setPeeking(false);
  };

  return (
    <div
      ref={wrapRef}
      data-hud-radio="true"
      className="pointer-events-auto relative w-full max-w-[min(27rem,100%)]"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="hud-radio-tuner"
        onClick={() => {
          setOpen((v) => !v);
          setPeeking(false);
        }}
        className="chip hud-surface press flex min-h-9 w-full items-center gap-2 px-2.5 py-1 text-left text-xs font-extrabold text-ink [--lift:2px]"
      >
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-md border-2 border-ink px-1.5 py-0.5 text-[0.7rem] font-extrabold leading-none ${
            radioEnabled ? "bg-sign-yellow text-ink" : "bg-snow-2 text-ink-soft"
          }`}
        >
          <WavesGlyph active={radioEnabled} />
          {radioEnabled ? meta.shortLabel : "Radio off"}
        </span>
        <span className="min-w-0 flex-1 truncate text-[0.78rem] font-bold text-ink">
          {radioEnabled ? tidy(broadcast.title) : "Tap to tune WVTK 100.7"}
        </span>
        {open ? (
          <ChevronUpIcon size={15} className="shrink-0 text-ink-soft" />
        ) : (
          <ChevronDownIcon size={15} className="shrink-0 text-ink-soft" />
        )}
      </button>

      {!open && peeking && radioEnabled && (
        <div
          role="status"
          aria-live="polite"
          onClick={() => {
            setOpen(true);
            setPeeking(false);
          }}
          className="panel note-in mt-1.5 cursor-pointer px-3 py-2 text-left"
        >
          <p className="text-[0.7rem] font-extrabold uppercase tracking-wide text-ink-soft">
            {broadcast.speaker}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[0.82rem] font-bold leading-snug text-ink">
            {tidy(broadcast.body)}
          </p>
        </div>
      )}

      {open && (
        <section
          id="hud-radio-tuner"
          aria-label="Route 100 Radio tuner"
          className="panel note-in mt-1.5 space-y-2.5 p-3"
        >
          <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Radio stations">
            {RADIO_BANDS.map((id) => {
              const station = STATION_META[id];
              const selected = radioEnabled && radioBand === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => selectBand(id)}
                  className={`key press flex min-h-10 flex-col items-center justify-center px-1.5 py-1 text-center leading-tight [--lift:2px] ${
                    selected ? "key-solid [--key-fill:var(--sign-yellow)]" : ""
                  }`}
                >
                  <span className="text-[0.72rem] font-extrabold">{station.freq}</span>
                  <span className="text-[0.65rem] font-bold text-ink-soft">
                    {id === "wvtk" ? "Town" : id === "wxk" ? "Weather" : "Whiterock"}
                  </span>
                </button>
              );
            })}
          </div>

          {radioEnabled ? (
            <div className="rounded-lg border-2 border-ink/15 bg-snow-2/70 px-2.5 py-2">
              <p className="text-[0.72rem] font-extrabold uppercase tracking-wide text-ink-soft">
                {broadcast.speaker}
              </p>
              <p className="display mt-0.5 text-[0.98rem] leading-tight text-ink">
                {tidy(broadcast.title)}
              </p>
              <p className="mt-1 text-[0.84rem] font-bold leading-snug text-ink">
                {tidy(broadcast.body)}
              </p>
            </div>
          ) : (
            <p className="rounded-lg border-2 border-ink/15 bg-snow-2/70 px-2.5 py-2 text-[0.82rem] font-bold text-ink-soft">
              Radio is switched off. Pick any band above or turn power back on to hear Route 100.
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-pressed={radioEnabled}
              onClick={togglePower}
              className="key press min-h-9 px-3 text-xs font-extrabold [--lift:2px]"
            >
              Radio: {radioEnabled ? "On" : "Off"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenLog();
              }}
              className="key press min-h-9 px-3 text-xs font-extrabold [--lift:2px]"
            >
              Story log
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
