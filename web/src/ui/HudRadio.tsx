"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { create } from "zustand";
import {
  liveRadioBroadcast,
  RADIO_BANDS,
  radioDispatchKey,
  STATION_META,
  type RadioBandId,
} from "@/game/radioChannels";
import { useGameStore } from "@/game/store";
import { radioDialTurned } from "@/ui/feel";
import { CastPatch, castPatchForSpeaker } from "@/ui/kit/CastPatches";
import { CloseIcon } from "@/ui/kit/icons";
import { tidy } from "@/ui/kit/parts";
import { useReducedMotion } from "@/ui/motion";
import { useSettings } from "@/ui/settingsStore";

const PEEK_MS = 6000;
const TAP_SLOP_PX = 6;
const DISMISS_DRAG_PX = 28;
const DISMISS_VELOCITY = 0.35;

/** Session-wide tracking so switching HUD overlays never re-peeks the same dispatch. */
const useRadioUi = create<{
  open: boolean;
  seenKeys: Record<string, true>;
  unreadKey: string | null;
  peekingKey: string | null;
  pendingPeekKey: string | null;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  recordKey: (key: string, defer: boolean) => void;
  promotePendingPeek: () => void;
  expirePeek: () => void;
  clearUnread: () => void;
}>((set) => ({
  open: false,
  seenKeys: {},
  unreadKey: null,
  peekingKey: null,
  pendingPeekKey: null,
  setOpen: (open) => set(() => (open ? { open, unreadKey: null, peekingKey: null, pendingPeekKey: null } : { open })),
  toggleOpen: () =>
    set((s) =>
      s.open
        ? { open: false }
        : { open: true, unreadKey: null, peekingKey: null, pendingPeekKey: null },
    ),
  recordKey: (key, defer) =>
    set((s) =>
      s.seenKeys[key]
        ? s
        : {
            seenKeys: { ...s.seenKeys, [key]: true },
            unreadKey: key,
            peekingKey: defer ? null : key,
            pendingPeekKey: defer ? key : null,
          },
    ),
  promotePendingPeek: () =>
    set((s) =>
      s.pendingPeekKey ? { peekingKey: s.pendingPeekKey, pendingPeekKey: null } : s,
    ),
  expirePeek: () => set({ peekingKey: null }),
  clearUnread: () => set({ unreadKey: null, peekingKey: null, pendingPeekKey: null }),
}));

