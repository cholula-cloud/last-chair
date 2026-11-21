"use client";

import { useId, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/ui/motion";

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

export function LegendSwatch({ color, pattern }: { color: string; pattern?: "stripe" | "dots" }) {
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
  const reducedMotion = useReducedMotion();
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

export type PieSlice = {
  label: string;
  value: number;
  color: string;
  pattern?: "stripe" | "dots";
};

function donutWedge(cx: number, cy: number, rOut: number, rIn: number, start: number, end: number): string {
  const large = end - start > Math.PI ? 1 : 0;
  const x0 = cx + rOut * Math.cos(start);
  const y0 = cy + rOut * Math.sin(start);
  const x1 = cx + rOut * Math.cos(end);
  const y1 = cy + rOut * Math.sin(end);
  const x2 = cx + rIn * Math.cos(end);
  const y2 = cy + rIn * Math.sin(end);
  const x3 = cx + rIn * Math.cos(start);
  const y3 = cy + rIn * Math.sin(start);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${rOut} ${rOut} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} A ${rIn} ${rIn} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)} Z`;
}

export function PieChartSvg({
  slices,
  size = 112,
  ariaLabel,
}: {
  slices: readonly PieSlice[];
  size?: number;
  ariaLabel: string;
}) {
  const stripeId = useId();
  const dotId = useId();
  const active = slices.filter((s) => s.value > 0);
  const total = active.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const rOut = size * 0.46;
  const rIn = size * 0.26;
  let angle = -Math.PI / 2;
  const pat = (p?: "stripe" | "dots") => (p === "stripe" ? `url(#${stripeId})` : p === "dots" ? `url(#${dotId})` : null);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="block shrink-0" role="img" aria-label={ariaLabel}>
      <ChartPatterns stripeId={stripeId} dotId={dotId} />
      {active.length === 1 ? (
        <g>
          <circle cx={cx} cy={cy} r={rOut} fill={active[0].color} stroke="var(--ink)" strokeWidth={2} />
          {pat(active[0].pattern) && <circle cx={cx} cy={cy} r={rOut} fill={pat(active[0].pattern)!} />}
          <circle cx={cx} cy={cy} r={rIn} fill="var(--snow)" stroke="var(--ink)" strokeWidth={2} />
        </g>
      ) : (
        active.map((slice) => {
          const sweep = (slice.value / total) * Math.PI * 2;
          const end = angle + sweep;
          const d = donutWedge(cx, cy, rOut, rIn, angle, end);
          angle = end;
          const fillPat = pat(slice.pattern);
          return (
            <g key={slice.label}>
              <path d={d} fill={slice.color} stroke="var(--ink)" strokeWidth={1.5} strokeLinejoin="round" />
              {fillPat && <path d={d} fill={fillPat} />}
            </g>
          );
        })
      )}
    </svg>
  );
}
