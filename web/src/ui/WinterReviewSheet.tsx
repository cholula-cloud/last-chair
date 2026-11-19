"use client";

import { SUMMIT_LINK_PAYMENT } from "@/game/summitLink";
import { liquidNetWorth, payoffAmount } from "@/game/economy";
import { FARE_LABELS, SNOW_LABELS } from "@/game/types";
import { StoryEntries } from "@/ui/StoryLog";
import { schoolMemory } from "@/game/winterMemory";
import { formatMoney } from "@/game/format";
import { useGameStore } from "@/game/store";
import { Sheet } from "@/ui/kit/Sheet";
import { PinIcon } from "@/ui/kit/icons";
import { PrimaryButton, Sign, StatTile } from "@/ui/kit/parts";

export function WinterReviewSheet() {
  const phase = useGameStore((s) => s.phase);
  const bankrupt = useGameStore((s) => s.outcome === "bankrupt");
  const cash = useGameStore((s) => s.cash);
  const netWorth = useGameStore(liquidNetWorth);
  const solvent = !bankrupt && netWorth >= 0;
  const days = useGameStore(s => s.seasonDays);
  const score = useGameStore(s => s.lastWinter?.score);
  const school = useGameStore((s) => s.schoolContract);
  const summitLink = useGameStore((s) => s.summitLinkDecision);
  const reputation = useGameStore((s) => s.reputation);
  const lodgeTier = useGameStore((s) => s.lodgeTier);
  const loan = useGameStore((s) => s.loan ? payoffAmount(s.loan) : 0);
  const construction = useGameStore((s) => s.payables.reduce((sum, item) => sum + item.amount, 0));
  const talentsOwned = useGameStore((s) => s.talentsOwned);
  const finishWinterReview = useGameStore((s) => s.finishWinterReview);
  const startNewSeason = useGameStore((s) => s.startNewSeason);

  if (phase !== "winter_review" && phase !== "mountain2") return null;

  if (phase === "mountain2") {
    return (
      <Sheet
        modal
        z="z-50"
        title="Tenney Mountain, NH"
        subtitle="The next lost hill on the map"
        footer={
          <PrimaryButton onClick={startNewSeason}>
            Replay Dutch Hill winter
          </PrimaryButton>
        }
      >
        <div className="panel px-4 py-3.5">
          <p className="text-[1rem] font-bold leading-snug">
            Tenney isn&apos;t playable yet. Caretaker income and the career map
            come in a later build. Dutch Hill stays saved on this device.
          </p>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      modal
      z="z-50"
      title="Winter review"
      subtitle="Dutch Hill, winter one"
      footer={
        <PrimaryButton onClick={solvent ? finishWinterReview : startNewSeason}>
          {solvent ? "Continue to mountain 2" : "Replay Dutch Hill winter"}
        </PrimaryButton>
      }
    >
      <Sign innerClassName="px-4 pb-4 pt-3" tab="Dutch Hill, winter one">
        <p className="display text-[1.35rem] leading-tight text-white">
          {bankrupt ? "The bank called" : solvent ? "Dutch Hill kept the lights on." : "The tow ran to closing day. The winter bills outlasted it."}
        </p>
        {bankrupt && <p className="mt-1 text-sm font-bold text-sign-green-ink">Cash stayed below zero for three mornings in a row.</p>}
        <div className="sign-rule my-3" aria-hidden="true" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
          <StatTile onSign label="Cash" value={formatMoney(cash)} />
          <StatTile onSign label="Reputation" value={reputation} />
          <StatTile
            onSign
            label="Lodge tier"
            value={lodgeTier}
          />
          <StatTile onSign label="Crew talents" value={talentsOwned.length} />
        </div>
      </Sign>
      <p className="chip mt-4 px-3.5 py-3 font-bold">
          Cash {formatMoney(cash)} less loan {formatMoney(loan)} and unpaid construction {formatMoney(construction)} leaves <strong>{formatMoney(netWorth)}</strong>.
        <br />Winter solvency goal {solvent ? "met" : "unmet"}.
      </p>
      <section className="panel mt-4 space-y-2 px-4 py-3" aria-label="What the town remembers">
        <h3 className="font-extrabold">What the town remembers</h3>
        <p>{schoolMemory(school)}</p>
        {days.map(day => day.schoolBus && <p key={day.day}>Day {day.day}: {day.schoolBus.arrived} of {day.schoolBus.invited} pupils arrived. School tickets brought in {formatMoney(day.schoolBus.ticketRevenue)}. {day.schoolBus.invited - day.schoolBus.taught} booked pupils missed a lesson.</p>)}
        {summitLink && <p>{summitLink === "accepted" ? `Vivian put ${formatMoney(SUMMIT_LINK_PAYMENT)} into Dutch Hill. Tickets stayed at Balanced or below for the rest of the winter.`
          : "Vivian left without a deal. Dutch Hill set its own prices through closing day."}</p>}
      </section>
      <section className="panel mt-4 space-y-2 px-4 py-3">
        <h3 className="font-extrabold">Season score{score && ` · ${score.total}/100`}</h3>
        {score ? <p>Guest satisfaction averaged {score.satisfaction.toFixed(1)} across {score.measuredDays} days with guests. Closing reputation was {reputation}. Each counts for half the score.</p>
          : <p>A season score needs a complete daily record and at least one day with guests.</p>}
        <details>
          <summary className="min-h-11 cursor-pointer font-bold">Operating decisions</summary>
          {!days.some((d, i) => i > 0 && (d.fare !== days[i-1].fare || d.snow !== days[i-1].snow)) && <p>No fare or service changes appear in the daily record.</p>}
          {days.map((d, i) => {
            const prev = days[i - 1];
            if (!prev || prev.day + 1 !== d.day || (prev.fare === d.fare && prev.snow === d.snow)) return null;
            return <p className="mb-2" key={d.day}><strong>Day {d.day}.</strong>{" "}
              {prev.fare !== d.fare && `Fare changed from ${FARE_LABELS[prev.fare]} to ${FARE_LABELS[d.fare]}. `}
              {prev.snow !== d.snow && `Service changed from ${SNOW_LABELS[prev.snow]} to ${SNOW_LABELS[d.snow]}. `}
              Arrivals went from {prev.arrivals} to {d.arrivals}.
              {prev.arrivals > 0 && d.arrivals > 0 && ` Satisfaction went from ${Math.round(prev.satisfaction)} to ${Math.round(d.satisfaction)}.`}
            </p>;
          })}
        </details>
        <details>
          <summary className="min-h-11 cursor-pointer font-bold">Story log</summary>
          <StoryEntries />
        </details>
      </section>
      {solvent && <div className="chip mt-4 flex items-center gap-3 px-3.5 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-snow-2">
          <PinIcon size={20} />
        </span>
        <p className="text-[1rem] font-bold">
          Career pin unlocked:{" "}
          <strong className="font-extrabold">Tenney Mountain, NH</strong>
        </p>
      </div>}
    </Sheet>
  );
}
