"use client";

import { type ReactNode } from "react";
import { ASSET_CATALOG, LODGE_TIERS, lodgeTierUnlocks, type AssetId } from "@/game/base";
import { MOUNTAIN_CALENDARS } from "@/game/calendar";
import { operatingGoalText } from "@/game/winterArc";
import { CREW_TALENTS, founderById } from "@/game/content";
import { dailyCosts, morningCash, payoffAmount } from "@/game/economy";
import { formatMoney } from "@/game/format";
import { expectedArrivals } from "@/game/rules";
import { expectedHillValue } from "@/game/satisfaction";
import type { GameState } from "@/game/state";
import { FARE_LABELS, FARE_PRICES } from "@/game/types";
import { goalChips, goalInputs } from "@/game/goals";
import { schoolMemory } from "@/game/winterMemory";
import { StoryEntries } from "./StoryLog";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="panel space-y-2 p-4"><h3 className="display text-xl">{title}</h3>{children}</section>;
}

export function Money({ s }: { s: GameState }) {
  const report = s.dayHistory.at(-1);
  const recap = s.nightRecap ?? report?.recap;
  const costs = dailyCosts(s);
  const venues = Object.entries(recap?.facts.venueRevenue ?? {});
  const venueTotal = venues.reduce((total, [, amount]) => total + amount, 0);
  const bus = recap?.facts.schoolBus?.ticketRevenue ?? 0;
  const upcoming = s.dayIndex < s.seasonLength && s.outcome === "playing";
  return <>
    <Section title="Cash and commitments">
      <p>Cash on hand <strong>{formatMoney(s.cash)}</strong></p>
      <p>Loan balance {formatMoney(s.loan ? payoffAmount(s.loan) : 0)}</p>
      {s.payables.map((p,i) => <p key={i}>Day {p.dueDay} · {p.what} installment {formatMoney(p.amount)}</p>)}
      <p>{s.phase === "night" ? "Projected morning cash" : "Cash after scheduled payments, before today’s operating result"} <strong>{formatMoney(morningCash(s))}</strong></p>
      <p>Snow service {formatMoney(costs.snowNight)} · Installments due {formatMoney(costs.draws)}</p>
    </Section>
    <Section title={recap ? `Operating ledger · day ${s.nightRecap ? s.dayIndex : report?.day}` : "Operating ledger"}>
      {recap ? <>
        {recap.revenue !== null && <p>Public tickets {formatMoney(recap.revenue - venueTotal - bus)} · School tickets {formatMoney(bus)}</p>}
        {venues.map(([id, amount]) => <p key={id}>{ASSET_CATALOG[id as AssetId].label} {formatMoney(amount)}</p>)}
        {recap.costs && <p>Fixed costs {formatMoney(recap.costs.fixed)} · Founder adjustment {formatMoney(recap.costs.founder)} · Lift operations {formatMoney(recap.costs.liftOps)} · Upkeep {formatMoney(recap.costs.upkeep)}</p>}
        <p>Operating result <strong>{formatMoney(recap.cashDelta, { signed: true })}</strong></p>
        {recap.loanReceived > 0 && <p>Loan received {formatMoney(recap.loanReceived)}</p>}
        {recap.loanRepaid > 0 && <p>Loan repayment {formatMoney(recap.loanRepaid)}</p>}
        {recap.summitLinkReply === "accepted" && <p>Pass agreement payment $6,000</p>}
      </> : <p>The first operating ledger will be available at closing.</p>}
    </Section>
    <Section title="Fare and turnout">
      <p>Reputation {s.reputation} · Expected hill value {formatMoney(expectedHillValue(s.reputation, s.buildings, s.talentsOwned))}</p>
      {recap && <p>Last reported fare {formatMoney(recap.facts.farePrice)} · Measured value {formatMoney(recap.facts.hillValue)} · {recap.arrivals} arrivals</p>}
      {upcoming && <><h4 className="font-bold">Estimated arrivals tomorrow</h4>{(["cheap","balanced","expensive"] as const).map(fare =>
        <p key={fare}>{FARE_LABELS[fare]} · {formatMoney(FARE_PRICES[fare])} · {fare === "expensive" && s.summitLinkDecision === "accepted" ? "Unavailable under the pass agreement" : `about ${Math.round(expectedArrivals(s,fare))} guests`}</p>)}</>}
    </Section>
  </>;
}

