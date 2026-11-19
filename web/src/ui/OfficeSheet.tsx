"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MOUNTAIN_CALENDARS, dayLabel } from "@/game/calendar";
import { readActiveSlot } from "@/game/saveSlots";
import { useGameStore } from "@/game/store";
import { closeOffice, OFFICE_TABS, setOfficeTab, useOffice, type OfficeTabId } from "@/ui/officeStore";
import { DeskTab } from "@/ui/OfficeDesk";
import { SettingsControls } from "@/ui/SettingsControls";
import { CloseIcon } from "@/ui/kit/icons";

type Panel = "tabs" | "settings" | "slots";

const HEADER_BTN = "key key-sm press flex min-h-11 items-center justify-center px-3 text-[0.9rem] font-extrabold";

function TabPanel({ tab }: { tab: OfficeTabId }) {
  switch (tab) {
    case "desk":
      return <DeskTab />;
  }
}

/** Scrolls the active tab to the middle of the strip. */
function centreTab(strip: HTMLElement | null, instant: boolean) {
  const active = strip?.querySelector<HTMLElement>('[aria-selected="true"]');
  if (!strip || !active) return;
  const left = active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2;
  strip.scrollTo({ left: Math.max(0, left), behavior: instant ? "auto" : "smooth" });
}

function prefersReducedMotion(): boolean {
  if (document.documentElement.dataset.reduceMotion === "true") return true;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function Slots({ onLeave, onBack }: { onLeave: () => void; onBack: () => void }) {
  const slot = readActiveSlot();
  return (
    <section aria-label="Save slots" className="flex flex-col gap-3">
      <p className="panel px-4 py-3 text-[1rem] font-bold leading-snug">
        This winter saves to slot {slot} as you play.
      </p>
      <p className="px-1 text-[0.95rem] font-bold leading-snug">
        To load, export or delete a save, go to the menu. Your winter is saved first.
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onBack} className={`${HEADER_BTN} flex-1`}>
          Stay in the Office
        </button>
        <button
          type="button"
          onClick={onLeave}
          className={`${HEADER_BTN} key-solid flex-1 [--key-fill:var(--barn-deep)] [--key-ink:#fff]`}
        >
          Go to the menu
        </button>
      </div>
    </section>
  );
}

/** Full-screen Office. The day is paused while it is open (see `openOffice`). */
export function OfficeSheet({ onLeave }: { onLeave: () => void }) {
  const open = useOffice((s) => s.open);
  const tab = useOffice((s) => s.tab);
  const phase = useGameStore((s) => s.phase);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const seasonLength = useGameStore((s) => s.seasonLength);
  const mountainId = useGameStore((s) => s.mountainId);
  const [panel, setPanel] = useState<Panel>("tabs");
  const titleId = useId();
  const stripRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The Office only exists during a day; if the phase moves on, it closes without resuming anything.
  useEffect(() => {
    if (open && phase !== "day") closeOffice();
  }, [open, phase]);

  // Leaving the hill with the Office open must not leave the flag set for the next visit.
  useEffect(() => () => useOffice.setState({ open: false, resumeOnClose: false }), []);

  useEffect(() => {
    if (!open) return;
    headingRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (panel !== "tabs") setPanel("tabs");
      else closeOffice();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, panel]);

  useEffect(() => {
    if (open && panel === "tabs") centreTab(stripRef.current, prefersReducedMotion());
  }, [open, panel, tab]);

  if (!open) return null;

  const { weekday, date } = dayLabel(MOUNTAIN_CALENDARS[mountainId], dayIndex);
  const back = (body: ReactNode, label: string) => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setPanel("tabs")} className={HEADER_BTN}>Back</button>
        <h3 className="display text-[1.5rem]">{label}</h3>
      </div>
      {body}
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-office
      className="fixed inset-0 z-50 flex flex-col bg-sky text-ink"
    >
      <header className="border-b-[3px] border-ink px-3 pb-2 pt-[max(0.6rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className="display min-w-[5rem] flex-1 text-[1.7rem] leading-none outline-none">
            Office
          </h2>
          <button type="button" aria-pressed={panel === "settings"} onClick={() => setPanel("settings")} className={HEADER_BTN}>
            Settings
          </button>
          <button type="button" aria-pressed={panel === "slots"} onClick={() => setPanel("slots")} className={HEADER_BTN}>
            Save slots
          </button>
          <button
            type="button"
            onClick={closeOffice}
            aria-label="Close the Office"
            className="key key-sm press flex size-11 shrink-0 items-center justify-center"
          >
            <CloseIcon />
          </button>
        </div>
        <p className="mt-1.5 text-[0.85rem] font-bold text-ink-soft">
          Day {dayIndex} of {seasonLength}, {weekday} {date}. The day is paused.
        </p>
      </header>

      {panel === "tabs" && (
        <div
          ref={stripRef}
          role="tablist"
          aria-label="Office tabs"
          className="flex shrink-0 snap-x gap-2 overflow-x-auto overscroll-x-contain px-3 py-2 [scrollbar-width:none]"
        >
          {OFFICE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`office-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls="office-panel"
              onClick={() => setOfficeTab(t.id)}
              className={`key press min-h-11 shrink-0 snap-center px-4 text-[0.95rem] font-extrabold ${
                tab === t.id ? "key-solid [--key-fill:var(--ink)] [--key-ink:#fff]" : ""
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div
        id="office-panel"
        role={panel === "tabs" ? "tabpanel" : undefined}
        aria-labelledby={panel === "tabs" ? `office-tab-${tab}` : undefined}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-2"
      >
        <div className="mx-auto w-full max-w-xl">
          {panel === "tabs" && <TabPanel tab={tab} />}
          {panel === "settings" && back(<div className="panel p-4"><SettingsControls /></div>, "Settings")}
          {panel === "slots" && back(<Slots onLeave={onLeave} onBack={() => setPanel("tabs")} />, "Save slots")}
        </div>
      </div>
    </div>
  );
}
