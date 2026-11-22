"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { dayLabel, seasonCalendar } from "@/game/calendar";
import { hillById } from "@/game/mountains/roster";
import { readActiveSlot } from "@/game/saveSlots";
import { useGameStore } from "@/game/store";
import { closeOffice, OFFICE_TABS, setOfficeTab, useOffice, type OfficeTabId } from "@/ui/officeStore";
import { Money, Stats, Reports, Crew } from "./Office";
import { AtlasTab } from "@/ui/OfficeAtlas";
import { ReplayNotes } from "./ReplayNotes";
import { DeskTab } from "@/ui/OfficeDesk";
import { SettingsControls } from "@/ui/SettingsControls";
import { CloseIcon } from "@/ui/kit/icons";
import { motionPref } from "@/ui/motion";

type Panel = "tabs" | "settings" | "slots";

const HEADER_BTN = "key key-sm press flex min-h-11 items-center justify-center px-3 text-[0.9rem] font-extrabold";

function TabPanel({ tab }: { tab: OfficeTabId }) {
  const state = useGameStore();
  switch (tab) {
    case "Desk":
      return <DeskTab />;
    case "Money":
      return <Money s={state} />;
    case "Stats":
      return <Stats s={state} />;
    case "Reports":
      return <Reports s={state} />;
    case "Crew":
      return <Crew />;
    case "Atlas":
      return <AtlasTab />;
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
  return motionPref.get();
}

function Slots({ onLeave, onBack }: { onLeave: () => void; onBack: () => void }) {
  const slot = readActiveSlot();
  return (
    <section aria-label="Save slots" className="flex flex-col gap-3">
      <p className="panel px-4 py-3 text-[1rem] font-bold leading-snug">
        Auto-saving to slot {slot}.
      </p>
      <p className="px-1 text-[0.95rem] font-bold leading-snug">
        Return to the title menu to switch, export, or delete saves.
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onBack} className={`${HEADER_BTN} flex-1`}>
          Back to Office
        </button>
        <button
          type="button"
          onClick={onLeave}
          className={`${HEADER_BTN} key-solid flex-1 [--key-fill:var(--barn-deep)] [--key-ink:#fff]`}
        >
          Title menu
        </button>
      </div>
    </section>
  );
}

/** Full-screen Office. The day is paused while it is open (see `openOffice`). */
export function OfficeSheet({ onLeave }: { onLeave: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const tab = useOffice((s) => s.tab);
  const phase = useGameStore((s) => s.phase);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const mountainId = useGameStore((s) => s.mountainId);
  const seasonLength = useGameStore((s) => s.seasonLength);
  const cal = useGameStore((s) => seasonCalendar(s));
  const [panel, setPanel] = useState<Panel>("tabs");
  const titleId = useId();
  const stripRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    headingRef.current?.focus({ preventScroll: true });
    return () => element?.close();
  }, []);

  useEffect(() => {
    if (panel === "tabs") centreTab(stripRef.current, prefersReducedMotion());
  }, [panel, tab]);

  const { weekday } = dayLabel(cal, dayIndex);
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
    <dialog
      ref={dialog}
      onCancel={event => {
        event.preventDefault();
        if (panel === "tabs") closeOffice();
        else setPanel("tabs");
      }}
      aria-modal="true"
      aria-labelledby={titleId}
      data-office
      className="office-dialog fixed inset-0 m-0 flex h-dvh max-h-none w-screen max-w-none flex-col p-0 bg-sky text-ink"
    >
      <header className="border-b-[3px] border-ink px-3 pb-2 pt-[max(0.6rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className="display min-w-[5rem] flex-1 text-[1.45rem] sm:text-[1.7rem] leading-none outline-none">
            {hillById(mountainId).name} Office
          </h2>
          <button
            type="button"
            aria-pressed={panel === "settings"}
            onClick={() => setPanel("settings")}
            className={`${HEADER_BTN} px-2.5 sm:px-3`}
          >
            Settings
          </button>
          <button type="button" aria-pressed={panel === "slots"} onClick={() => setPanel("slots")} className={HEADER_BTN}>
            <span className="sm:hidden">Saves</span>
            <span className="hidden sm:inline">Save slots</span>
          </button>
          <button
            type="button"
            onClick={closeOffice}
            aria-label="Close Office"
            className="key key-sm press flex size-11 shrink-0 items-center justify-center"
          >
            <CloseIcon />
          </button>
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.85rem] font-bold text-ink-soft">
          <span>
            {weekday} · Day {dayIndex}/{seasonLength}
          </span>
          {phase === "day" && (
            <span className="chip bg-sign-yellow-soft px-2 py-0.5 text-[0.75rem] font-extrabold text-ink">
              Paused
            </span>
          )}
        </p>
      </header>

      {panel === "tabs" && (
        <div
          ref={stripRef}
          role="tablist"
          aria-label="Office tabs"
          className="flex shrink-0 snap-x gap-2 overflow-x-auto overscroll-x-contain px-3 py-2 md:justify-center md:overflow-x-visible [scrollbar-width:none]"
        >
          {OFFICE_TABS.map((t) => (
            <button
              key={t}
              type="button"
              data-office-tab={t}
              role="tab"
              id={`office-tab-${t}`}
              aria-selected={tab === t}
              aria-controls="office-panel"
              onClick={() => setOfficeTab(t)}
              className={`key press min-h-11 shrink-0 snap-center px-4 text-[0.95rem] font-extrabold ${
                tab === t ? "key-solid [--key-fill:var(--ink)] [--key-ink:#fff]" : ""
              }`}
            >
              {t === "Crew" ? "Talent tree" : t}
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
        <div className="mx-auto w-full max-w-xl space-y-3 md:max-w-4xl">
          {panel === "tabs" && <TabPanel tab={tab} />}
          {panel === "settings" && back(
            <div className="flex flex-col gap-4">
              <SettingsControls />
              <ReplayNotes />
            </div>,
            "Settings",
          )}
          {panel === "slots" && back(<Slots onLeave={onLeave} onBack={() => setPanel("tabs")} />, "Save slots")}
        </div>
      </div>
    </dialog>
  );
}