export function Reports({ s }: { s: GameState }) {
  return <>
    <Section title="Recap archive">{s.dayHistory.length === 0 && <p>Settled days appear here as this winter progresses.</p>}
      {s.dayHistory.slice().reverse().map(d => <details key={d.day}><summary className="min-h-11 cursor-pointer py-2 font-bold">Day {d.day} · {d.weather} · {formatMoney(d.recap.cashDelta, {signed:true})}</summary>
        <p>{d.recap.problem}</p><p>{d.recap.arrivals} guests · Satisfaction {Math.round(d.recap.satisfaction)}/100 · Average wait {d.recap.facts.avgWaitMin.toFixed(1)} minutes</p>
        {d.recap.facts.schoolBus && <p>School tickets {formatMoney(d.recap.facts.schoolBus.ticketRevenue)} · {d.recap.facts.schoolBus.taught} of {d.recap.facts.schoolBus.invited} pupils taught</p>}
        <p>Service {formatMoney(d.snowCost)} · Construction installments {formatMoney(d.constructionDue)} · Settled cash {formatMoney(d.closingCash)}</p>
      </details>)}</Section>
    <Section title="Story log"><StoryEntries /></Section>
    <Section title="Winter reviews">{s.career.length === 0 ? <p>Your review appears after the winter settles.</p> : s.career.map((w,i) =>
      <details key={i}><summary className="min-h-11 cursor-pointer py-2 font-bold">Winter {i+1} · {w.bankrupt ? "Bank called" : w.netWorth >= 0 ? "Solvency goal met" : "Solvency goal missed"}</summary>
        <p>{w.day} days · Cash {formatMoney(w.cash)} · Loan {formatMoney(w.loan)} · Construction {formatMoney(w.construction)} · Net worth {formatMoney(w.netWorth)}</p>
        {w.score && <p>Winter score {w.score.total}/100</p>}<p>{schoolMemory(w.school)}</p>
        {w.summitLink && <p>Vivian’s offer was {w.summitLink}.</p>}
      </details>)}</Section>
  </>;
}

export function Crew({ s }: { s: GameState }) {
  const founder = founderById(s.founderId);
  const next = CREW_TALENTS.find(t => !s.talentsOwned.includes(t.id));
  const nextTier = s.lodgeTier === 1 ? 2 : s.lodgeTier === 2 ? 3 : null;
  const tier = LODGE_TIERS[s.lodgeTier];
  return <>
    <Section title="Lodge"><p>Tier {s.lodgeTier} · {tier.label} · {tier.stalls} parking spaces</p>
      {nextTier && <p>Tier {nextTier} adds {LODGE_TIERS[nextTier].stalls - tier.stalls} parking spaces and {LODGE_TIERS[nextTier].pads - tier.pads} attachment pads. {lodgeTierUnlocks(nextTier).join(", ")}</p>}
      {s.lodgeUpgrade && <p>Upgrade underway · {s.lodgeUpgrade.nightsRemaining} nights remaining.</p>}</Section>
    <Section title="Goal checklist">
      {goalChips(goalInputs(s)).map(goal => <p key={goal.id}><strong>{goal.label} · {goal.status}.</strong> {goal.explainer}</p>)}
      <p>{operatingGoalText(MOUNTAIN_CALENDARS[s.mountainId], s.dayHistory)}</p>
      <p>{s.outcome !== "playing" && s.lastWinter?.score ? `Winter score ${s.lastWinter.score.total}/100` : "The final winter score is calculated at review."}</p></Section>
    {founder && <Section title={founder.name}><p>{founder.bonus}</p><p>{founder.constraint}</p></Section>}
    <Section title="Crew talents">{next && <p><strong>Next · {next.name}</strong> ({next.crew}). {next.effect}</p>}
      {CREW_TALENTS.filter(t => s.talentsOwned.includes(t.id)).map(t => <p key={t.id}><strong>{t.name}</strong> ({t.crew}). {t.effect}</p>)}</Section>
  </>;
}
