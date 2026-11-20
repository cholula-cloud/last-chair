"use client";

import { useState, type ReactNode } from "react";
import { lodgeName } from "@/game/assetNames";
import { LODGE_TIERS, lodgeTierUnlocks } from "@/game/base";
import { founderById } from "@/game/content";
import { TalentTreePanel } from "@/ui/TalentTreePanel";
import { dailyCosts, morningCash, payoffAmount } from "@/game/economy";
import { formatMoney } from "@/game/format";
import { expectedArrivals } from "@/game/rules";
import { expectedHillValue } from "@/game/satisfaction";
import type { GameState } from "@/game/state";
import { FARE_LABELS, FARE_PRICES } from "@/game/types";
import { SUMMIT_LINK_PAYMENT } from "@/game/summitLink";
import { schoolMemory } from "@/game/winterMemory";
import { StoryEntries } from "./StoryLog";
import { MoneyStatsCharts } from "./officeCharts";
import { OpsStatsCharts } from "./officeOpsCharts";
import { SeasonCalendar, SnowReport } from "./officeReports";
import { revenueBreakdownFromRecap } from "@/game/officeSeries";
import { tidy } from "@/ui/kit/parts";
import { RevenueMixDonut, VenueRevenueList } from "@/ui/revenueBreakdownUi";

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`panel space-y-2 p-4 ${className ?? ""}`}>
      <h3 className="display text-xl">{title}</h3>
      {children}
    </section>
  );
}

function LedgerRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-b border-snow-2 py-1.5 text-sm font-bold last:border-b-0 ${
        highlight ? "rounded-[var(--r-chip)] bg-gold/30 px-2 -mx-2 border-b-0" : ""
      }`}
    >
      <span className={highlight ? "font-extrabold" : undefined}>{label}</span>
      <span className={`shrink-0 tabular-nums ${highlight ? "font-extrabold" : ""}`}>{value}</span>
    </div>
  );
}

export function Money({ s }: { s: GameState }) {
  const report = s.dayHistory.at(-1);
  const recap = s.nightRecap ?? report?.recap;
  const costs = dailyCosts(s);
  const breakdown = recap ? revenueBreakdownFromRecap(recap) : null;
  const upcoming = s.dayIndex < s.seasonLength && s.outcome === "playing";
  const cashLabel = s.phase === "night" ? "Projected morning cash" : "Tomorrow's cash";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
      <div className="flex flex-col gap-4">
        <Section title="Cash and bills">
          <LedgerRow label="Cash on hand" value={formatMoney(s.cash)} />
          <LedgerRow label="Loan balance" value={formatMoney(s.loan ? payoffAmount(s.loan) : 0)} />
          {s.payables.map((p, i) => (
            <LedgerRow key={i} label={`Day ${p.dueDay}: ${p.what}`} value={formatMoney(p.amount)} />
          ))}
          <LedgerRow label="Snow prep tonight" value={formatMoney(costs.snowNight)} />
          <LedgerRow label="Construction due" value={formatMoney(costs.draws)} />
          <LedgerRow label={cashLabel} value={formatMoney(morningCash(s))} highlight />
        </Section>

        {upcoming && (
          <Section title="Tomorrow's fare outlook">
            <LedgerRow label="Reputation" value={String(s.reputation)} />
            <LedgerRow
              label="Estimated hill value"
              value={formatMoney(expectedHillValue(s.reputation, s.buildings, s.talentsOwned))}
            />
            <table className="mt-2 w-full text-sm font-bold">
              <thead>
                <tr className="border-b-2 border-snow-2 text-left text-xs font-extrabold text-ink-soft">
                  <th className="pb-1.5 pr-2">Fare</th>
                  <th className="pb-1.5 text-right">Expected skiers</th>
                </tr>
              </thead>
              <tbody>
                {(["cheap", "balanced", "expensive"] as const).map((fare) => (
                  <tr key={fare} className="border-b border-snow-2">
                    <td className="py-1.5 pr-2">
                      {FARE_LABELS[fare]} ({formatMoney(FARE_PRICES[fare])})
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {fare === "expensive" && s.summitLinkDecision === "accepted"
                        ? "Capped by pass deal"
                        : `~${Math.round(expectedArrivals(s, fare))}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}
      </div>

      <Section title="Last day's ledger">
        {recap ? (
          <>
            {breakdown && breakdown.total > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <LedgerRow label="Day revenue" value={formatMoney(breakdown.total)} />
                  <RevenueMixDonut breakdown={breakdown} size={88} />
                </div>
                {breakdown.tickets > 0 && <LedgerRow label="Lift tickets" value={formatMoney(breakdown.tickets)} />}
                {breakdown.venues > 0 && (
                  <div className="space-y-1">
                    <LedgerRow label="Base venues" value={formatMoney(breakdown.venues)} />
                    <VenueRevenueList facts={recap.facts} />
                  </div>
                )}
                {breakdown.schoolBus > 0 && <LedgerRow label="School bus" value={formatMoney(breakdown.schoolBus)} />}
              </div>
            )}
            {recap.costs && (
              <>
                <LedgerRow label="Fixed costs" value={formatMoney(recap.costs.fixed)} />
                <LedgerRow label="Founder adjustment" value={formatMoney(recap.costs.founder)} />
                <LedgerRow label="Lift operations" value={formatMoney(recap.costs.liftOps)} />
                <LedgerRow label="Upkeep" value={formatMoney(recap.costs.upkeep)} />
              </>
            )}
            <LedgerRow label="Net result" value={formatMoney(recap.cashDelta, { signed: true })} highlight />
            {recap.loanReceived > 0 && <LedgerRow label="Loan received" value={formatMoney(recap.loanReceived)} />}
            {recap.loanRepaid > 0 && <LedgerRow label="Loan repayment" value={formatMoney(recap.loanRepaid)} />}
            {recap.summitLinkReply === "accepted" && (
              <LedgerRow label="Summit Link payment" value={formatMoney(SUMMIT_LINK_PAYMENT)} />
            )}
          </>
        ) : (
          <p className="text-sm font-bold text-ink-soft">No closed days yet. Your first ledger appears at 4 PM closing.</p>
        )}
      </Section>
    </div>
  );
}

