"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { formatMoney } from "@/game/format";
import {
  SLOT_NUMBERS,
  exportFilename,
  firstEmptySlot,
  parseExport,
  readActiveSlot,
  readAllSlotSummaries,
  type SlotNumber,
  type SlotSummary,
} from "@/game/saveSlots";
import { useGameStore } from "@/game/store";
import { deleteSlot, exportSlot, importIntoSlot, playSlot, startNewWinter } from "@/game/slotActions";
import { SettingsControls } from "@/ui/SettingsControls";
import { useSpeed } from "@/ui/speed";

type View = "main" | "load" | "settings" | "credits";

type Confirm =
  | { kind: "new"; slot: SlotNumber }
  | { kind: "delete"; slot: SlotNumber }
  | { kind: "import"; slot: SlotNumber; text: string };

type OkSummary = Extract<SlotSummary, { kind: "ok" }>;

const dayLine = (s: OkSummary) => `${s.hill}, day ${s.dayIndex} of ${s.seasonLength}.`;

function playedLine(savedAt: number | null): string {
  if (savedAt === null) return "Last played a while back.";
  const when = new Date(savedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `Last played ${when}.`;
}

function download(name: string, json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const BTN = "key press min-h-12 px-4 text-[1rem] font-extrabold";
const BTN_SM = "key key-sm press min-h-11 px-3 text-[0.95rem] font-extrabold";

/** Modal question with the safe answer focused first. */
function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancelNow = useRef(onCancel);
  useEffect(() => {
    cancelNow.current = onCancel;
  });
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelNow.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="panel flex w-full max-w-sm flex-col gap-3 p-4"
      >
        <h2 id={titleId} className="display text-[1.5rem]">{title}</h2>
        <p id={bodyId} className="text-[0.95rem] font-bold leading-snug">{body}</p>
        <div className="flex gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} className={`${BTN} flex-1`}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`${BTN} key-solid flex-1 [--key-fill:var(--barn-deep)] [--key-ink:#fff]`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubView({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <section aria-labelledby="title-subview" className="panel mt-6 flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className={BTN_SM}>Back</button>
        <h2 id="title-subview" ref={headingRef} tabIndex={-1} className="display text-[1.6rem] outline-none">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function SlotCard({
  slot,
  summary,
  onPlay,
  onExport,
  onDelete,
}: {
  slot: SlotNumber;
  summary: SlotSummary;
  onPlay: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="key flex flex-col gap-2 p-3 [--lift:3px]">
      <div className="min-w-0">
        <h3 className="display text-[1.25rem]">Slot {slot}</h3>
        {summary.kind === "ok" && (
          <>
            <p className="text-[0.95rem] font-bold">{dayLine(summary)} Cash {formatMoney(summary.cash)}.</p>
            <p className="text-[0.85rem] font-bold text-ink-soft">{playedLine(summary.savedAt)}</p>
          </>
        )}
        {summary.kind === "empty" && <p className="text-[0.95rem] font-bold text-ink-soft">Nothing here yet.</p>}
        {summary.kind === "unreadable" && (
          <p className="text-[0.95rem] font-bold">Save unreadable. Play to start fresh and keep a backup copy.</p>
        )}
      </div>
      {summary.kind !== "empty" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onPlay} aria-label={`Play slot ${slot}`} className={`${BTN_SM} key-solid [--key-fill:var(--sign-green)] [--key-ink:#fff]`}>
            Play
          </button>
          {summary.kind === "ok" && (
            <button type="button" onClick={onExport} aria-label={`Export slot ${slot}`} className={BTN_SM}>
              Export
            </button>
          )}
          <button type="button" onClick={onDelete} aria-label={`Delete slot ${slot}`} className={BTN_SM}>
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

function SettingsView({ onBack }: { onBack: () => void }) {
  return (
    <SubView title="Settings" onBack={onBack}>
      <SettingsControls />
    </SubView>
  );
}

function CreditsView({ onBack }: { onBack: () => void }) {
  return (
    <SubView title="Credits" onBack={onBack}>
      <p className="font-bold leading-snug">Last Chair was made by Griffin O’Driscoll.</p>
      <p className="font-bold leading-snug">Built with Next.js, React Three Fiber, three.js and zustand.</p>
      <p className="font-bold leading-snug">Voice by ElevenLabs.</p>
      <p className="font-bold leading-snug">
        Wind and effects are synthesized in your browser when recorded clips are not installed; optional clips may be generated with ElevenLabs on free credits.
      </p>
    </SubView>
  );
}

export function TitleScreen({ onStart, initialView = "main" }: { onStart: (opts?: { newWinter: boolean }) => void; initialView?: View }) {
  const [view, setView] = useState<View>(initialView);
  const [summaries, setSummaries] = useState<SlotSummary[]>(() => readAllSlotSummaries());
  const [active, setActive] = useState<SlotNumber>(() => readActiveSlot());
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importSlot, setImportSlot] = useState<SlotNumber>(() => firstEmptySlot(readAllSlotSummaries()) ?? 1);
  const saveNotice = useGameStore((s) => s.saveNotice);
  const dismissSaveNotice = useGameStore((s) => s.dismissSaveNotice);
  const fileRef = useRef<HTMLInputElement>(null);
  const importSlotId = useId();

  const refresh = useCallback(() => {
    setSummaries(readAllSlotSummaries());
    setActive(readActiveSlot());
  }, []);

  const summaryOf = (slot: SlotNumber): SlotSummary => summaries[slot - 1] ?? { kind: "empty" };
  const activeSummary = summaryOf(active);

  const enterGame = (opts?: { newWinter: boolean }) => {
    useSpeed.getState().reset();
    onStart(opts);
  };

  const play = async (slot: SlotNumber) => {
    await playSlot(slot);
    enterGame();
  };

  const begin = (slot: SlotNumber) => {
    startNewWinter(slot);
    enterGame({ newWinter: true });
  };

  const newWinter = () => {
    const target = activeSummary.kind === "empty" ? active : (firstEmptySlot(summaries) ?? active);
    if (summaryOf(target).kind === "empty") begin(target);
    else setConfirm({ kind: "new", slot: target });
  };

  const exportOne = (slot: SlotNumber) => {
    const file = exportSlot(slot);
    if (!file) {
      setMessage("Pick a slot that has a saved winter in it to export.");
      return;
    }
    download(exportFilename(file), JSON.stringify(file, null, 2));
    setMessage(`Slot ${slot} is saved to a file.`);
  };

  const finishImport = (slot: SlotNumber, text: string) => {
    const outcome = importIntoSlot(slot, text);
    setMessage(outcome.ok ? `Imported into slot ${slot}.` : outcome.message);
    refresh();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setMessage(null);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setMessage("Couldn’t read that file. Pick it again.");
      return;
    }
    const check = parseExport(text);
    if (!check.ok) {
      setMessage(check.message);
      return;
    }
    if (summaryOf(importSlot).kind === "empty") finishImport(importSlot, text);
    else setConfirm({ kind: "import", slot: importSlot, text });
  };

  const dialog = (() => {
    if (!confirm) return null;
    const close = () => setConfirm(null);
    if (confirm.kind === "new") {
      return (
        <ConfirmDialog
          title="Start a new winter?"
          body={`Slot ${confirm.slot} has a winter in progress. Starting new replaces it.`}
          confirmLabel="Replace it"
          onCancel={close}
          onConfirm={() => {
            setConfirm(null);
            begin(confirm.slot);
          }}
        />
      );
    }
    if (confirm.kind === "delete") {
      return (
        <ConfirmDialog
          title={`Delete slot ${confirm.slot}?`}
          body={`Deletes slot ${confirm.slot} permanently. No undo.`}
          confirmLabel="Delete"
          onCancel={close}
          onConfirm={() => {
            deleteSlot(confirm.slot);
            setConfirm(null);
            setMessage(`Slot ${confirm.slot} was deleted.`);
            refresh();
          }}
        />
      );
    }
    return (
      <ConfirmDialog
        title="Replace this winter?"
        body={`Slot ${confirm.slot} is in use. Import replaces that winter.`}
        confirmLabel="Replace it"
        onCancel={close}
        onConfirm={() => {
          setConfirm(null);
          finishImport(confirm.slot, confirm.text);
        }}
      />
    );
  })();

  const goto = (next: View) => {
    setMessage(null);
    refresh();
    setView(next);
  };

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-sky text-ink">
      <main
        inert={confirm !== null}
        className="relative z-10 mx-auto flex max-w-xl flex-col px-4 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]"
      >
        <div className="panel !bg-sky px-2 pb-6 pt-8">
          <h1 className="title-outline display text-center text-[clamp(3rem,16vw,5.2rem)] leading-[0.95]">Last Chair</h1>
        </div>

        {saveNotice && (
          <div className="key mt-6 flex items-center gap-2 p-1 pl-3">
            <p role="status" className="flex-1 text-sm font-bold">{saveNotice}</p>
            <button
              type="button"
              onClick={dismissSaveNotice}
              aria-label="Dismiss save notice"
              className="key key-sm press grid size-11 shrink-0 place-items-center font-extrabold"
            >
              ×
            </button>
          </div>
        )}

        {view === "main" && (
          <nav aria-label="Main menu" className="mt-6 flex flex-col gap-3">
            {activeSummary.kind === "ok" && !saveNotice && (
              <button
                type="button"
                onClick={() => void play(active)}
                className="sign sign-btn press block w-full"
              >
                <span className="sign-inner flex min-h-[64px] flex-col items-center justify-center px-3 py-1">
                  <span className="display text-[1.6rem]">Continue</span>
                  <span className="text-[0.9rem] font-bold">
                    {dayLine(activeSummary)} Cash {formatMoney(activeSummary.cash)}.
                  </span>
                </span>
              </button>
            )}
            <button type="button" onClick={newWinter} className={BTN}>New winter</button>
            <button type="button" onClick={() => goto("load")} className={BTN}>Load</button>
            <button type="button" onClick={() => goto("settings")} className={BTN}>Settings</button>
            <button type="button" onClick={() => goto("credits")} className={BTN}>Credits</button>
          </nav>
        )}

        {view === "load" && (
          <SubView title="Load" onBack={() => goto("main")}>
            <ul className="flex flex-col gap-3">
              {SLOT_NUMBERS.map((slot) => (
                <SlotCard
                  key={slot}
                  slot={slot}
                  summary={summaryOf(slot)}
                  onPlay={() => void play(slot)}
                  onExport={() => exportOne(slot)}
                  onDelete={() => setConfirm({ kind: "delete", slot })}
                />
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <h3 className="display text-[1.25rem]">Import a save</h3>
              <label htmlFor={importSlotId} className="text-[0.95rem] font-bold">Import into</label>
              <select
                id={importSlotId}
                value={importSlot}
                onChange={(e) => setImportSlot(Number(e.target.value) as SlotNumber)}
                className="key min-h-11 px-3 font-extrabold"
              >
                {SLOT_NUMBERS.map((slot) => (
                  <option key={slot} value={slot}>
                    Slot {slot}{summaryOf(slot).kind === "empty" ? " (empty)" : ""}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => fileRef.current?.click()} className={BTN}>
                Import from file
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                tabIndex={-1}
                className="hidden"
                onChange={(e) => {
                  const input = e.currentTarget;
                  void onFile(input.files?.[0]).finally(() => {
                    input.value = "";
                  });
                }}
              />
            </div>
          </SubView>
        )}

        {view === "settings" && <SettingsView onBack={() => goto("main")} />}
        {view === "credits" && <CreditsView onBack={() => goto("main")} />}

        <p role="status" className="mt-4 min-h-6 text-center font-extrabold">{message}</p>
      </main>
      {dialog}
    </div>
  );
}
