"use client";

import { founderById } from "@/game/content";
import { seasonCalendar } from "@/game/calendar";
import { buildCallOffers, ensureCareerHills, hillById } from "@/game/mountains/roster";
import { SUMMIT_LINK_PAYMENT } from "@/game/summitLink";
import { liquidNetWorth, payoffAmount } from "@/game/economy";
import { FARE_LABELS, SNOW_LABELS } from "@/game/types";
import { StoryEntries } from "@/ui/StoryLog";
import { punchCardOutcomeLine, schoolMemory } from "@/game/winterMemory";
import { formatMoney } from "@/game/format";
import { useGameStore } from "@/game/store";
import { Sheet } from "@/ui/kit/Sheet";
import { PinIcon } from "@/ui/kit/icons";
import { PrimaryButton, Sign, StatTile } from "@/ui/kit/parts";

export function WinterReviewSheet({ onOffice }: { onOffice?: () => void }) {
  const phase = useGameStore((s) => s.phase);
  const outcome = useGameStore((s) => s.outcome);
  const bankrupt = outcome === "bankrupt";
  const founder = useGameStore(s => founderById(s.founderId)?.name);
  const day = useGameStore(s => s.dayIndex);
  const seasonLength = useGameStore(s => s.seasonLength);
  const cash = useGameStore((s) => s.cash);
  const netWorth = useGameStore(liquidNetWorth);
  const solvent = !bankrupt && netWorth >= 0;
  const days = useGameStore(s => s.seasonDays);
  const score = useGameStore(s => s.lastWinter?.score);
  const school = useGameStore((s) => s.schoolContract);
  const summitLink = useGameStore((s) => s.summitLinkDecision);
  const mountainId = useGameStore((s) => s.mountainId);
  const dayHistory = useGameStore((s) => s.dayHistory);
  const lastDay = useGameStore((s) => s.lastDay);
  const schoolContract = useGameStore((s) => s.schoolContract);
  const lastWinter = useGameStore((s) => s.lastWinter);
  const careerHills = useGameStore((s) => s.careerHills);
  const vivianVisit = useGameStore((s) => s.vivianVisit);
  const clubBooking = useGameStore((s) => s.clubBooking);
  const groomerDown = useGameStore((s) => s.groomerDown);
  const startNextHill = useGameStore((s) => s.startNextHill);
  const summitReceipt = days.findLast((d) => d.summitLink?.reply === "accepted")?.summitLink?.receipt ?? SUMMIT_LINK_PAYMENT;
  const reputation = useGameStore((s) => s.reputation);
  const lodgeTier = useGameStore((s) => s.lodgeTier);
  const loan = useGameStore((s) => s.loan ? payoffAmount(s.loan) : 0);
  const construction = useGameStore((s) => s.payables.reduce((sum, item) => sum + item.amount, 0));
  const talentsOwned = useGameStore((s) => s.talentsOwned);
  const finishWinterReview = useGameStore((s) => s.finishWinterReview);
  const startNewSeason = useGameStore((s) => s.startNewSeason);
  const forestEpilogue = useGameStore((s) => s.forestEpilogue);
  const resumeSurvivingHill = useGameStore((s) => s.resumeSurvivingHill);

  if (phase !== "winter_review" && phase !== "mountain2") return null;

  if (phase === "mountain2") {
    const currentHill = hillById(mountainId);
    const offers = buildCallOffers({
      mountainId,
      calendar: seasonCalendar({ mountainId, seasonLength }),
      seasonDays: days,
      dayHistory,
      lastDay,
      schoolContract,
      lastWinter,
      careerHills,
    });
    return (
      <Sheet
        modal
        z="z-50"
        title="The next call"
        subtitle="Whiterock holds options on neighboring ridges until April"
        footer={
          <PrimaryButton onClick={startNewSeason}>
            Stay another winter at {currentHill.name}
          </PrimaryButton>
        }
      >
        <div className="space-y-3">
          {offers.map((offer) => (
            <article key={offer.mountainId} className="panel space-y-2 px-4 py-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="display text-[1.25rem] leading-tight">{offer.hillName}</h3>
                  <p className="text-sm font-bold text-ink-soft">
                    {offer.townLabel} ({offer.caller}, {offer.callerRole})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold">{formatMoney(offer.startingCash)} seed cash</p>
                  {offer.bonusActive && (
                    <span className="chip inline-block px-2 py-0.5 text-xs font-extrabold">
                      Town match +{offer.bonusPct}%
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[0.95rem] font-bold leading-snug">{offer.pitch}</p>
              <p className="text-sm font-bold text-ink-soft">{offer.whiterockWarning}</p>
              <button
                type="button"
                onClick={() => startNextHill(offer.mountainId)}
                className="key key-solid press flex min-h-11 w-full items-center justify-center px-3 text-[0.95rem] font-extrabold [--key-fill:var(--sign-yellow)] [--lift:4px]"
              >
                Take the wheel at {offer.hillName}
              </button>
            </article>
          ))}
        </div>
      </Sheet>
    );
  }

  const currentHillName = hillById(mountainId).name;
  const careerList = ensureCareerHills(careerHills, mountainId);
  const lostRecord = careerList.find((h) => h.mountainId === mountainId);
  const survivingHills = careerList.filter((h) => h.status === "caretaker" && hillById(h.mountainId).playable);
  const hasSurvivingCareer = !solvent && survivingHills.length > 0;
  return (
    <Sheet
      modal
      wide
      z="z-50"
      title={forestEpilogue ? "The Forest" : "Winter review"}
      subtitle={`${founder ?? currentHillName}, ${day} of ${seasonLength} days done`}
      footer={
        hasSurvivingCareer ? (
          <div className="flex flex-col gap-2">
            {survivingHills.map((surviving) => {
              const targetHill = hillById(surviving.mountainId);
              return (
                <PrimaryButton key={surviving.mountainId} onClick={() => resumeSurvivingHill(surviving.mountainId)}>
                  Return to {targetHill.name} ({surviving.caretakerAlly ?? targetHill.localContact})
                </PrimaryButton>
              );
            })}
          </div>
        ) : (
          <PrimaryButton onClick={solvent ? finishWinterReview : startNewSeason}>
            {forestEpilogue
              ? `Reopen ${currentHillName}`
              : solvent
                ? "Continue to next call"
                : `Replay ${currentHillName} winter`}
          </PrimaryButton>
        )
      }
    >
      <div className="md:grid md:grid-cols-2 md:gap-4">
        <div>
          <Sign innerClassName="px-4 pb-4 pt-3" tab={currentHillName}>
            <p className="display text-[1.35rem] leading-tight text-white">
              {forestEpilogue
                ? "The chairs stopped across every ridge."
                : bankrupt
                  ? "The bank called. The winter's over."
                  : solvent
                    ? `${currentHillName} kept the lights on.`
                    : "The tow ran to closing day. The winter bills outlasted it."}
            </p>
            <p className="mt-1.5 text-sm font-extrabold text-sign-yellow">
              {forestEpilogue
                ? "Hardwoods and fern reclaim the trails until another operator opens the gate."
                : punchCardOutcomeLine(outcome, solvent)}
            </p>
            {bankrupt && <p className="mt-1 text-sm font-bold text-sign-green-ink">Cash stayed below zero for three mornings in a row.</p>}
            {hasSurvivingCareer && (
              <p className="mt-1 text-sm font-bold text-sign-green-ink">
                {lostRecord?.status === "whiterock"
                  ? `${currentHillName} passed to Whiterock on the Atlas. Your remaining hills are still turning.`
                  : `${currentHillName} closed back to forest on the Atlas. Your remaining hills are still turning.`}
              </p>
            )}
            <div className="sign-rule my-3" aria-hidden="true" />
            <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-2">
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
          <section className="chip mt-4 px-3.5 py-3 font-bold" aria-label="Solvency">
            <h3 className="font-extrabold">Solvency</h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex justify-between gap-3">
                <span>Closing cash</span>
                <span className="tabular-nums">{formatMoney(cash)}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Loan balance</span>
                <span className="tabular-nums">{formatMoney(loan)}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Unpaid construction</span>
                <span className="tabular-nums">{formatMoney(construction)}</span>
              </li>
              <li className="flex justify-between gap-3 border-t border-snow-2 pt-1.5 font-extrabold">
                <span>Net worth</span>
                <span className={`tabular-nums ${netWorth >= 0 ? "text-sign-green" : "text-barn-deep"}`}>
                  {formatMoney(netWorth)}
                </span>
              </li>
            </ul>
            <p className="mt-2 text-sm">
              Winter solvency goal {solvent ? "met" : "missed"}.
            </p>
          </section>
        </div>
        <div>
          <section className="panel mt-4 space-y-2 px-4 py-3 md:mt-0" aria-label="What the town remembers">
            <h3 className="font-extrabold">What the town remembers</h3>
            <p>{schoolMemory(school)}</p>
            {days.map(day => day.schoolBus && <p key={day.day}>Day {day.day}: {day.schoolBus.arrived} of {day.schoolBus.invited} pupils arrived. School tickets brought in {formatMoney(day.schoolBus.ticketRevenue)}. {day.schoolBus.invited - day.schoolBus.taught} booked pupils missed a lesson.</p>)}
            {summitLink && (
              <p>
                {summitLink === "accepted"
                  ? `Whiterock wired ${formatMoney(summitReceipt)} to Dutch Hill. Tickets stayed capped at Balanced through closing day.`
                  : "You turned down Whiterock. Dutch Hill set its own ticket prices through closing day."}
              </p>
            )}
            {vivianVisit && (
              <p>
                Whiterock scouted Day {vivianVisit.day}: {Math.round(vivianVisit.avgWaitMin)}-min lift lines and{" "}
                {Math.round(vivianVisit.avgSnow * 100)}% snow cover.
              </p>
            )}
            {clubBooking?.decision === "accepted" && clubBooking.skiersArrived !== null && (
              <p>
                Bennington Ski Club brought {clubBooking.skiersArrived} skiers after your zero-wait Saturday.
              </p>
            )}
            {groomerDown && (
              <p>
                {groomerDown.decision === "paid"
                  ? "Repaired the Tucker's blown hydraulic line overnight ($250)."
                  : "Let the Tucker sit un-repaired one night after the hydraulic line blew."}
              </p>
            )}
          </section>
          <section className="panel mt-4 space-y-2 px-4 py-3">
            <h3 className="font-extrabold">Winter score{score && `: ${score.total}/100`}</h3>
            {score ? <p>Guest satisfaction averaged {score.satisfaction.toFixed(1)} across {score.measuredDays} days with guests. {score.averageReputation === undefined
                ? `Final reputation was ${reputation}.`
                : `Closing reputation averaged ${score.averageReputation.toFixed(1)} over those same days.`} Each counts for half the score.</p>
              : <p>No winter score yet. It needs at least one day with guests, plus a satisfaction and reputation reading from every day they showed up.</p>}
            <details>
              <summary className="min-h-11 cursor-pointer font-bold">Operating decisions</summary>
              {!days.some((d, i) => i > 0 && (d.fare !== days[i-1].fare || d.snow !== days[i-1].snow)) && <p>Fare and service stayed put all winter.</p>}
              {days.map((d, i) => {
                const prev = days[i - 1];
                if (!prev || prev.day + 1 !== d.day || (prev.fare === d.fare && prev.snow === d.snow)) return null;
                return <p className="mb-2" key={d.day}><strong>Day {d.day}.</strong>{" "}
                  {prev.fare !== d.fare && `Fare moved from ${FARE_LABELS[prev.fare]} to ${FARE_LABELS[d.fare]}. `}
                  {prev.snow !== d.snow && `Service moved from ${SNOW_LABELS[prev.snow]} to ${SNOW_LABELS[d.snow]}. `}
                  Skiers went from {prev.arrivals} to {d.arrivals}.
                  {prev.arrivals > 0 && d.arrivals > 0 && ` Happiness went from ${Math.round(prev.satisfaction)} to ${Math.round(d.satisfaction)}.`}
                </p>;
              })}
            </details>
            <button type="button" className="key my-2 min-h-11 px-4 font-bold" onClick={onOffice}>Office</button>
            <details>
              <summary className="min-h-11 cursor-pointer font-bold">Story log</summary>
              <StoryEntries compact />
            </details>
          </section>
          {solvent && <div className="chip mt-4 flex items-center gap-3 px-3.5 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-snow-2">
              <PinIcon size={20} />
            </span>
            <p className="text-[1rem] font-bold">
              You earned a career pin for{" "}
              <strong className="font-extrabold">Mount Tom, MA</strong>.
            </p>
          </div>}
        </div>
      </div>
    </Sheet>
  );
}