export function Stats({ s }: { s: GameState }) {
  const [view, setView] = useState<"all" | "money" | "ops">("all");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1 rounded-[var(--r-key)] border-2 border-ink bg-snow-2 p-1" role="group" aria-label="Stats section">
        {(
          [
            ["all", "All"],
            ["money", "Money"],
            ["ops", "Operations"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => setView(id)}
            className={`min-h-11 rounded-[calc(var(--r-key)-4px)] text-xs font-extrabold transition-colors ${
              view === id ? "bg-sign-green text-white shadow-[0_2px_0_var(--ink)]" : "text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
        {view !== "ops" && <MoneyStatsCharts state={s} />}
        {view !== "money" && <OpsStatsCharts state={s} />}
      </div>
    </div>
  );
}

export function Reports({ s }: { s: GameState }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
        <SeasonCalendar state={s} />
        <SnowReport state={s} />
      </div>
      <Section title="Recap archive">
        {s.dayHistory.length === 0 && (
          <p className="text-sm font-bold text-ink-soft">Closed days show up here as the winter goes on.</p>
        )}
        {s.dayHistory.slice().reverse().map((d) => (
          <details key={d.day} className="border-b border-snow-2 pb-2">
            <summary className="flex min-h-11 cursor-pointer items-baseline justify-between gap-2 py-2 font-extrabold">
              <span>Day {d.day}, {d.weather}</span>
              <span className="tabular-nums">{formatMoney(d.recap.cashDelta, { signed: true })}</span>
            </summary>
            <p className="text-sm font-bold leading-snug">{tidy(d.recap.problem)}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-bold tabular-nums">
              <div className="flex justify-between gap-2"><dt className="text-ink-soft">Guests</dt><dd>{d.recap.arrivals}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-soft">Satisfaction</dt><dd>{Math.round(d.recap.satisfaction)}/100</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-soft">Avg wait</dt><dd>{d.recap.facts.avgWaitMin.toFixed(1)} min</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-soft">Settled cash</dt><dd>{formatMoney(d.closingCash)}</dd></div>
            </dl>
            {d.recap.facts.schoolBus && (
              <p className="mt-1 text-xs font-bold">
                School tickets {formatMoney(d.recap.facts.schoolBus.ticketRevenue)}. {d.recap.facts.schoolBus.taught} of{" "}
                {d.recap.facts.schoolBus.invited} pupils taught.
              </p>
            )}
            <p className="mt-1 text-xs font-bold text-ink-soft">
              Service {formatMoney(d.snowCost)}. Construction {formatMoney(d.constructionDue)}.
            </p>
          </details>
        ))}
      </Section>
      <Section title="Story log">
        <StoryEntries compact />
      </Section>
      <Section title="Winter reviews">
        {s.career.length === 0 ? (
          <p className="text-sm font-bold text-ink-soft">Your first review shows up once the winter wraps.</p>
        ) : (
          s.career.map((w, i) => (
            <details key={i}>
              <summary className="min-h-11 cursor-pointer py-2 font-bold">
                Winter {i + 1}: {w.bankrupt ? "bank called" : w.netWorth >= 0 ? "solvency goal met" : "solvency goal missed"}
              </summary>
              <p className="text-sm font-bold">
                {w.day} days. Cash {formatMoney(w.cash)}. Loan {formatMoney(w.loan)}. Construction {formatMoney(w.construction)}. Net worth{" "}
                {formatMoney(w.netWorth)}.
              </p>
              {w.score && <p className="text-sm font-bold">Winter score {w.score.total}/100</p>}
              <p className="text-sm font-bold">{schoolMemory(w.school)}</p>
              {w.summitLink && (
                <p className="text-sm font-bold">
                  {w.summitLink === "accepted" ? "You took Vivian's offer." : "You turned down Vivian's offer."}
                </p>
              )}
            </details>
          ))
        )}
      </Section>
    </div>
  );
}

export function Crew({ s }: { s: GameState }) {
  const founder = founderById(s.founderId);
  const nextTier = s.lodgeTier === 1 ? 2 : s.lodgeTier === 2 ? 3 : null;
  const tier = LODGE_TIERS[s.lodgeTier];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {founder && (
          <Section title="Your founder">
            <p className="text-sm font-extrabold">{founder.name}</p>
            <p className="text-xs font-bold text-ink-soft">{founder.title}</p>
            <p className="mt-2 text-sm font-bold text-sign-green">+ {founder.bonus}</p>
            <p className="mt-1 text-sm font-bold text-barn-deep">- {founder.constraint}</p>
          </Section>
        )}
        <Section title="Base lodge">
          <p className="text-sm font-extrabold">
            {lodgeName(s)} (Tier {s.lodgeTier})
          </p>
          <LedgerRow label="Parking spaces" value={String(tier.stalls)} />
          <LedgerRow label="Annex pads" value={String(tier.pads)} />
          {nextTier && (
            <p className="pt-2 text-xs font-bold leading-snug text-ink-soft">
              {LODGE_TIERS[nextTier].label} adds {LODGE_TIERS[nextTier].stalls - tier.stalls} parking and{" "}
              {LODGE_TIERS[nextTier].pads - tier.pads} pads. Unlocks {lodgeTierUnlocks(nextTier).join(", ")}.
            </p>
          )}
          {s.lodgeUpgrade && (
            <p className="pt-1 text-sm font-extrabold text-gold">
              Upgrade in progress: {s.lodgeUpgrade.nightsRemaining}{" "}
              {s.lodgeUpgrade.nightsRemaining === 1 ? "night" : "nights"} left.
            </p>
          )}
        </Section>
      </div>
      <section className="panel space-y-2 p-4">
        <h3 className="display text-xl">Crew skills</h3>
        <TalentTreePanel />
      </section>
    </div>
  );
}