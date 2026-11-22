"use client";

import { useId } from "react";
import { formatMoney } from "@/game/format";
import {
  bestDayBy,
  cashTrendSeries,
  constructionSeries,
  loanSeries,
  revCostSeries,
  revenueSourcesAggregate,
  revenueSourcesSeries,
} from "@/game/officeSeries";
import type { GameState } from "@/game/state";
import { RevenueMixDonut } from "./revenueBreakdownUi";
import {
  BarChartSvg,
  CHART_H,
  CHART_PAD,
  CHART_W,
  ChartCard,
  ChartPatterns,
  GridAxes,
  PLOT_H,
  PLOT_W,
  pickXLabels,
  shortMoney,
} from "./officeChartKit";

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

function BuildCommitmentsCard({ state }: { state: GameState }) {
  const stripeId = useId();
  const clipId = useId();
  const build = constructionSeries(state);
  const hasAny = build.upcoming.length > 0 || build.totalPaid > 0;
  const totalBar = Math.max(1, build.totalScheduled + build.freeCash);
  const barW = CHART_W - 24;
  const committedW = (build.totalScheduled / totalBar) * barW;
  const freeW = (build.freeCash / totalBar) * barW;
  const heroTone = build.shortfall > 0 ? "bad" : build.totalScheduled === 0 ? "good" : "neutral";

  return (
    <ChartCard
      title="Build bills and free cash"
      hero={build.totalScheduled > 0 ? `${formatMoney(build.totalScheduled)} due` : "$0 due"}
      heroTone={heroTone}
      caption="Build cash paid upfront this winter and any legacy bills still open."
      comparisons={[
        build.shortfall > 0 ? `Shortfall: ${formatMoney(build.shortfall)}` : `Free to spend: ${formatMoney(build.freeCash)}`,
        `Paid this winter: ${formatMoney(build.totalPaid)}`,
      ]}
      empty={!hasAny ? "No build bills on the books. Every dollar on hand is free to spend." : undefined}
      columns={[
        { key: "when", label: "Due" },
        { key: "what", label: "Build" },
        { key: "amount", label: "Amount", align: "right" },
      ]}
      rows={
        build.upcoming.length > 0
          ? build.upcoming.map((b) => ({ when: b.timing, what: b.label, amount: formatMoney(b.amount) }))
          : [{ when: "None due", what: "All installments paid", amount: formatMoney(build.totalPaid) }]
      }
      legend={[
        { label: "Spoken for", color: build.shortfall > 0 ? "var(--barn)" : "var(--sign-yellow)", pattern: "stripe" },
        { label: "Free to spend", color: "var(--gold)" },
      ]}
    >
      <div className="space-y-2 p-1">
        <svg viewBox={`0 0 ${CHART_W} 40`} className="block h-auto w-full" role="img" aria-label="Cash committed to upcoming builds versus free to spend">
          <ChartPatterns stripeId={stripeId} />
          <defs>
            <clipPath id={clipId}>
              <rect x={12} y={8} width={barW} height={24} rx={8} />
            </clipPath>
          </defs>
          <rect x={12} y={8} width={barW} height={24} rx={8} fill="var(--snow)" />
          <g clipPath={`url(#${clipId})`}>
            {committedW > 0 && (
              <>
                <rect x={12} y={8} width={committedW} height={24} fill={build.shortfall > 0 ? "var(--barn)" : "var(--sign-yellow)"} />
                <rect x={12} y={8} width={committedW} height={24} fill={`url(#${stripeId})`} />
              </>
            )}
            {freeW > 0 && <rect x={12 + committedW} y={8} width={freeW} height={24} fill="var(--gold)" />}
            {committedW > 0 && freeW > 0 && (
              <line x1={12 + committedW} x2={12 + committedW} y1={8} y2={32} stroke="var(--ink)" strokeWidth={2.4} />
            )}
          </g>
          <rect x={12} y={8} width={barW} height={24} rx={8} fill="none" stroke="var(--ink)" strokeWidth={2.4} />
        </svg>
        {build.upcoming.length > 0 ? (
          <ul className="divide-y divide-ink/15 rounded-[var(--r-chip)] bg-snow px-2.5 text-xs font-extrabold tabular-nums">
            {build.upcoming.map((b, i) => (
              <li key={`${b.dueDay}-${b.label}-${i}`} className="flex items-center justify-between gap-2 py-1.5">
                <span className="text-ink-soft">{b.timing}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{b.label}</span>
                <span className="shrink-0 text-ink">{formatMoney(b.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-1 text-xs font-extrabold text-sign-green">All installments cleared. Your full cash balance is free to spend.</p>
        )}
      </div>
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
  const seasonMix = revenueSourcesAggregate(state.dayHistory);

  const loan = loanSeries(state);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start" data-office-stats="money">
      <ChartCard
        title="Revenue vs. operating costs"
        hero={rc.length ? formatMoney(rcNet, { signed: true }) : undefined}
        heroTone={rcNet >= 0 ? "good" : "bad"}
        caption="Total day revenue (tickets, venues, and school bus) against fixed, lift, and upkeep bills."
        comparisons={rc.length && rcBest ? [`Yesterday: ${formatMoney(rc.at(-1)!.net, { signed: true })}`, `Best day: Day ${rcBest.day} (${formatMoney(rcBest.value, { signed: true })})`] : undefined}
        empty={rc.length === 0 ? "Ledger data appears after your first 4 PM closing." : undefined}
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
        empty={src.length === 0 ? "Customer revenue starts stacking up after Day 1." : undefined}
        columns={[{ key: "day", label: "Day" }, { key: "tickets", label: "Lift tickets", align: "right" }, { key: "venues", label: "Base venues", align: "right" }, { key: "bus", label: "School bus", align: "right" }]}
        rows={src.map((d) => ({ day: `Day ${d.day}`, tickets: formatMoney(d.tickets), venues: formatMoney(d.venues), bus: formatMoney(d.schoolBus) }))}
        legend={[{ label: "Lift tickets", color: "var(--sign-green)" }, { label: "Base venues", color: "var(--gold)", pattern: "stripe" }, { label: "School bus", color: "var(--sky)", pattern: "dots" }]}
      >
        <div className="flex flex-col items-center gap-3">
          {seasonMix.total > 0 && (
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-extrabold text-ink-soft">Season mix</p>
              <RevenueMixDonut breakdown={seasonMix} size={100} />
            </div>
          )}
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
        </div>
      </ChartCard>

      <CashTrendChart state={state} />

      <BuildCommitmentsCard state={state} />

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