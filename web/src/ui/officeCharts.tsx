"use client";

import { useId, useState, type ReactNode } from "react";
import { formatMoney } from "@/game/format";
import {
  bestDayBy,
  cashTrendSeries,
  constructionSeries,
  loanSeries,
  revCostSeries,
  revenueSourcesSeries,
} from "@/game/officeSeries";
import type { GameState } from "@/game/state";
import { useSettings } from "@/ui/settingsStore";

export const CHART_W = 320;
export const CHART_H = 152;
export const CHART_PAD = { top: 14, right: 12, bottom: 26, left: 46 };
export const PLOT_W = CHART_W - CHART_PAD.left - CHART_PAD.right;
export const PLOT_H = CHART_H - CHART_PAD.top - CHART_PAD.bottom;

export type TableColumn = { key: string; label: string; align?: "left" | "right" };
export type TableRow = Record<string, string>;
export type LegendItem = { label: string; color: string; pattern?: "stripe" | "dots" };

export function shortMoney(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  return abs >= 1000 ? `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k` : `${sign}$${Math.round(abs)}`;
}

export function pickXLabels(labels: string[], xOf: (index: number) => number): { x: number; label: string }[] {
  if (labels.length === 0) return [];
  if (labels.length <= 6) return labels.map((label, i) => ({ x: xOf(i), label }));
  const step = Math.ceil((labels.length - 1) / 4);
  const picks: { x: number; label: string }[] = [];
  for (let i = 0; i < labels.length; i += step) picks.push({ x: xOf(i), label: labels[i] });
  const last = labels.length - 1;
  if (picks.at(-1)?.label !== labels[last]) picks.push({ x: xOf(last), label: labels[last] });
  return picks;
}

export function ChartPatterns({ stripeId, dotId }: { stripeId: string; dotId?: string }) {
  return (
    <defs>
      <pattern id={stripeId} width={6} height={6} patternUnits="userSpaceOnUse">
        <path d="M-1 7L7-1M-1 1L1-1M5 7L7 5" stroke="var(--ink)" strokeWidth={1.3} opacity={0.45} />
      </pattern>
      {dotId && (
        <pattern id={dotId} width={6} height={6} patternUnits="userSpaceOnUse">
          <circle cx={3} cy={3} r={1.2} fill="var(--ink)" opacity={0.45} />
        </pattern>
      )}
    </defs>
  );
}

export function GridAxes({
  minY,
  maxY,
  ticksY,
  formatY,
  xLabels,
}: {
  minY: number;
  maxY: number;
  ticksY: number[];
  formatY: (v: number) => string;
  xLabels: { x: number; label: string }[];
}) {
  const span = Math.max(1, maxY - minY);
  const yOf = (v: number) => CHART_PAD.top + PLOT_H - ((v - minY) / span) * PLOT_H;
  return (
    <g>
      {ticksY.map((t) => {
        const y = yOf(t);
        return (
          <g key={t}>
            <line
              x1={CHART_PAD.left}
              x2={CHART_W - CHART_PAD.right}
              y1={y}
              y2={y}
              stroke="var(--ink)"
              strokeOpacity={t === 0 ? 0.55 : 0.16}
              strokeWidth={t === 0 ? 1.8 : 1}
              strokeDasharray={t === 0 ? undefined : "3 3"}
            />
            <text x={CHART_PAD.left - 6} y={y + 3.5} textAnchor="end" fontSize={10} fontWeight={800} fill="var(--ink-soft)">
              {formatY(t)}
            </text>
          </g>
        );
      })}
      {xLabels.map((item) => (
        <text key={`${item.x}-${item.label}`} x={item.x} y={CHART_H - 7} textAnchor="middle" fontSize={10} fontWeight={800} fill="var(--ink-soft)">
          {item.label}
        </text>
      ))}
    </g>
  );
}

