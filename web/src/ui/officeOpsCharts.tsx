"use client";

import { formatMoney } from "@/game/format";
import { bestDayBy, fareElasticitySeries, opsSeries } from "@/game/officeSeries";
import { SAT_TERM_KEYS } from "@/game/satisfaction";
import type { GameState } from "@/game/state";
import {
  BarChartSvg,
  CHART_H,
  CHART_PAD,
  CHART_W,
  ChartCard,
  GridAxes,
  PLOT_H,
  PLOT_W,
  pickXLabels,
  shortMoney,
} from "./officeChartKit";

const TERM_LABELS: Record<(typeof SAT_TERM_KEYS)[number], string> = {
  queue: "Lift lines",
  snow: "Snow",
  value: "Value",
  runs: "Runs",
  arrivalMood: "Base mood",
};

function ArrivalsWaitChart({ state }: { state: GameState }) {
  const data = opsSeries(state.dayHistory);
  const last = data.at(-1);
  const best = bestDayBy(data, (d) => d.arrivals);
  const maxArr = Math.max(20, ...data.map((d) => d.arrivals));
  const maxWait = Math.max(8, ...data.map((d) => Math.ceil(d.avgWaitMin)));
  const slot = PLOT_W / Math.max(1, data.length);
  const barW = Math.max(6, Math.min(20, slot * 0.54));
  const yArr = (v: number) => CHART_PAD.top + PLOT_H - (v / maxArr) * PLOT_H;
  const yWait = (v: number) => CHART_PAD.top + PLOT_H - (v / maxWait) * PLOT_H;
  const xOf = (i: number) => CHART_PAD.left + slot * (i + 0.5);
  const waitLine = data.map((d, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yWait(d.avgWaitMin).toFixed(1)}`).join(" ");

  return (
    <ChartCard
      title="Arrivals & lift wait"
      hero={last ? `${last.arrivals} guests` : undefined}
      caption="Daily turnout bars paired with average lift wait minutes (amber line)."
      comparisons={last && best ? [`Yesterday wait: ${last.avgWaitMin.toFixed(1)} min`, `Busiest: Day ${best.day} (${best.value} guests)`] : undefined}
      empty={data.length === 0 ? "Turnout and lift wait lines appear after Day 1 closes." : undefined}
      columns={[
        { key: "day", label: "Day" },
        { key: "arr", label: "Guests", align: "right" },
        { key: "wait", label: "Avg wait", align: "right" },
      ]}
      rows={data.map((d) => ({ day: `Day ${d.day}`, arr: String(d.arrivals), wait: `${d.avgWaitMin.toFixed(1)} min` }))}
      legend={[
        { label: "Arrivals", color: "var(--sky)" },
        { label: `Avg wait (top ${maxWait} min)`, color: "var(--sign-yellow)" },
      ]}
    >
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="block h-auto w-full" role="img" aria-label="Daily arrivals and average lift wait">
        <GridAxes
          minY={0}
          maxY={maxArr}
          ticksY={[0, Math.round(maxArr / 2), maxArr]}
          formatY={(v) => String(Math.round(v))}
          xLabels={pickXLabels(data.map((d) => `D${d.day}`), xOf)}
        />
        {data.map((d, i) => {
          const y = yArr(d.arrivals);
          return (
            <rect
              key={d.day}
              x={xOf(i) - barW / 2}
              y={y}
              width={barW}
              height={Math.max(1, CHART_PAD.top + PLOT_H - y)}
              rx={2}
              fill="var(--sky)"
              stroke="var(--ink)"
              strokeWidth={1.5}
            />
          );
        })}
        {data.length >= 2 && <path d={waitLine} fill="none" stroke="var(--ink)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />}
        {data.length >= 2 && <path d={waitLine} fill="none" stroke="var(--sign-yellow)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />}
        {data.map((d, i) => (
          <circle key={d.day} cx={xOf(i)} cy={yWait(d.avgWaitMin)} r={3.5} fill="var(--sign-yellow)" stroke="var(--ink)" strokeWidth={1.8} />
        ))}
      </svg>
    </ChartCard>
  );
}

function SatisfactionChart({ state }: { state: GameState }) {
  const data = opsSeries(state.dayHistory);
  const last = data.at(-1);
  const best = bestDayBy(data, (d) => d.satisfaction);
  const yOf = (v: number) => CHART_PAD.top + PLOT_H - (v / 100) * PLOT_H;
  const xOf = (i: number) => (data.length <= 1 ? CHART_PAD.left + PLOT_W / 2 : CHART_PAD.left + (i / (data.length - 1)) * PLOT_W);
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(d.satisfaction).toFixed(1)}`).join(" ");

  return (
    <ChartCard
      title="Satisfaction & drivers"
      hero={last ? `${last.satisfaction}/100` : undefined}
      heroTone={!last ? "neutral" : last.satisfaction >= 70 ? "good" : last.satisfaction < 50 ? "bad" : "neutral"}
      caption="Daily guest mood and the five terms that moved yesterday's score."
      comparisons={last && best ? [`Yesterday: ${last.satisfaction}/100`, `Best day: Day ${best.day} (${best.value}/100)`] : undefined}
      empty={data.length === 0 ? "Guest satisfaction and its five drivers land after Day 1." : undefined}
      columns={[
        { key: "day", label: "Day" },
        { key: "score", label: "Score", align: "right" },
        { key: "queue", label: "Lines", align: "right" },
        { key: "snow", label: "Snow", align: "right" },
        { key: "value", label: "Value", align: "right" },
      ]}
      rows={data.map((d) => ({
        day: `Day ${d.day}`,
        score: `${d.satisfaction}`,
        queue: `${d.breakdown.queue >= 0 ? "+" : ""}${d.breakdown.queue.toFixed(1)}`,
        snow: `${d.breakdown.snow >= 0 ? "+" : ""}${d.breakdown.snow.toFixed(1)}`,
        value: `${d.breakdown.value >= 0 ? "+" : ""}${d.breakdown.value.toFixed(1)}`,
      }))}
    >
      <div className="space-y-2">
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="block h-auto w-full" role="img" aria-label="Daily guest satisfaction trend">
          <GridAxes minY={0} maxY={100} ticksY={[0, 50, 100]} formatY={(v) => `${v}`} xLabels={pickXLabels(data.map((d) => `D${d.day}`), xOf)} />
          {data.length >= 2 && <path d={line} fill="none" stroke="var(--ink)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}
          {data.map((d, i) => (
            <circle
              key={d.day}
              cx={xOf(i)}
              cy={yOf(d.satisfaction)}
              r={4}
              fill={d.satisfaction >= 70 ? "var(--sign-green)" : d.satisfaction < 50 ? "var(--barn)" : "var(--sign-yellow)"}
              stroke="var(--ink)"
              strokeWidth={2}
            />
          ))}
        </svg>
        {last && (
          <div className="grid grid-cols-5 gap-1 px-1 pb-0.5 text-center text-[0.7rem] font-extrabold tabular-nums">
            {SAT_TERM_KEYS.map((key) => {
              const val = last.breakdown[key];
              const tone = val > 0.5 ? "bg-sign-green text-white" : val < -0.5 ? "bg-barn-deep text-white" : "bg-snow text-ink";
              return (
                <div key={key} className={`rounded-lg border-2 border-ink px-1 py-1 leading-tight ${tone}`}>
                  <div className="truncate text-[0.62rem] opacity-90">{TERM_LABELS[key]}</div>
                  <div>{val >= 0 ? `+${val.toFixed(0)}` : val.toFixed(0)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ChartCard>
  );
}

function SatRevenueScatter({ state }: { state: GameState }) {
  const data = opsSeries(state.dayHistory);
  const maxRev = Math.max(500, ...data.map((d) => d.revenue));
  const xOf = (sat: number) => CHART_PAD.left + (Math.max(0, Math.min(100, sat)) / 100) * PLOT_W;
  const yOf = (rev: number) => CHART_PAD.top + PLOT_H - (rev / maxRev) * PLOT_H;

  return (
    <ChartCard
      title="Satisfaction vs. revenue"
      caption="Each dot is a closed day: happier hills earn more repeat turnout and spend."
      empty={data.length === 0 ? "Closed days plot here once the winter gets rolling." : undefined}
      columns={[
        { key: "day", label: "Day" },
        { key: "sat", label: "Satisfaction", align: "right" },
        { key: "rev", label: "Revenue", align: "right" },
      ]}
      rows={data.map((d) => ({ day: `Day ${d.day}`, sat: `${d.satisfaction}/100`, rev: formatMoney(d.revenue) }))}
    >
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="block h-auto w-full" role="img" aria-label="Scatter plot of satisfaction versus daily revenue">
        <GridAxes
          minY={0}
          maxY={maxRev}
          ticksY={[0, Math.round(maxRev / 2), Math.round(maxRev)]}
          formatY={shortMoney}
          xLabels={[0, 50, 100].map((v) => ({ x: xOf(v), label: `${v}` }))}
        />
        {data.map((d) => (
          <g key={d.day}>
            <circle cx={xOf(d.satisfaction)} cy={yOf(d.revenue)} r={6} fill="var(--gold)" stroke="var(--ink)" strokeWidth={2} />
            <text x={xOf(d.satisfaction)} y={yOf(d.revenue) + 3} textAnchor="middle" fontSize={8} fontWeight={800} fill="var(--ink)">
              {d.day}
            </text>
          </g>
        ))}
      </svg>
    </ChartCard>
  );
}

export function OpsStatsCharts({ state }: { state: GameState }) {
  const fares = fareElasticitySeries(state.dayHistory);
  const ops = opsSeries(state.dayHistory);
  const snowTotal = ops.reduce((sum, d) => sum + d.snowCost, 0);

  return (
    <div className="space-y-3" data-office-stats="ops">
      <ChartCard
        title="Fare vs. turnout"
        hero={fares.length ? `${fares.length} ${fares.length === 1 ? "tier" : "tiers"}` : undefined}
        caption="Average daily arrivals at each ticket price you have run this winter."
        comparisons={fares.map((f) => `${f.label} ($${f.price}): ${f.avgArrivals} guests`)}
        empty={fares.length === 0 ? "Try a few days at different fares to see how turnout responds." : undefined}
        columns={[
          { key: "tier", label: "Fare" },
          { key: "days", label: "Days", align: "right" },
          { key: "arr", label: "Avg guests", align: "right" },
          { key: "rev", label: "Avg rev", align: "right" },
        ]}
        rows={fares.map((f) => ({
          tier: `${f.label} ($${f.price})`,
          days: String(f.days),
          arr: String(f.avgArrivals),
          rev: formatMoney(f.avgRevenue),
        }))}
        legend={[{ label: "Avg arrivals", color: "var(--sign-green)" }]}
      >
        <BarChartSvg
          mode="grouped"
          minMax={20}
          formatY={(v) => String(Math.round(v))}
          ariaLabel="Average arrivals by fare tier"
          groups={fares.map((f) => ({ label: `$${f.price}`, bars: [{ value: f.avgArrivals, color: "var(--sign-green)" }] }))}
        />
      </ChartCard>

      <ArrivalsWaitChart state={state} />
      <SatisfactionChart state={state} />

      <ChartCard
        title="Snow & service spend"
        hero={ops.length ? formatMoney(snowTotal) : undefined}
        caption="Overnight snowmaking and grooming bills beside daytime operating costs."
        comparisons={ops.length ? [`Last night: ${formatMoney(ops.at(-1)!.snowCost)}`] : undefined}
        empty={ops.length === 0 ? "Overnight snow bills show up after your first night." : undefined}
        columns={[
          { key: "day", label: "Day" },
          { key: "snow", label: "Snow night", align: "right" },
          { key: "ops", label: "Day ops", align: "right" },
        ]}
        rows={ops.map((d) => ({ day: `Day ${d.day}`, snow: formatMoney(d.snowCost), ops: formatMoney(d.operatingCost) }))}
        legend={[
          { label: "Snow & service", color: "var(--sky)" },
          { label: "Daytime ops", color: "var(--barn)", pattern: "stripe" },
        ]}
      >
        <BarChartSvg
          mode="stacked"
          minMax={500}
          ariaLabel="Overnight snow spend stacked with daytime operating costs"
          groups={ops.map((d) => ({
            label: `D${d.day}`,
            bars: [
              { value: d.snowCost, color: "var(--sky)" },
              { value: d.operatingCost, color: "var(--barn)", pattern: "stripe" },
            ],
          }))}
        />
      </ChartCard>

      <SatRevenueScatter state={state} />
    </div>
  );
}
