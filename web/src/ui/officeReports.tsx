"use client";

import { useState, type ReactNode } from "react";
import { formatMoney } from "@/game/format";
import { seasonCalendarCells, trailReportRows } from "@/game/officeSeries";
import type { GameState } from "@/game/state";
import type { WeatherKind } from "@/game/types";
import { DifficultyIcon, SnowfallIcon, SunIcon, ThawIcon, WindIcon } from "@/ui/kit/icons";
import { TONE_CHIP, tidy } from "@/ui/kit/parts";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const WEATHER_ICON: Record<WeatherKind, ReactNode> = {
  clear: <SunIcon size={14} />,
  snow: <SnowfallIcon size={14} />,
  storm: <WindIcon size={14} />,
  thaw: <ThawIcon size={14} />,
};

export function SeasonCalendar({ state }: { state: GameState }) {
  const cells = seasonCalendarCells(state);
  const [selectedDay, setSelectedDay] = useState<number | null>(() => state.dayHistory.at(-1)?.day ?? null);
  const active = cells.find((c) => c.day === selectedDay && c.report) ?? null;

  return (
    <section className="panel space-y-2.5 p-3.5" aria-label="28-day winter calendar">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="display text-xl text-ink">28-day winter calendar</h3>
        <span className="text-xs font-extrabold tabular-nums text-ink-soft">
          Day {state.dayIndex} of {state.seasonLength}
        </span>
      </div>
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] md:items-start md:gap-4">
        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-[0.68rem] font-extrabold text-ink-soft">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1" role="grid" aria-label="Season days">
            {cells.map((cell) => {
              const net = cell.report?.recap.cashDelta ?? null;
              const isSelected = active?.day === cell.day;
              const tone =
                cell.status === "today"
                  ? "bg-gold text-ink"
                  : cell.status === "upcoming"
                    ? "bg-snow-2 text-ink-soft"
                    : net !== null && net >= 0
                      ? "bg-sign-green text-white"
                      : "bg-barn-deep text-white";
              return (
                <button
                  key={cell.day}
                  type="button"
                  disabled={!cell.report}
                  aria-pressed={isSelected}
                  aria-label={`Day ${cell.day}, ${cell.weekday} ${cell.date}${cell.report ? `, ${formatMoney(cell.report.recap.cashDelta, { signed: true })}` : cell.status === "today" ? ", today" : ", upcoming"}`}
                  onClick={() => setSelectedDay(cell.day)}
                  className={`flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-[10px] border-2 border-ink px-0.5 py-1 text-xs font-extrabold tabular-nums transition-transform ${tone} ${
                    isSelected ? "ring-2 ring-sign-yellow ring-offset-1" : ""
                  } ${!cell.report ? "cursor-default opacity-80" : "press"}`}
                >
                  <span className="leading-none">{cell.day}</span>
                  <span className="flex h-3.5 items-center justify-center" aria-hidden="true">
                    {cell.weather ? WEATHER_ICON[cell.weather] : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {active?.report ? (
          <div className="mt-2 rounded-[var(--r-chip)] border-2 border-ink bg-snow-2 p-3 text-xs font-bold leading-snug md:mt-0" role="status">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm font-extrabold text-ink">
                Day {active.day}, {active.weekday} {active.date} ({active.report.weather})
              </strong>
              <span className="chip bg-gold px-2 py-0.5 text-xs font-extrabold tabular-nums [--lift:2px]">
                {formatMoney(active.report.recap.cashDelta, { signed: true })}
              </span>
            </div>
            <p className="mt-1 text-ink">{tidy(active.report.recap.problem)}</p>
            <p className="mt-1 tabular-nums text-ink-soft">
              {active.report.recap.arrivals} guests, satisfaction {Math.round(active.report.recap.satisfaction)}/100, average wait{" "}
              {active.report.recap.facts.avgWaitMin.toFixed(1)} min.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-xs font-bold text-ink-soft md:mt-0">Tap any settled day to read its recap.</p>
        )}
      </div>
    </section>
  );
}

export function SnowReport({ state }: { state: GameState }) {
  const rows = trailReportRows(state);
  const openCount = rows.filter((r) => r.open).length;
  return (
    <section className="panel space-y-2.5 p-3.5" aria-label="Dutch Hill snow report">
      <div className="sign p-1">
        <div className="sign-inner flex items-center justify-between gap-2 px-3 py-2">
          <div>
            <h3 className="display text-lg leading-none text-white">Dutch Hill snow report</h3>
            <p className="mt-0.5 text-xs font-bold text-sign-green-ink">
              {openCount} of {rows.length} {rows.length === 1 ? "trail" : "trails"} open
            </p>
          </div>
          <div className="text-right text-xs font-extrabold tabular-nums text-white">
            <div>Depth {Math.round(state.snowDepth * 100)}%</div>
            <div className="text-sign-green-ink">Quality {Math.round(state.snowQuality * 100)}%</div>
          </div>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm font-bold text-ink-soft">No confirmed trails yet. Paint a run to publish the snow report.</p>
      ) : (
        <ul className="divide-y-2 divide-snow-2">
          {rows.map((row) => (
            <li key={row.name} className="flex items-center justify-between gap-2 py-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 text-ink">
                  <DifficultyIcon difficulty={row.difficulty} size={15} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold text-ink">
                    {row.name}
                    {row.glade && <span className="ml-1.5 text-xs font-bold text-ink-soft">(Glade)</span>}
                  </div>
                  <div className="text-xs font-bold tabular-nums text-ink-soft">
                    Depth {row.depthPct}%, quality {row.qualityPct}%
                  </div>
                </div>
              </div>
              <span className={`shrink-0 rounded-md border border-ink/20 px-2 py-1 text-[0.7rem] font-extrabold ${TONE_CHIP[row.tone]}`}>
                {row.condition}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}