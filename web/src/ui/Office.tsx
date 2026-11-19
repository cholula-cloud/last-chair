"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ASSET_CATALOG, LODGE_TIERS, lodgeTierUnlocks, type AssetId } from "@/game/base";
import { MOUNTAIN_CALENDARS } from "@/game/calendar";
import { operatingGoalText } from "@/game/winterArc";
import { CREW_TALENTS, founderById, STORY_BEATS } from "@/game/content";
import { dailyCosts, liquidNetWorth, LOW_CASH, morningCash, payoffAmount } from "@/game/economy";
import { formatMoney } from "@/game/format";
import { expectedArrivals, openingStep } from "@/game/rules";
import { expectedHillValue } from "@/game/satisfaction";
import type { GameState } from "@/game/state";
import { useGameStore } from "@/game/store";
import { surpriseRadio } from "@/game/surprises";
import { FARE_LABELS, FARE_PRICES } from "@/game/types";
import { outlookFor } from "@/game/weather";
import { schoolMemory } from "@/game/winterMemory";
import { ReplayNotes } from "./ReplayNotes";
import { StoryEntries } from "./StoryLog";
import { useSettings } from "./settingsStore";

export type OfficeTab = "Desk" | "Money" | "Reports" | "Crew";
const tabs: OfficeTab[] = ["Desk", "Money", "Reports", "Crew"];
const keyClass = "key min-h-11 px-4 py-2 text-sm font-bold";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="panel space-y-2 p-4"><h3 className="display text-xl">{title}</h3>{children}</section>;
}

function Desk({ s }: { s: GameState }) {
  const radio = useSettings(settings => settings.radioEnabled);
  const forecast = outlookFor(s, 1);
  const opening = openingStep(s);
  const costs = dailyCosts(s);
  const attention = [
    opening && (opening === "lift" ? "Place your first lift." : "Paint a trail from your lift to the base."),
    s.cash < LOW_CASH && "Cash is running low. Check your installments and loan balance in Money.",
    costs.draws > 0 && `${formatMoney(costs.draws)} in construction payments comes due at closing.`,
    s.schoolContract?.decision === "accepted" && s.schoolContract.day === s.dayIndex && "The Readsboro bus is scheduled for today.",
  ].filter(Boolean);
  const lastBeat = s.pendingBeat ? { day: s.dayIndex, id: s.pendingBeat } : s.beatLog.at(-1);
  const lastMoment = s.surpriseLog.at(-1);
  const lastLodge = s.seasonDays.findLast(d => d.lodgeOpening);
  const broadcasts = [
    ...(lastBeat ? [{ day: lastBeat.day, text: STORY_BEATS.find(b => b.id === lastBeat.id)?.radio }] : []),
    ...(lastMoment ? [{ day: lastMoment.dayIndex, text: surpriseRadio(lastMoment).radio }] : []),
    ...(lastLodge ? [{ day: lastLodge.day, text: `The crew finished the lodge addition. Dutch Hill reached Tier ${lastLodge.lodgeOpening}.` }] : []),
  ].sort((a, b) => (b.day ?? 0) - (a.day ?? 0));
  const latest = broadcasts[0];
  return <>
    <Section title={`Day ${s.dayIndex} at Dutch Hill`}><p>{s.morningHeadline}</p></Section>
    <Section title="Winter goal"><p>Finish day {s.seasonLength} with enough cash to settle the loan and unpaid construction.</p>
      <p>{formatMoney(liquidNetWorth(s))} after outstanding bills.</p><p>{operatingGoalText(MOUNTAIN_CALENDARS[s.mountainId], s.dayHistory)}</p></Section>
    <Section title="Tomorrow’s forecast">{forecast ? <p>{Object.entries(forecast).map(([kind, p]) => `${kind} ${Math.round(100*p)}%`).join(" · ")}</p> : <p>This is closing day.</p>}</Section>
    <Section title="Needs attention">{attention.length ? <ul className="list-disc space-y-1 pl-5">{attention.map(item => <li key={String(item)}>{item}</li>)}</ul> : <p>No outstanding notices.</p>}</Section>
    <Section title="Route 100 Radio">{!radio ? <p>Radio is off.</p> : latest ? <p>{latest.day && <strong>Day {latest.day}. </strong>}{latest.text}</p> : <p>The first broadcast comes after the hill opens.</p>}</Section>
  </>;
}

