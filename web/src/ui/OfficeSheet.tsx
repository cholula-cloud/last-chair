"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { dayLabel, seasonCalendar } from "@/game/calendar";
import { hillById } from "@/game/mountains/roster";
import { readActiveSlot } from "@/game/saveSlots";
import { useGameStore } from "@/game/store";
import { closeOffice, setOfficeTab, useOffice, type OfficeTabId } from "@/ui/officeStore";
import { Money, Stats, Reports, Crew } from "./Office";
import { AtlasTab } from "@/ui/OfficeAtlas";
import { ReplayNotes } from "./ReplayNotes";
import { DeskTab } from "@/ui/OfficeDesk";
import { SettingsControls } from "@/ui/SettingsControls";
import { CloseIcon, SettingsIcon } from "@/ui/kit/icons";
import { SegmentedControl } from "@/ui/kit/SegmentedControl";

type Panel = "tabs" | "utility";
type UtilityTab = "settings" | "slots";
type VisibleTab = "Desk" | "Money" | "Reports" | "Crew" | "Atlas";

const VISIBLE_TABS: readonly { value: VisibleTab; label: string; ariaLabel: string }[] = [
  { value: "Desk", label: "Desk", ariaLabel: "Desk" },
  { value: "Money", label: "Money", ariaLabel: "Money and stats" },
  { value: "Reports", label: "Log", ariaLabel: "Reports and log" },
  { value: "Crew", label: "Talents", ariaLabel: "Talent tree" },
  { value: "Atlas", label: "Atlas", ariaLabel: "Atlas" },
];

const HEADER_BTN = "key key-sm press flex min-h-11 items-center justify-center px-3 text-[0.9rem] font-extrabold";

function MoneyAndStats({ sub }: { sub: "ledger" | "stats" }) {
  const state = useGameStore();

  return (
    <div className="space-y-3">
      <SegmentedControl
        ariaLabel="Money and stats view"
        size="sm"
        value={sub}
        onChange={(next) => setOfficeTab(next === "stats" ? "Stats" : "Money")}
        options={[
          { value: "ledger", label: "Ledger & outlook" },
          { value: "stats", label: "Charts & stats" },
        ]}
      />
      {sub === "ledger" ? <Money s={state} /> : <Stats s={state} />}
    </div>
  );
}

function TabPanel({ tab }: { tab: OfficeTabId }) {
  const state = useGameStore();
  switch (tab) {
    case "Desk":
      return <DeskTab />;
    case "Money":
      return <MoneyAndStats sub="ledger" />;
    case "Stats":
      return <MoneyAndStats sub="stats" />;
    case "Reports":
      return <Reports s={state} />;
    case "Crew":
      return <Crew />;
    case "Atlas":
      return <AtlasTab />;
  }
}

function Slots({ onLeave }: { onLeave: () => void }) {
  const slot = readActiveSlot();
  return (
    <section aria-label="Save slots" className="panel flex flex-col gap-3 p-4">
      <p className="well px-3.5 py-2.5 text-[0.95rem] font-extrabold leading-snug">
        Auto-saving to slot {slot}.
      </p>
      <p className="text-[0.9rem] font-bold leading-snug text-ink-soft">
        Return to the title menu to switch, export, or delete saves.
      </p>
      <button
        type="button"
        onClick={onLeave}
        className={`${HEADER_BTN} key-solid [--key-fill:var(--barn-deep)] [--key-ink:#fff]`}
      >
        Title menu
      </button>
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
  const [utilityTab, setUtilityTab] = useState<UtilityTab>("settings");
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    headingRef.current?.focus({ preventScroll: true });
    return () => element?.close();
  }, []);

  const visibleTab: VisibleTab = tab === "Stats" ? "Money" : tab;
  const { weekday } = dayLabel(cal, dayIndex);
  const back = (body: ReactNode, label: string) => (
    <div className="beat-swap flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setPanel("tabs")} className={HEADER_BTN}>Back</button>
        <h3 className="display text-[1.45rem]">{label}</h3>
      </div>
      <SegmentedControl
        ariaLabel="Settings and saves"
        size="sm"
        value={utilityTab}
        onChange={setUtilityTab}
        options={[
          { value: "settings", label: "Settings" },
          { value: "slots", label: "Save slots" },
        ]}
      />
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
      <header className="border-b-[3px] border-ink px-3 pb-2.5 pt-[max(0.6rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-2">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} ref={headingRef} tabIndex={-1} className="display truncate text-[1.45rem] sm:text-[1.7rem] leading-none outline-none">
              {hillById(mountainId).name} Office
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[0.82rem] font-bold text-ink-soft">
              <span>
                {weekday}, Day {dayIndex}/{seasonLength}
              </span>
              {phase === "day" && (
                <span className="well-white bg-sign-yellow-soft px-2 py-0.5 text-[0.72rem] font-extrabold text-ink">
                  Paused
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            aria-pressed={panel === "utility"}
            aria-label="Settings and saves"
            onClick={() => setPanel((p) => (p === "utility" ? "tabs" : "utility"))}
            className="key key-sm press flex size-11 shrink-0 items-center justify-center"
          >
            <SettingsIcon size={20} />
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
      </header>

      {panel === "tabs" && (
        <div className="mx-auto w-full max-w-4xl shrink-0 px-3 pt-2.5 pb-1">
          <SegmentedControl
            role="tablist"
            ariaLabel="Office tabs"
            size="sm"
            value={visibleTab}
            onChange={(next) => setOfficeTab(next)}
            options={VISIBLE_TABS.map((item) => ({
              value: item.value,
              label: item.label,
              ariaLabel: item.ariaLabel,
              dataAttr: {
                "data-office-tab": item.value,
                id: `office-tab-${item.value}`,
              },
            }))}
          />
        </div>
      )}

      <div
        id="office-panel"
        role={panel === "tabs" ? "tabpanel" : undefined}
        aria-labelledby={panel === "tabs" ? `office-tab-${visibleTab}` : undefined}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-2"
      >
        <div
          className={`mx-auto w-full max-w-xl space-y-3 md:max-w-4xl ${
            panel === "tabs" && visibleTab === "Crew"
              ? ""
              : "pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          }`}
        >
          {panel === "tabs" && <TabPanel tab={tab} />}
          {panel === "utility" && back(
            utilityTab === "settings" ? (
              <div className="flex flex-col gap-4">
                <SettingsControls />
                <ReplayNotes />
              </div>
            ) : (
              <Slots onLeave={onLeave} />
            ),
            utilityTab === "settings" ? "Settings" : "Save slots",
          )}
        </div>
      </div>
    </dialog>
  );
}