function WavesGlyph({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true" focusable="false">
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

export type MorningDispatch = {
  weatherLabel: string;
  weatherIcon: ReactNode;
  headline: string;
  crewLine: string | null;
  overnightLine: string | null;
  onDismiss: () => void;
};

/**
 * Compact Radio key anchored in the top bar (between the clock and cash chips).
 */
export function HudRadioButton({ disabled = false }: { disabled?: boolean }) {
  const state = useGameStore((s) => s);
  const radioEnabled = useSettings((s) => s.radioEnabled);
  const radioBand = useSettings((s) => s.radioBand);
  const open = useRadioUi((s) => s.open);
  const unreadKey = useRadioUi((s) => s.unreadKey);
  const peekingKey = useRadioUi((s) => s.peekingKey);
  const toggleOpen = useRadioUi((s) => s.toggleOpen);

  const broadcast = liveRadioBroadcast(state, radioBand);
  const wvtkLive = radioBand === "wvtk" ? broadcast : liveRadioBroadcast(state, "wvtk");
  const meta = STATION_META[radioBand];
  const showToast = !open && !!peekingKey && radioEnabled;
  const showUnreadDot = !open && !showToast && !!unreadKey && radioEnabled;

  return (
    <button
      type="button"
      data-hud-radio-trigger="true"
      disabled={disabled}
      aria-expanded={open}
      aria-controls="hud-radio-tuner"
      aria-label={
        radioEnabled
          ? `${meta.shortLabel}: ${tidy(broadcast.title)}${showUnreadDot ? " (new dispatch)" : ""}`
          : "Radio off, tap to tune WVTK 100.7"
      }
      onClick={toggleOpen}
      className={`key key-sm press relative flex size-11 shrink-0 items-center justify-center [--lift:3px] sm:size-12 sm:[--lift:4px] ${
        open || showToast
          ? "bg-sign-yellow text-ink"
          : radioEnabled
            ? "bg-sign-yellow-soft text-ink"
            : "bg-snow-2 text-ink-soft"
      }`}
    >
      <WavesGlyph active={radioEnabled} />
      {showUnreadDot && (
        <span
          aria-hidden="true"
          className={`absolute -right-1 -top-1 size-3 rounded-full border-2 border-ink ${
            wvtkLive.urgent ? "bg-barn-deep" : "bg-sign-yellow"
          }`}
        />
      )}
    </button>
  );
}

/**
 * Row-2 Route 100 radio surfaces: MorningNote, transient 6s peek toast for newly arriving
 * dispatches, and the 3-band tuner popover toggled from the top-bar Radio key.
 */
export function HudRadio({
  onOpenLog,
  morningDispatch = null,
}: {
  onOpenLog: () => void;
  morningDispatch?: MorningDispatch | null;
}) {
  const state = useGameStore((s) => s);
  const radioEnabled = useSettings((s) => s.radioEnabled);
  const radioBand = useSettings((s) => s.radioBand);
  const setSettings = useSettings((s) => s.set);
  const reduceMotion = useReducedMotion();

  const open = useRadioUi((s) => s.open);
  const setOpen = useRadioUi((s) => s.setOpen);
  const wrapRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startAt: number; dragging: boolean; offset: number } | null>(null);

  const peekingKey = useRadioUi((s) => s.peekingKey);
  const pendingPeekKey = useRadioUi((s) => s.pendingPeekKey);
  const recordKey = useRadioUi((s) => s.recordKey);
  const promotePendingPeek = useRadioUi((s) => s.promotePendingPeek);
  const expirePeek = useRadioUi((s) => s.expirePeek);
  const clearUnread = useRadioUi((s) => s.clearUnread);

  const broadcast = liveRadioBroadcast(state, radioBand);
  const wvtkLive = radioBand === "wvtk" ? broadcast : liveRadioBroadcast(state, "wvtk");
  const wvtkKey = radioDispatchKey(wvtkLive, state.dayIndex);
  const meta = STATION_META[radioBand];

  // Record each new dispatch key once; defer peeking if MorningNote or tuner is already open.
  useEffect(() => {
    if (!radioEnabled || radioBand !== "wvtk") return;
    const defer = Boolean(morningDispatch) || open;
    const id = window.setTimeout(() => recordKey(wvtkKey, defer), 0);
    return () => window.clearTimeout(id);
  }, [radioEnabled, radioBand, wvtkKey, morningDispatch, open, recordKey]);

  // Once MorningNote is dismissed, surface any deferred dispatch toast cleanly.
  useEffect(() => {
    if (!radioEnabled || radioBand !== "wvtk" || morningDispatch || open || !pendingPeekKey) return;
    const id = window.setTimeout(() => promotePendingPeek(), 120);
    return () => window.clearTimeout(id);
  }, [radioEnabled, radioBand, morningDispatch, open, pendingPeekKey, promotePendingPeek]);

  // Auto-hide the peek toast after 6 seconds.
  useEffect(() => {
    if (!peekingKey || open || morningDispatch || !radioEnabled) return;
    const timer = window.setTimeout(() => expirePeek(), PEEK_MS);
    return () => window.clearTimeout(timer);
  }, [peekingKey, open, morningDispatch, radioEnabled, expirePeek]);

  // Close the tuner popover on Escape or outside click.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest('[data-hud-radio-trigger="true"]')) return;
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
  }, [open, setOpen]);

  const selectBand = (next: RadioBandId) => {
    radioDialTurned();
    setSettings({ radioBand: next, radioEnabled: true });
    clearUnread();
  };

  const togglePower = () => {
    radioDialTurned();
    setSettings({ radioEnabled: !radioEnabled });
    clearUnread();
  };

  const showToast = !open && !morningDispatch && !!peekingKey && radioEnabled;

  const resetToastStyle = (animate: boolean) => {
    const el = toastRef.current;
    if (!el) return;
    el.style.transition = animate && !reduceMotion ? "transform 200ms var(--ease-out), opacity 180ms var(--ease-out)" : "";
    el.style.transform = "";
    el.style.opacity = "";
  };

  const onToastPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragRef.current = { startY: e.clientY, startAt: performance.now(), dragging: false, offset: 0 };
    if (!reduceMotion) e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onToastPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = toastRef.current;
    if (!drag || !el || reduceMotion) return;
    const dy = e.clientY - drag.startY;
    if (!drag.dragging && Math.abs(dy) >= TAP_SLOP_PX) drag.dragging = true;
    if (!drag.dragging) return;
    const offset = dy < 0 ? dy : dy * 0.25;
    drag.offset = offset;
    el.style.transition = "none";
    el.style.transform = `translateY(${offset}px)`;
    el.style.opacity = dy < 0 ? String(Math.max(0.2, 1 + dy / 90)) : "1";
  };

  const onToastPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const dt = Math.max(16, performance.now() - drag.startAt);
    const velocity = -drag.offset / dt;
    if (drag.dragging && (-drag.offset >= DISMISS_DRAG_PX || velocity >= DISMISS_VELOCITY)) {
      clearUnread();
      return;
    }
    resetToastStyle(true);
    if (!drag.dragging) {
      setOpen(true);
      clearUnread();
    }
  };

  if (!open && !morningDispatch && !showToast) return null;

  return (
    <div
      ref={wrapRef}
      data-hud-radio="true"
      className="pointer-events-none relative w-full max-w-[min(27rem,100%)]"
    >
      {!open && morningDispatch && (
        <aside
          aria-label="Morning note"
          className="panel popover-in pointer-events-auto flex w-full origin-top-left items-start gap-2.5 px-3 py-2 text-left [--lift:3px]"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sky text-ink"
          >
            {morningDispatch.weatherIcon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.8rem] font-bold leading-snug text-ink">
              <span className="font-extrabold">{morningDispatch.weatherLabel}.</span> {morningDispatch.headline}
            </p>
            {morningDispatch.overnightLine && (
              <p className="mt-0.5 text-[0.74rem] font-bold tabular-nums text-ink-soft">
                {morningDispatch.overnightLine}
              </p>
            )}
            {morningDispatch.crewLine && (
              <p className="mt-0.5 text-[0.78rem] font-extrabold leading-snug text-sign-green">
                {morningDispatch.crewLine}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={morningDispatch.onDismiss}
            aria-label="Dismiss morning note"
            className="key key-sm press flex size-9 shrink-0 items-center justify-center [--lift:2px]"
          >
            <CloseIcon size={16} />
          </button>
        </aside>
      )}

      {showToast && (
        <div
          ref={toastRef}
          role="status"
          aria-live="polite"
          onPointerDown={onToastPointerDown}
          onPointerMove={onToastPointerMove}
          onPointerUp={onToastPointerUp}
          onPointerCancel={() => {
            dragRef.current = null;
            resetToastStyle(true);
          }}
          className="panel popover-in pointer-events-auto flex w-full origin-top-left cursor-pointer touch-pan-x items-start gap-2 bg-sign-yellow-soft px-3 py-2 text-left [--lift:3px]"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 rounded-md border-2 border-ink bg-sign-yellow px-1.5 py-0.5 text-[0.65rem] font-extrabold leading-none text-ink">
                {meta.shortLabel}
              </span>
              <p className="min-w-0 truncate text-[0.8rem] font-extrabold text-ink">
                {tidy(broadcast.title)}
              </p>
            </div>
            <p className="mt-1 line-clamp-2 text-[0.78rem] font-bold leading-snug text-ink-soft">
              {tidy(broadcast.body)}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearUnread();
            }}
            aria-label="Dismiss radio dispatch"
            className="key key-sm press flex size-9 shrink-0 items-center justify-center [--lift:2px]"
          >
            <CloseIcon size={15} />
          </button>
        </div>
      )}

      {open && (
        <section
          id="hud-radio-tuner"
          aria-label="Route 100 Radio tuner"
          className="panel popover-in pointer-events-auto origin-top-right space-y-2.5 p-3"
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
                  className={`key press flex min-h-11 flex-col items-center justify-center px-1.5 py-1 text-center leading-tight [--lift:2px] ${
                    selected ? "key-solid [--key-fill:var(--sign-yellow)]" : ""
                  }`}
                >
                  <span className="text-[0.75rem] font-extrabold">{station.freq}</span>
                  <span className="text-[0.68rem] font-bold text-ink-soft">
                    {id === "wvtk" ? "Town" : id === "wxk" ? "Weather" : "Whiterock"}
                  </span>
                </button>
              );
            })}
          </div>

          {radioEnabled ? (
            <div className="well px-3 py-2">
              <div className="flex items-center gap-1.5">
                {castPatchForSpeaker(broadcast.speaker) && (
                  <CastPatch id={castPatchForSpeaker(broadcast.speaker)!} size={22} />
                )}
                <p className="text-[0.72rem] font-extrabold text-sign-brown">
                  {broadcast.speaker}
                </p>
              </div>
              <p className="display mt-0.5 text-[1rem] leading-tight text-ink">
                {tidy(broadcast.title)}
              </p>
              <p className="mt-1 text-[0.84rem] font-bold leading-snug text-ink">
                {tidy(broadcast.body)}
              </p>
            </div>
          ) : (
            <p className="well px-3 py-2 text-[0.82rem] font-bold text-ink-soft">
              Radio is switched off. Pick any band above or turn power back on to hear Route 100.
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-pressed={radioEnabled}
              onClick={togglePower}
              className="key press min-h-11 px-3 text-xs font-extrabold [--lift:2px]"
            >
              Radio: {radioEnabled ? "On" : "Off"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenLog();
              }}
              className="key press min-h-11 px-3 text-xs font-extrabold [--lift:2px]"
            >
              Story log
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