function Money({ s }: { s: GameState }) {
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

function Reports({ s }: { s: GameState }) {
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

function Crew({ s }: { s: GameState }) {
  const founder = founderById(s.founderId);
  const next = CREW_TALENTS.find(t => !s.talentsOwned.includes(t.id));
  const nextTier = s.lodgeTier === 1 ? 2 : s.lodgeTier === 2 ? 3 : null;
  const tier = LODGE_TIERS[s.lodgeTier];
  return <>
    <Section title="Lodge"><p>Tier {s.lodgeTier} · {tier.label} · {tier.stalls} parking spaces</p>
      {nextTier && <p>Tier {nextTier} adds {LODGE_TIERS[nextTier].stalls - tier.stalls} parking spaces and {LODGE_TIERS[nextTier].pads - tier.pads} attachment pads. {lodgeTierUnlocks(nextTier).join(", ")}</p>}
      {s.lodgeUpgrade && <p>Upgrade underway · {s.lodgeUpgrade.nightsRemaining} nights remaining.</p>}</Section>
    <Section title="Goal checklist"><p>Finish day {s.seasonLength} solvent · {formatMoney(liquidNetWorth(s))} after bills today.</p>
      <p>{operatingGoalText(MOUNTAIN_CALENDARS[s.mountainId], s.dayHistory)}</p>
      {s.schoolContract && <p>Readsboro goal · {s.schoolContract.decision === "accepted" && s.schoolContract.pupilsTaught === null && s.outcome === "playing" ? `Booked for day ${s.schoolContract.day}.` : schoolMemory(s.schoolContract)}</p>}
      <p>{s.outcome !== "playing" && s.lastWinter?.score ? `Winter score ${s.lastWinter.score.total}/100` : "The final winter score is calculated at review."}</p></Section>
    {founder && <Section title={founder.name}><p>{founder.bonus}</p><p>{founder.constraint}</p></Section>}
    <Section title="Crew talents">{next && <p><strong>Next · {next.name}</strong> ({next.crew}). {next.effect}</p>}
      {CREW_TALENTS.filter(t => s.talentsOwned.includes(t.id)).map(t => <p key={t.id}><strong>{t.name}</strong> ({t.crew}). {t.effect}</p>)}</Section>
  </>;
}

export function Office({ initial, onClose, onLeave }: { initial: OfficeTab; onClose: () => void; onLeave: (view: "load" | "settings") => void }) {
  const [tab, setTab] = useState(initial);
  const dialog = useRef<HTMLDialogElement>(null);
  const active = useRef<HTMLButtonElement>(null);
  const s = useGameStore();
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => { active.current?.scrollIntoView({ block: "nearest", inline: "center" }); }, [tab]);
  return <dialog ref={dialog} aria-labelledby="office-title" onCancel={event => { event.preventDefault(); onClose(); }}
    className="office-dialog fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-snow-2 p-0 text-ink">
    <div className="mx-auto flex h-full max-w-3xl flex-col pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <header className="flex items-center justify-between gap-3 px-4 pt-3"><h2 id="office-title" className="display text-3xl">Dutch Hill Office</h2>
        <button type="button" autoFocus className={keyClass} onClick={onClose}>Close Office</button></header>
      <nav className="flex shrink-0 gap-2 overflow-x-auto p-4" aria-label="Office sections">{tabs.map(t =>
        <button ref={tab === t ? active : undefined} key={t} type="button" data-office-tab={t} aria-pressed={tab === t} onClick={() => setTab(t)}
          className={keyClass + (tab === t ? " key-solid [--key-fill:var(--sign-green)] [--key-ink:#fff]" : "")}>{t}</button>)}</nav>
      <div key={tab} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {tab === "Desk" && <><Desk s={s}/><ReplayNotes /><div className="flex gap-2"><button className={keyClass} onClick={() => onLeave("settings")}>Settings</button><button className={keyClass} onClick={() => onLeave("load")}>Save slots</button></div></>}
        {tab === "Money" && <Money s={s}/>}
        {tab === "Reports" && <Reports s={s}/>}
        {tab === "Crew" && <Crew s={s}/>}
      </div>
    </div>
  </dialog>;
}