function LegendSwatch({ color, pattern }: { color: string; pattern?: "stripe" | "dots" }) {
  const id = useId();
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
      {pattern && (
        <defs>
          <pattern id={id} width={6} height={6} patternUnits="userSpaceOnUse">
            {pattern === "stripe" && <path d="M-1 7L7-1M-1 1L1-1M5 7L7 5" stroke="var(--ink)" strokeWidth={1.4} />}
            {pattern === "dots" && <circle cx={3} cy={3} r={1.3} fill="var(--ink)" />}
          </pattern>
        </defs>
      )}
      <rect x={1} y={1} width={12} height={12} rx={3} fill={color} stroke="var(--ink)" strokeWidth={1.8} />
      {pattern && <rect x={1} y={1} width={12} height={12} rx={3} fill={`url(#${id})`} opacity={0.45} />}
    </svg>
  );
}

export function ChartCard({
  title,
  hero,
  heroTone = "neutral",
  caption,
  comparisons,
  empty,
  columns,
  rows,
  legend,
  children,
}: {
  title: string;
  hero?: string;
  heroTone?: "cash" | "good" | "bad" | "neutral";
  caption: string;
  comparisons?: string[];
  empty?: string;
  columns: TableColumn[];
  rows: TableRow[];
  legend?: LegendItem[];
  children: ReactNode;
}) {
  const reducedMotion = useSettings((s) => s.reduceMotion);
  const [override, setOverride] = useState<"chart" | "table" | null>(null);
  const showTable = override ? override === "table" : reducedMotion;
  const heroBg = {
    cash: "bg-gold text-ink",
    good: "bg-sign-green text-white",
    bad: "bg-barn-deep text-white",
    neutral: "bg-snow-2 text-ink",
  }[heroTone];

  return (
    <section className="panel space-y-2.5 p-3.5" aria-label={title}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="display text-[1.15rem] leading-tight text-ink">{title}</h3>
          <p className="mt-0.5 text-xs font-bold leading-snug text-ink-soft">{caption}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {hero && <span className={`chip display px-2.5 py-1 text-[1.05rem] leading-none tabular-nums [--lift:2px] ${heroBg}`}>{hero}</span>}
          {!empty && rows.length > 0 && (
            <button type="button" onClick={() => setOverride(showTable ? "chart" : "table")} aria-pressed={showTable}
              className="key key-sm press min-h-11 px-2.5 text-xs font-extrabold">
              {showTable ? "Chart" : "Table"}
            </button>
          )}
        </div>
      </div>
      {comparisons && comparisons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {comparisons.map((text) => (
            <span key={text} className="rounded-[var(--r-chip)] bg-snow-2 px-2 py-0.5 text-xs font-extrabold tabular-nums text-ink">{text}</span>
          ))}
        </div>
      )}
      {empty ? (
        <p className="rounded-[var(--r-chip)] bg-snow-2 px-3 py-3 text-sm font-bold text-ink-soft">{empty}</p>
      ) : showTable ? (
        <div className="overflow-x-auto rounded-[var(--r-chip)] border-2 border-ink bg-snow-2">
          <table className="w-full border-collapse text-xs font-bold tabular-nums">
            <thead>
              <tr className="border-b-2 border-ink text-ink-soft">
                {columns.map((c) => (
                  <th key={c.key} className={`px-2 py-1.5 font-extrabold ${c.align === "right" ? "text-right" : "text-left"}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-b border-ink/15 last:border-b-0">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-2 py-1.5 ${c.align === "right" ? "text-right" : "text-left"}`}>{r[c.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="rounded-[var(--r-chip)] border-2 border-ink bg-snow-2/60 p-1.5">{children}</div>
          {legend && legend.length > 0 && (
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-extrabold text-ink">
              {legend.map((item) => (
                <li key={item.label} className="inline-flex items-center gap-1.5">
                  <LegendSwatch color={item.color} pattern={item.pattern} />
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

type BarGroup = {
  label: string;
  bars: { value: number; color: string; pattern?: "stripe" | "dots" }[];
};

export function BarChartSvg({
  groups,
  mode,
  minMax,
  ariaLabel,
  formatY = shortMoney,
}: {
  groups: BarGroup[];
  mode: "grouped" | "stacked";
  minMax: number;
  ariaLabel: string;
  formatY?: (v: number) => string;
}) {
  const stripeId = useId();
  const dotId = useId();
  const maxVal = Math.max(
    minMax,
    ...groups.map((g) => (mode === "stacked" ? g.bars.reduce((s, b) => s + b.value, 0) : Math.max(0, ...g.bars.map((b) => b.value)))),
  );
  const yOf = (v: number) => CHART_PAD.top + PLOT_H - (v / maxVal) * PLOT_H;
  const base = CHART_PAD.top + PLOT_H;
  const slot = PLOT_W / Math.max(1, groups.length);
  const pat = (p?: "stripe" | "dots") => (p === "stripe" ? `url(#${stripeId})` : p === "dots" ? `url(#${dotId})` : null);

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="block h-auto w-full" role="img" aria-label={ariaLabel}>
      <ChartPatterns stripeId={stripeId} dotId={dotId} />
      <GridAxes
        minY={0}
        maxY={maxVal}
        ticksY={[0, Math.round(maxVal / 2), Math.round(maxVal)]}
        formatY={formatY}
        xLabels={pickXLabels(groups.map((g) => g.label), (i) => CHART_PAD.left + slot * (i + 0.5))}
      />
      {groups.map((g, i) => {
        const cx = CHART_PAD.left + slot * (i + 0.5);
        if (mode === "stacked") {
          const w = Math.max(8, Math.min(24, slot * 0.6));
          let acc = 0;
          return (
            <g key={`${g.label}-${i}`}>
              {g.bars.map((b, bi) => {
                if (b.value <= 0) return null;
                const y0 = yOf(acc);
                acc += b.value;
                const y1 = yOf(acc);
                const fillPat = pat(b.pattern);
                return (
                  <g key={bi}>
                    <rect x={cx - w / 2} y={y1} width={w} height={Math.max(1, y0 - y1)} fill={b.color} stroke="var(--ink)" strokeWidth={1.5} />
                    {fillPat && <rect x={cx - w / 2} y={y1} width={w} height={Math.max(1, y0 - y1)} fill={fillPat} />}
                  </g>
                );
              })}
            </g>
          );
        }
        const n = g.bars.length;
        const w = Math.max(4, Math.min(18, (slot * 0.72) / Math.max(1, n)));
        const startX = cx - (n * w + (n - 1) * 2) / 2;
        return (
          <g key={`${g.label}-${i}`}>
            {g.bars.map((b, bi) => {
              if (b.value <= 0) return null;
              const y = yOf(b.value);
              const x = startX + bi * (w + 2);
              const fillPat = pat(b.pattern);
              return (
                <g key={bi}>
                  <rect x={x} y={y} width={w} height={Math.max(1, base - y)} rx={2} fill={b.color} stroke="var(--ink)" strokeWidth={1.5} />
                  {fillPat && <rect x={x} y={y} width={w} height={Math.max(1, base - y)} rx={2} fill={fillPat} />}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

function CashTrendChart({ state }: { state: GameState }) {
  const data = cashTrendSeries(state);
  const settled = data.filter((d) => !d.projected);
  const latest = data.at(-1);
  const best = bestDayBy(settled, (d) => d.cash);
  const minY = Math.min(0, ...data.map((d) => d.cash));
  const maxY = Math.max(2000, ...data.map((d) => d.cash));
  const span = Math.max(1, maxY - minY);
  const yOf = (v: number) => CHART_PAD.top + PLOT_H - ((v - minY) / span) * PLOT_H;
  const xOf = (i: number) => (data.length <= 1 ? CHART_PAD.left + PLOT_W / 2 : CHART_PAD.left + (i / (data.length - 1)) * PLOT_W);
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(d.cash).toFixed(1)}`).join(" ");
  const zeroY = yOf(0);
  const area = data.length >= 2 ? `${line} L${xOf(data.length - 1).toFixed(1)},${zeroY.toFixed(1)} L${xOf(0).toFixed(1)},${zeroY.toFixed(1)} Z` : "";

  return (
    <ChartCard
      title="Morning cash trend"
      hero={latest ? formatMoney(latest.cash) : undefined}
      heroTone={latest && latest.cash < 0 ? "bad" : "cash"}
      caption="Cash on hand after nightly snow service and construction payments settle."
      comparisons={settled.length > 0 && best ? [`Last settled: ${formatMoney(settled.at(-1)!.cash)}`, `High water: Day ${best.day} (${formatMoney(best.value)})`] : undefined}
      empty={data.length === 0 ? "No cash history yet." : undefined}
      columns={[{ key: "day", label: "Day" }, { key: "cash", label: "Morning cash", align: "right" }, { key: "kind", label: "Status", align: "right" }]}
      rows={data.map((d) => ({ day: `Day ${d.day}`, cash: formatMoney(d.cash), kind: d.projected ? "Projected" : "Settled" }))}
      legend={[{ label: "Settled cash", color: "var(--gold)" }, { label: "Projected next morning", color: "var(--snow)", pattern: "dots" }]}
    >
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="block h-auto w-full" role="img" aria-label="Morning cash trend across the winter">
        <GridAxes minY={minY} maxY={maxY} ticksY={[minY, Math.round((minY + maxY) / 2), maxY]} formatY={shortMoney}
          xLabels={pickXLabels(data.map((d) => `D${d.day}`), xOf)} />
        {area && <path d={area} fill="var(--gold)" fillOpacity={0.35} />}
        {data.length >= 2 && <path d={line} fill="none" stroke="var(--ink)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />}
        {data.map((d, i) => (
          <circle key={`${d.day}-${d.projected ? "p" : "s"}`} cx={xOf(i)} cy={yOf(d.cash)} r={d.projected ? 5 : 4}
            fill={d.projected ? "var(--snow)" : d.cash < 0 ? "var(--barn)" : "var(--gold)"} stroke="var(--ink)" strokeWidth={2.2} />
        ))}
      </svg>
    </ChartCard>
  );
}

export function MoneyStatsCharts({ state }: { state: GameState }) {
  const rc = revCostSeries(state.dayHistory);
  const rcNet = rc.reduce((sum, d) => sum + d.net, 0);
  const rcBest = bestDayBy(rc, (d) => d.net);

  const src = revenueSourcesSeries(state.dayHistory);
  const srcTotal = src.reduce((sum, d) => sum + d.total, 0);
  const srcBest = bestDayBy(src, (d) => d.total);

  const build = constructionSeries(state);
  const loan = loanSeries(state);

  return (
    <div className="space-y-3" data-office-stats="money">
      <ChartCard
        title="Revenue vs. operating costs"
        hero={rc.length ? formatMoney(rcNet, { signed: true }) : undefined}
        heroTone={rcNet >= 0 ? "good" : "bad"}
        caption="Daily lift and venue takings stacked against fixed, lift, and upkeep bills."
        comparisons={rc.length && rcBest ? [`Yesterday: ${formatMoney(rc.at(-1)!.net, { signed: true })}`, `Best day: Day ${rcBest.day} (${formatMoney(rcBest.value, { signed: true })})`] : undefined}
        empty={rc.length === 0 ? "First ledger numbers land when the hill closes tonight." : undefined}
        columns={[{ key: "day", label: "Day" }, { key: "rev", label: "Revenue", align: "right" }, { key: "cost", label: "Costs", align: "right" }, { key: "net", label: "Net", align: "right" }]}
        rows={rc.map((d) => ({ day: `Day ${d.day}`, rev: formatMoney(d.revenue), cost: formatMoney(d.costs), net: formatMoney(d.net, { signed: true }) }))}
        legend={[{ label: "Revenue", color: "var(--sign-green)" }, { label: "Operating costs", color: "var(--barn)", pattern: "stripe" }]}
      >
        <BarChartSvg
          mode="grouped"
          minMax={500}
          ariaLabel="Revenue versus operating costs by day"
          groups={rc.map((d) => ({ label: `D${d.day}`, bars: [{ value: d.revenue, color: "var(--sign-green)" }, { value: d.costs, color: "var(--barn)", pattern: "stripe" }] }))}
        />
      </ChartCard>

      <ChartCard
        title="Revenue sources"
        hero={src.length ? formatMoney(srcTotal) : undefined}
        heroTone="cash"
        caption="How much of each day came from lift tickets, base venues, and school buses."
        comparisons={src.length && srcBest ? [`Yesterday: ${formatMoney(src.at(-1)!.total)}`, `Best day: Day ${srcBest.day} (${formatMoney(srcBest.value)})`] : undefined}
        empty={src.length === 0 ? "Ticket and venue receipts start stacking up after Day 1." : undefined}
        columns={[{ key: "day", label: "Day" }, { key: "tickets", label: "Tickets", align: "right" }, { key: "venues", label: "Venues", align: "right" }, { key: "bus", label: "School", align: "right" }]}
        rows={src.map((d) => ({ day: `Day ${d.day}`, tickets: formatMoney(d.tickets), venues: formatMoney(d.venues), bus: formatMoney(d.schoolBus) }))}
        legend={[{ label: "Tickets", color: "var(--sign-green)" }, { label: "Venues", color: "var(--gold)", pattern: "stripe" }, { label: "School bus", color: "var(--sky)", pattern: "dots" }]}
      >
        <BarChartSvg
          mode="stacked"
          minMax={400}
          ariaLabel="Revenue sources by day"
          groups={src.map((d) => ({
            label: `D${d.day}`,
            bars: [
              { value: d.tickets, color: "var(--sign-green)" },
              { value: d.venues, color: "var(--gold)", pattern: "stripe" },
              { value: d.schoolBus, color: "var(--sky)", pattern: "dots" },
            ],
          }))}
        />
      </ChartCard>

      <CashTrendChart state={state} />

      <ChartCard
        title="Construction timeline"
        hero={build.points.length ? formatMoney(build.totalPaid + build.totalScheduled) : undefined}
        caption="Installments already paid and bills still coming due from recent builds."
        comparisons={build.points.length ? [`Paid so far: ${formatMoney(build.totalPaid)}`, `Upcoming due: ${formatMoney(build.totalScheduled)}`] : undefined}
        empty={build.points.length === 0 ? "No construction installments on the books yet." : undefined}
        columns={[{ key: "day", label: "Day" }, { key: "paid", label: "Paid", align: "right" }, { key: "due", label: "Scheduled", align: "right" }]}
        rows={build.points.map((p) => ({ day: `Day ${p.day}`, paid: formatMoney(p.paid), due: formatMoney(p.scheduled) }))}
        legend={[{ label: "Paid", color: "var(--sign-brown)" }, { label: "Scheduled", color: "var(--sign-yellow)", pattern: "stripe" }]}
      >
        <BarChartSvg
          mode="stacked"
          minMax={500}
          ariaLabel="Construction installments paid and scheduled"
          groups={build.points.map((p) => ({
            label: `D${p.day}`,
            bars: [
              { value: p.paid, color: "var(--sign-brown)" },
              { value: p.scheduled, color: "var(--sign-yellow)", pattern: "stripe" },
            ],
          }))}
        />
      </ChartCard>

      <ChartCard
        title="Winter loan"
        hero={loan.active ? formatMoney(loan.currentPayoff) : "$0"}
        heroTone={loan.currentPayoff > 0 ? "bad" : "good"}
        caption="Drawdowns, repayments, and what it takes to clear the bank note today."
        comparisons={loan.active ? [`Borrowed: ${formatMoney(loan.totalBorrowed)}`, `Repaid: ${formatMoney(loan.totalRepaid)}`] : undefined}
        empty={!loan.active ? "No winter loan on the books. Keep cash above zero and the bank stays quiet." : undefined}
        columns={[{ key: "day", label: "Day" }, { key: "in", label: "Borrowed", align: "right" }, { key: "out", label: "Repaid", align: "right" }]}
        rows={loan.points.map((p) => ({ day: `Day ${p.day}`, in: formatMoney(p.received), out: formatMoney(p.repaid) }))}
        legend={[{ label: "Borrowed", color: "var(--barn)", pattern: "stripe" }, { label: "Repaid", color: "var(--sign-green)" }]}
      >
        <BarChartSvg
          mode="grouped"
          minMax={1000}
          ariaLabel="Winter loan drawdowns and repayments"
          groups={loan.points.map((p) => ({
            label: `D${p.day}`,
            bars: [
              { value: p.received, color: "var(--barn)", pattern: "stripe" },
              { value: p.repaid, color: "var(--sign-green)" },
            ],
          }))}
        />
      </ChartCard>
    </div>
  );
}
