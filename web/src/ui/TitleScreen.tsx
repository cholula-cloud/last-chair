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
import { CloseIcon } from "@/ui/kit/icons";
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
    <section aria-labelledby="title-subview" className="panel beat-swap mt-5 flex flex-col gap-3.5 p-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className={BTN_SM}>Back</button>
        <h2 id="title-subview" ref={headingRef} tabIndex={-1} className="display text-[1.5rem] outline-none">
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
    <li className="well-white flex flex-col gap-2.5 p-3">
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="display text-[1.2rem]">Slot {slot}</h3>
          {summary.kind === "ok" && (
            <span className="text-xs font-extrabold text-ink-soft">{playedLine(summary.savedAt)}</span>
          )}
        </div>
        {summary.kind === "ok" && (
          <p className="mt-0.5 text-[0.92rem] font-extrabold">{dayLine(summary)} Cash {formatMoney(summary.cash)}.</p>
        )}
        {summary.kind === "empty" && <p className="text-[0.9rem] font-bold text-ink-soft">Nothing here yet.</p>}
        {summary.kind === "unreadable" && (
          <p className="text-[0.9rem] font-bold text-barn-deep">Save unreadable. Play to start fresh and keep a backup copy.</p>
        )}
      </div>
      {summary.kind !== "empty" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onPlay} aria-label={`Play slot ${slot}`} className={`${BTN_SM} key-solid flex-1 [--key-fill:var(--sign-green)] [--key-ink:#fff]`}>
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

function TitleHills() {
  const back = "M0 46 C60 14 130 18 195 44 C255 68 325 20 400 30";
  const front = "M0 80 C70 52 150 60 220 82 C290 102 350 72 400 62";
  return (
    <svg
      viewBox="0 0 400 120"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full short:h-20"
      aria-hidden="true"
      focusable="false"
    >
      <path d={`${back} V120 H0Z`} fill="var(--snow-2)" />
      <path d={back} fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d={`${front} V120 H0Z`} fill="var(--snow)" />
      <path d={front} fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function TitleRidges() {
  const far = "M0 120 L50 70 L95 105 L150 45 L210 100 L265 60 L320 100 L370 55 L400 85";
  const near = "M0 150 L40 115 L85 140 L140 95 L195 135 L250 105 L305 140 L355 110 L400 135";
  const pines = [[62, 140], [77, 147], [300, 152], [331, 148], [376, 140]];
  return (
    <svg
      viewBox="0 20 400 180"
      preserveAspectRatio="xMidYMax slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <path d={`${far} V200 H0Z`} fill="#c6e6f7" />
      <path d={`${near} V200 H0Z`} fill="#6e9fc7" />
      <path d="M140 95 L127 109 L135 106 L141 112 L147 106 L153 109Z" fill="#fff" />
      <path d="M250 105 L238 114 L245 112 L250 117 L256 112 L262 115Z" fill="#fff" />
      <path d={near} fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {pines.map(([x, y]) => (
        <path
          key={x}
          d={`M${x - 7} ${y} L${x} ${y - 20} L${x + 7} ${y}Z`}
          fill="var(--sign-green)"
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
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
    <div className="relative flex min-h-[100svh] flex-col overflow-x-hidden bg-sky text-ink">
      <TitleHills />
      <main
        inert={confirm !== null}
        className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 pb-28 pt-[max(2rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] short:pb-16 short:pt-4"
      >
        <div className="panel relative overflow-hidden !bg-sky px-3 pb-7 pt-14 short:pb-5 short:pt-10">
          <TitleRidges />
          <h1 className="title-outline display relative text-center text-[clamp(3rem,15vw,5rem)] leading-[0.95] short:text-[3.2rem]">
            Last Chair
          </h1>
        </div>

        {saveNotice && (
          <div className="chip mt-5 flex items-center gap-2 p-1.5 pl-3 [--lift:3px]">
            <p role="status" className="flex-1 text-sm font-bold">{saveNotice}</p>
            <button
              type="button"
              onClick={dismissSaveNotice}
              aria-label="Dismiss save notice"
              className="key key-sm press grid size-11 shrink-0 place-items-center"
            >
              <CloseIcon size={18} />
            </button>
          </div>
        )}

        {view === "main" && (
          <nav aria-label="Main menu" className="beat-swap mt-5 flex flex-col gap-2.5">
            <p className="text-center text-[0.98rem] font-extrabold text-ink">
              Reopen a lost Vermont ski hill for one more winter.
            </p>
            {activeSummary.kind === "ok" && !saveNotice && (
              <button
                type="button"
                onClick={() => void play(active)}
                className="sign sign-btn press block w-full"
              >
                <span className="sign-inner flex min-h-[60px] flex-col items-center justify-center px-3 py-1">
                  <span className="display text-[1.55rem]">Continue</span>
                  <span className="text-[0.88rem] font-bold">
                    {dayLine(activeSummary)} Cash {formatMoney(activeSummary.cash)}.
                  </span>
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={newWinter}
              className={
                activeSummary.kind === "ok" && !saveNotice
                  ? BTN
                  : "sign sign-btn press block w-full"
              }
            >
              {activeSummary.kind === "ok" && !saveNotice ? (
                "New winter"
              ) : (
                <span className="sign-inner display flex min-h-[48px] items-center justify-center text-[1.5rem]">
                  New winter
                </span>
              )}
            </button>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => goto("load")} className={BTN}>Load</button>
              <button type="button" onClick={() => goto("settings")} className={BTN}>Settings</button>
              <button type="button" onClick={() => goto("credits")} className={BTN}>Credits</button>
            </div>
          </nav>
        )}

        {view === "load" && (
          <SubView title="Load" onBack={() => goto("main")}>
            <ul className="flex flex-col gap-2.5">
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
            <div className="well flex flex-col gap-2 p-3">
              <h3 className="display text-[1.15rem]">Import a save</h3>
              <label htmlFor={importSlotId} className="text-[0.9rem] font-bold">Import into</label>
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
