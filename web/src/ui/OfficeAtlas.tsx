"use client";

import { useState } from "react";
import { formatMoney } from "@/game/format";
import {
  ensureCareerHills,
  HILL_ROSTER,
  LORE_PINS,
  pinTone,
  type CareerHillStatus,
} from "@/game/mountains/roster";
import { useGameStore } from "@/game/store";

type SelectedPin = string;

const STATUS_LABELS: Record<CareerHillStatus, string> = {
  open: "Open this winter",
  caretaker: "Caretaker running",
  whiterock: "Acquired by Whiterock",
  forest: "Returned to forest",
  unopened: "Lost hill",
};

const TONE_CLASSES: Record<"pine" | "whiterock" | "slate", string> = {
  pine: "bg-[#2d6a4f] text-white",
  whiterock: "bg-[#2563eb] text-white",
  slate: "bg-[#64748b] text-white",
};

export function AtlasTab() {
  const mountainId = useGameStore((s) => s.mountainId);
  const careerHillsRaw = useGameStore((s) => s.careerHills);
  const careerHills = ensureCareerHills(careerHillsRaw, mountainId);
  const [selected, setSelected] = useState<SelectedPin>(mountainId);

  const selectedHill = HILL_ROSTER.find((h) => h.id === selected) ?? null;
  const selectedLore = LORE_PINS.find((l) => l.id === selected) ?? null;
  const record = selectedHill
    ? careerHills.find((r) => r.mountainId === selectedHill.id) ?? careerHills[0]
    : null;

  return (
    <section aria-label="New England ski atlas" className="grid gap-4 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="panel p-3.5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="display text-[1.2rem]">New England Lost Hills</h3>
          <div className="flex flex-wrap gap-1.5 text-[0.75rem] font-extrabold">
            <span className="chip inline-flex items-center gap-1.5 px-2 py-0.5">
              <span className="size-2.5 rounded-full border border-ink bg-[#2d6a4f]" />
              Open
            </span>
            <span className="chip inline-flex items-center gap-1.5 px-2 py-0.5">
              <span className="size-2.5 rounded-full border border-ink bg-[#2563eb]" />
              Whiterock
            </span>
            <span className="chip inline-flex items-center gap-1.5 px-2 py-0.5">
              <span className="size-2.5 rounded-full border border-ink bg-[#64748b]" />
              Unopened
            </span>
          </div>
        </div>

        <div className="relative mx-auto aspect-[10/11] w-full max-w-[360px] overflow-hidden rounded-xl border-[2.5px] border-ink bg-[#d8ecf4]">
          <svg
            viewBox="0 0 300 330"
            className="h-full w-full"
            aria-hidden="true"
          >
            {/* Vermont */}
            <path
              d="M54 96 L108 88 L112 132 L106 186 L108 242 L68 248 L60 198 L48 144 Z"
              fill="#e4eed4"
              stroke="#1f1a14"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* New Hampshire */}
            <path
              d="M108 88 L148 74 L162 122 L176 196 L154 242 L108 242 L106 186 L112 132 Z"
              fill="#edf3dc"
              stroke="#1f1a14"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Maine */}
            <path
              d="M148 74 L218 28 L266 72 L248 134 L196 176 L176 196 L162 122 Z"
              fill="#e2ebd0"
              stroke="#1f1a14"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Massachusetts */}
            <path
              d="M50 248 L158 242 L206 254 L224 276 L196 302 L152 296 L124 304 L46 304 Z"
              fill="#f1f0dc"
              stroke="#1f1a14"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Ridge & valley contour cues */}
            <path
              d="M84 128 Q94 185 88 246"
              fill="none"
              stroke="#86a77c"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <path
              d="M138 118 Q144 176 126 266"
              fill="none"
              stroke="#86a77c"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <text x="72" y="138" fontSize="11" fontWeight="800" fill="#506249">VT</text>
            <text x="128" y="136" fontSize="11" fontWeight="800" fill="#506249">NH</text>
            <text x="206" y="114" fontSize="11" fontWeight="800" fill="#506249">ME</text>
            <text x="134" y="278" fontSize="11" fontWeight="800" fill="#5c5944">MA</text>
          </svg>

          {HILL_ROSTER.map((hill) => {
            const hillRecord = careerHills.find((r) => r.mountainId === hill.id)!;
            const tone = pinTone(hillRecord.status);
            const isSelected = selected === hill.id;
            const isCurrent = hill.id === mountainId;
            return (
              <button
                key={hill.id}
                type="button"
                aria-label={`${hill.name}, ${hill.town} ${hill.state} (${STATUS_LABELS[hillRecord.status]})`}
                aria-pressed={isSelected}
                onClick={() => setSelected(hill.id)}
                style={{
                  left: `${(hill.mapPoint.x / 300) * 100}%`,
                  top: `${(hill.mapPoint.y / 330) * 100}%`,
                }}
                className="group absolute -translate-x-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
              >
                <span
                  className={`flex size-5 items-center justify-center rounded-full border-2 border-ink shadow-sm transition-transform group-hover:scale-110 ${TONE_CLASSES[tone]} ${
                    isSelected ? "ring-2 ring-[var(--sign-yellow)] scale-125" : ""
                  }`}
                >
                  {isCurrent && <span className="size-1.5 rounded-full bg-[var(--sign-yellow)]" />}
                </span>
              </button>
            );
          })}

          {LORE_PINS.map((lore) => {
            const isSelected = selected === lore.id;
            return (
              <button
                key={lore.id}
                type="button"
                aria-label={`${lore.name}, ${lore.town} ${lore.state} (Conservation land)`}
                aria-pressed={isSelected}
                onClick={() => setSelected(lore.id)}
                style={{
                  left: `${(lore.mapPoint.x / 300) * 100}%`,
                  top: `${(lore.mapPoint.y / 330) * 100}%`,
                }}
                className="group absolute -translate-x-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
              >
                <span
                  className={`size-3.5 rounded-full border-2 border-dashed border-ink bg-[#f5efe0] transition-transform group-hover:scale-110 ${
                    isSelected ? "ring-2 ring-[var(--sign-yellow)] scale-125" : ""
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {selectedHill && record && (
          <article className="panel space-y-2.5 p-4" aria-label="Heritage card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[0.8rem] font-extrabold uppercase tracking-wider text-ink-soft">
                  Act {selectedHill.act} {selectedHill.playable ? "" : "(Later milestone)"}
                </p>
                <h4 className="display text-[1.45rem] leading-tight">{selectedHill.name}</h4>
                <p className="text-sm font-bold text-ink-soft">
                  {selectedHill.town}, {selectedHill.state}
                </p>
              </div>
              <span className={`rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-extrabold ${TONE_CLASSES[pinTone(record.status)]}`}>
                {STATUS_LABELS[record.status]}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="chip px-2 py-1.5">
                <p className="text-[0.72rem] font-bold text-ink-soft">Vertical</p>
                <p className="text-sm font-extrabold">{selectedHill.verticalNote}</p>
              </div>
              <div className="chip px-2 py-1.5">
                <p className="text-[0.72rem] font-bold text-ink-soft">Original run</p>
                <p className="text-sm font-extrabold">{selectedHill.years}</p>
              </div>
              <div className="chip px-2 py-1.5">
                <p className="text-[0.72rem] font-bold text-ink-soft">Seed grant</p>
                <p className="text-sm font-extrabold">{formatMoney(selectedHill.startingCash)}</p>
              </div>
            </div>

            <p className="text-[0.95rem] font-bold leading-snug">{selectedHill.heritage}</p>
            <p className="chip px-3 py-2 text-sm font-bold">
              Local ally: {selectedHill.localContact} ({selectedHill.contactRole}). {selectedHill.signatureHook}
            </p>

            {record.wintersRun > 0 && (
              <div className="chip space-y-1 px-3 py-2 text-sm font-bold">
                <p>Winters operated: {record.wintersRun}{record.bestScore !== null ? `, best score ${record.bestScore}` : ""}</p>
                {record.caretakerAlly && (
                  <p>
                    Caretaker: {record.caretakerAlly}
                    {record.lastReputation !== null ? ` (rep ${record.lastReputation})` : ""}
                    {record.lastCashDelta !== 0 ? `, last ledger ${record.lastCashDelta > 0 ? "+" : ""}${formatMoney(record.lastCashDelta)}` : ""}
                  </p>
                )}
              </div>
            )}
          </article>
        )}

        {selectedLore && (
          <article className="panel space-y-2 p-4" aria-label="Heritage card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[0.8rem] font-extrabold uppercase tracking-wider text-ink-soft">Lore pin</p>
                <h4 className="display text-[1.45rem] leading-tight">{selectedLore.name}</h4>
                <p className="text-sm font-bold text-ink-soft">{selectedLore.town}, {selectedLore.state}</p>
              </div>
              <span className="rounded-full border-2 border-ink bg-[#f5efe0] px-2.5 py-0.5 text-xs font-extrabold text-ink">
                Conserved parkland
              </span>
            </div>
            <p className="text-sm font-bold text-ink-soft">
              {selectedLore.verticalNote}, operated {selectedLore.years}
            </p>
            <p className="text-[0.95rem] font-bold leading-snug">{selectedLore.heritage}</p>
          </article>
        )}

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 md:grid-cols-2">
          {HILL_ROSTER.map((hill) => {
            const hillRecord = careerHills.find((r) => r.mountainId === hill.id)!;
            const active = selected === hill.id;
            return (
              <button
                key={hill.id}
                type="button"
                onClick={() => setSelected(hill.id)}
                className={`key press min-h-10 px-2.5 py-1.5 text-left text-xs font-extrabold ${
                  active ? "key-solid [--key-fill:var(--sign-yellow)]" : ""
                }`}
              >
                <span className="block truncate">{hill.name}</span>
                <span className="block text-[0.7rem] font-bold text-ink-soft">
                  {hill.town}, {hill.state} {hillRecord.status === "whiterock" ? "(WR)" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
