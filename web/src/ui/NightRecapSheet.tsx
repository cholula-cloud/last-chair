"use client";

import { TALENT } from "@/game/talents";

import { useState } from "react";
import { BANKRUPTCY_MORNINGS, dailyCosts, morningCash } from "@/game/economy";
import { formatMoney } from "@/game/format";
import { expectedArrivals, previewOvernight, summitLinkOfferOpen } from "@/game/rules";
import { expectedHillValue } from "@/game/satisfaction";
import { NO_SKIERS_PROBLEM } from "@/game/satisfaction";
import { demandContext, topGuestDemand } from "@/game/guestsWant";
import { dayLabel, seasonCalendar } from "@/game/calendar";
import { talentDescription } from "@/game/content";
import { moodTone, satisfactionMoodWord } from "@/game/moodLabels";
import { revenueBreakdownFromRecap } from "@/game/officeSeries";
import { nextTalentName, type NightRecap } from "@/game/sim";
import { pickableTalents, CREW_RUSH_COST } from "@/game/talentProgress";
import { storyBeatCopy, useGameStore } from "@/game/store";
import type { GameState, LastDay } from "@/game/state";
import { SUMMIT_LINK_PAYMENT } from "@/game/summitLink";
import { useSettings } from "@/ui/settingsStore";
import { surpriseRadio } from "@/game/surprises";
import { WHY_BASE, GUEST_MEASURE_LABELS, delta, formatGuestObservation, formatPoints, observeGuests, whyLines } from "@/game/why";
import {
  FARE_LABELS,
  FARE_PRICES,
  SNOW_LABELS,
  type FarePreset,
  type SnowPreset,
  type WeatherKind,
} from "@/game/types";
import { outlookFor } from "@/game/weather";
import { PROBLEM_GUIDE_ID, problemGuide } from "@/game/coach";
import { LAYERS, type MapLayer } from "@/game/mapLayers";
import { founderById } from "@/game/content";
import type { OfficeTabId } from "./officeStore";
import { LiveMessage } from "./kit/LiveMessage";
import { CocoaIcon, PeaksGlyph, SnowfallIcon, SunIcon, ThawIcon, WindIcon } from "@/ui/kit/icons";
import { Sheet, SheetTitle } from "@/ui/kit/Sheet";
import {
  ChoiceTiles,
  DeltaChip,
  DisclosureButton,
  PrimaryButton,
  SectionHeading,
  Sign,
  StatTile,
  tidy,
  type ChoiceOption,
  type Tone,
} from "@/ui/kit/parts";
import { RadioCard } from "@/ui/kit/RadioCard";
import { LoanCard } from "@/ui/LoanCard";
import { SummitLinkCard } from "@/ui/SummitLinkCard";
import { SchoolContractCard } from "@/ui/SchoolContractCard";
import { RevenueMixDonut, VenueRevenueList } from "@/ui/revenueBreakdownUi";

const WEEKDAY_FULL: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

const FARES: FarePreset[] = ["cheap", "balanced", "expensive"];
const SNOWS: SnowPreset[] = ["minimal", "mid", "high"];

const FORECAST = {
  clear: { name: "Clear", Icon: SunIcon },
  snow: { name: "Snow", Icon: SnowfallIcon },
  storm: { name: "Storm", Icon: WindIcon },
  thaw: { name: "Thaw", Icon: ThawIcon },
};

export function Forecast({ state, ahead }: { state: Parameters<typeof outlookFor>[0]; ahead: 1 | 2 }) {
  const outlook = outlookFor(state, ahead);
  if (!outlook) return null;
  const odds = (Object.keys(FORECAST) as WeatherKind[]).sort((a, b) => outlook[b] - outlook[a]);
  const title = ahead === 1 ? "Tomorrow’s forecast" : "Two-day forecast";
  return (
    <div className="mt-1.5" aria-label={title} role="group">
      <p className="text-sm font-extrabold">{title}</p>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold">
        {odds.map((kind) => {
          const { name, Icon } = FORECAST[kind];
          return <li key={kind} className="inline-flex items-center gap-1"><Icon size={14} />
            {name} {Math.round(outlook[kind] * 100)}%
          </li>;
        })}
      </ul>
    </div>
  );
}

function moodWord(score: number): { word: string; tone: Tone } {
  return { word: satisfactionMoodWord(score), tone: moodTone(score) as Tone };
}

/** Largest effect on the bars; anything bigger fills the half-track. */
const BAR_FULL_PTS = 20;

function WhyList({ recap, patrol }: { recap: NightRecap; patrol: boolean }) {
  const [open, setOpen] = useState(false);
  const lines = whyLines(recap);
  const today = observeGuests(recap);
  return (
    <div className="mt-3">
      <DisclosureButton open={open} controls="why-list" onToggle={() => setOpen((o) => !o)}>
        Why {Math.round(recap.satisfaction)}% happy?
      </DisclosureButton>
      {open && (
        <div id="why-list" className="panel mt-2.5 px-3.5 py-1.5">
          {today && (
            <p className="border-b-2 border-snow-2 py-2.5 text-sm font-extrabold">
              {GUEST_MEASURE_LABELS[today.measure]} today:{" "}
              <span className="tabular-nums">{formatGuestObservation(today)}</span>
            </p>
          )}
          <ul>
            {lines.map((line) => {
              const width = Math.min(1, Math.abs(line.points) / BAR_FULL_PTS) * 50;
              const rounded = Math.round(line.points);
              return (
                <li key={line.key} className="border-b-2 border-snow-2 py-2.5 last:border-b-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[1rem] font-extrabold">{line.label}</span>
                    <span
                      className={`text-[1.05rem] font-extrabold tabular-nums ${
                        rounded > 0 ? "text-sign-green" : rounded < 0 ? "text-barn-deep" : "text-ink-soft"
                      }`}
                    >
                      {formatPoints(line.points)}
                    </span>
                  </div>
                  <p className="text-[0.85rem] font-bold leading-snug text-ink-soft">{line.detail}{patrol && line.key === "snow" && line.points < 0 ? " Dana's patrol aid softened the rough snow." : ""}</p>
                  <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-snow-2" aria-hidden="true">
                    <span
                      className={`absolute inset-y-0 ${
                        line.points < 0 ? "right-1/2 bg-barn-deep" : "left-1/2 bg-sign-green"
                      }`}
                      style={{ width: `${width}%` }}
                    />
                    <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-ink" />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="pb-1 pt-1.5 text-[0.82rem] font-bold text-ink-soft">
            The average guest starts at {WHY_BASE}, adds up the above and lands around{" "}
            {Math.round(recap.satisfaction)}.
          </p>
        </div>
      )}
    </div>
  );
}

function Deltas({ recap, last, dayIndex, className }: { recap: NightRecap; last: LastDay; dayIndex: number; className?: string }) {
  const skiers = delta(recap.arrivals, last.arrivals, (d) => `${Math.round(d)}`, 0.5);
  const happy = delta(recap.satisfaction, last.satisfaction, (d) => `${Math.round(d)} pts`, 0.5);
  const cash = delta(recap.cashDelta, last.cashDelta, (d) => formatMoney(d), 0.5);
  return (
    <div
      className={`chip grid grid-cols-3 gap-x-3 gap-y-1 px-3.5 py-2 ${className ?? "mt-4"}`}
      aria-label={`Change since day ${dayIndex - 1}`}
    >
      <DeltaChip direction={skiers.direction} what="Skiers">{skiers.text}</DeltaChip>
      {recap.arrivals > 0 && last.arrivals > 0
        ? <DeltaChip direction={happy.direction} what="Happiness">{happy.text}</DeltaChip>
        : <span className="text-xs font-bold text-ink-soft">Nothing to compare yet</span>}
      <DeltaChip direction={cash.direction} what="Cash today">{cash.text}</DeltaChip>
      <p className="col-span-3 text-[0.78rem] font-bold leading-snug text-ink-soft">
        vs yesterday ({FARE_LABELS[last.fare]} {formatMoney(FARE_PRICES[last.fare])}, {SNOW_LABELS[last.snow]} snow)
      </p>
    </div>
  );
}

function TopTakeaway({
  headline,
  guestLine,
  guide,
  founderName,
  onMap,
  onOffice,
  onDismissGuide,
}: {
  headline: string;
  guestLine: string | null;
  guide: ReturnType<typeof problemGuide>;
  founderName: string | undefined;
  onMap: (layer: MapLayer) => void;
  onOffice: (tab: OfficeTabId) => void;
  onDismissGuide: () => void;
}) {
  return (
    <section className="panel mt-4 px-3.5 py-3" aria-label="Top takeaway">
      <h3 className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">Top takeaway</h3>
      <p className="mt-1.5 text-[1.05rem] font-extrabold leading-snug">{headline}</p>
      {guestLine && <p className="mt-2 text-sm font-bold leading-snug">{guestLine}</p>}
      {guide && (
        <p className="mt-2 text-sm font-bold leading-snug">
          <LiveMessage>
            <strong>{founderName}:</strong> {guide.text}
          </LiveMessage>
        </p>
      )}
      {guide && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button type="button" className="key min-h-11 px-2 text-sm font-bold" onClick={() => onMap(guide.layer)}>
            Map: {LAYERS[guide.layer]}
          </button>
          <button type="button" className="key min-h-11 px-2 text-sm font-bold" onClick={() => onOffice(guide.tab)}>
            Office: {guide.tab}
          </button>
          <button type="button" className="min-h-11 px-1 text-sm font-bold underline" onClick={onDismissGuide}>
            Dismiss advice
          </button>
        </div>
      )}
    </section>
  );
}

function NightMoney({
  night,
  recap,
  lastDay,
  dayIndex,
}: {
  night: GameState;
  recap: NightRecap;
  lastDay: LastDay | null;
  dayIndex: number;
}) {
  const [open, setOpen] = useState(false);
  const takeLoan = useGameStore((state) => state.takeLoan);
  const repayLoan = useGameStore((state) => state.repayLoan);
  const costs = dailyCosts(night);
  const projected = morningCash(night);
  const finalNight = night.dayIndex === night.seasonLength;
  const breakdown = recap.costs && recap.revenue != null ? revenueBreakdownFromRecap(recap) : null;
  const costLines = recap.costs && recap.revenue != null ? [
    { label: "Fixed operating costs", amount: -(costs.fixed - (costs.vacationStaffing ?? 0)) },
    { label: "Vacation-week staffing", amount: -(costs.vacationStaffing ?? 0) },
    { label: "Founder operating costs", amount: -costs.founder },
    { label: "Lift operations", amount: -costs.liftOps },
    { label: "Building upkeep", amount: -costs.upkeep },
  ] : [];
  const lines = [
    ...(breakdown ? [] : [{ label: "Cash from operations", amount: recap.cashDelta }]),
    { label: "Construction paid today", amount: -costs.constructionSpent },
    { label: "Snow and service tonight", amount: -costs.snowNight },
    { label: "Construction payments tonight", amount: -costs.draws },
    { label: "Loan received tonight", amount: recap.loanReceived },
    { label: "Loan repaid tonight", amount: -recap.loanRepaid },
    { label: "Summit Pass Corp payment tonight", amount: recap.summitLinkReply === "accepted" ? SUMMIT_LINK_PAYMENT : 0 },
  ];

  return (
    <section className="mt-3" aria-label="Cash today and tonight">
      <DisclosureButton open={open} controls="night-money-lines" onToggle={() => setOpen((value) => !value)}>
        Money breakdown <span className="sr-only">Cash today and tonight</span>
      </DisclosureButton>
      <div hidden={!open} id="night-money-lines" className="panel mt-2 px-3.5 py-2.5">
        {lastDay && <Deltas recap={recap} last={lastDay} dayIndex={dayIndex} className="mb-3 border-b-2 border-snow-2 pb-3" />}
        {breakdown && breakdown.total > 0 && (
          <div className="mb-3 flex flex-col items-center gap-2 border-b border-snow-2 pb-3">
            <RevenueMixDonut breakdown={breakdown} />
          </div>
        )}
        <dl className="space-y-1 text-sm font-bold">
          {breakdown && (
            <>
              <div className="flex justify-between gap-3">
                <dt>Day revenue</dt>
                <dd className="shrink-0 tabular-nums">{formatMoney(breakdown.total, { signed: true })}</dd>
              </div>
              {breakdown.tickets > 0 && (
                <div className="flex justify-between gap-3 pl-2 text-ink-soft">
                  <dt>Lift tickets</dt>
                  <dd className="shrink-0 tabular-nums">{formatMoney(breakdown.tickets, { signed: true })}</dd>
                </div>
              )}
              {breakdown.venues > 0 && (
                <div className="pl-2">
                  <div className="flex justify-between gap-3 text-ink-soft">
                    <dt>Base venues</dt>
                    <dd className="shrink-0 tabular-nums">{formatMoney(breakdown.venues, { signed: true })}</dd>
                  </div>
                  <VenueRevenueList facts={recap.facts} />
                </div>
              )}
              {breakdown.schoolBus > 0 && (
                <div className="flex justify-between gap-3 pl-2 text-ink-soft">
                  <dt>School bus</dt>
                  <dd className="shrink-0 tabular-nums">{formatMoney(breakdown.schoolBus, { signed: true })}</dd>
                </div>
              )}
            </>
          )}
          {costLines.filter(({ amount }) => amount !== 0).map(({ label, amount }) => (
            <div key={label} className="flex justify-between gap-3">
              <dt>{label}</dt>
              <dd className="shrink-0 tabular-nums">{formatMoney(amount, { signed: true })}</dd>
            </div>
          ))}
          {lines.filter(({ amount }) => amount !== 0).map(({ label, amount }) => (
            <div key={label} className="flex justify-between gap-3">
              <dt>{label}</dt>
              <dd className="shrink-0 tabular-nums">{formatMoney(amount, { signed: true })}</dd>
            </div>
          ))}
          {costs.interest > 0 && (
            <div className="flex justify-between gap-3 border-t border-snow-2 pt-1.5">
              <dt>Interest added to loan balance</dt>
              <dd className="shrink-0 tabular-nums">{formatMoney(costs.interest)}</dd>
            </div>
          )}
        </dl>
      </div>
      {!finalNight && projected < 0 && night.debtMornings + 1 >= BANKRUPTCY_MORNINGS && (
        <p className="mt-2 text-sm font-extrabold text-barn-deep" role="status">One more morning below zero and the winter is over.</p>
      )}
      <LoanCard night={night} onTake={takeLoan} onRepay={repayLoan} repaid={recap.loanRepaid} />
    </section>
  );
}

function Choices({
  night,
  setPendingFare,
  setPendingSnow,
}: {
  night: GameState;
  setPendingFare: (f: FarePreset) => void;
  setPendingSnow: (s: SnowPreset) => void;
}) {
  const { pendingFare, pendingSnow } = night;
  const skiers = (f: FarePreset) => Math.round(expectedArrivals(night, f, pendingSnow));
  const fareOptions: ChoiceOption<FarePreset>[] = FARES.map((v, i) => {
    const locked = v === "expensive" && night.summitLinkDecision === "accepted";
    return {
      value: v,
      glyph: <PeaksGlyph peaks={(i + 1) as 1 | 2 | 3} />,
      label: FARE_LABELS[v],
      detail: formatMoney(FARE_PRICES[v]),
      note: locked ? "Summit Pass Corp fare cap" : `~${skiers(v)} skiers`,
      disabled: locked,
    };
  });
  const previews = Object.fromEntries(SNOWS.map((v) => [v, previewOvernight(night, v)])) as Record<
    SnowPreset,
    ReturnType<typeof previewOvernight>
  >;
  const snowOptions: ChoiceOption<SnowPreset>[] = SNOWS.map((v) => ({
    value: v,
    label: SNOW_LABELS[v],
    detail: previews[v].cost ? `${formatMoney(previews[v].cost)}/night` : "Free",
    note: `~${Math.round(previews[v].meanQuality * 100)}% quality`,
  }));
  const worth = Math.round(expectedHillValue(night.reputation, night.buildings, night.talentsOwned));
  const chosen = previews[pendingSnow];
  return (
    <div className="panel px-3.5 pb-4 pt-3.5">
      <SectionHeading aside="Tomorrow’s public ticket">Fare</SectionHeading>
      <ChoiceTiles label="Fare" options={fareOptions} value={pendingFare} onPick={setPendingFare} />
      <p className="mt-2.5 text-[0.85rem] font-bold leading-snug text-ink-soft" aria-live="polite">
        At {formatMoney(FARE_PRICES[pendingFare])}, expect about {skiers(pendingFare)} skiers with {SNOW_LABELS[pendingSnow].toLowerCase()} service.
        Weather moves the real number. Locals figure a day here is worth about {formatMoney(worth)}.
      </p>

      <SectionHeading aside="Crew overnight">Snow &amp; service</SectionHeading>
      <ChoiceTiles
        label="Snow and service"
        options={snowOptions}
        value={pendingSnow}
        onPick={setPendingSnow}
      />
      <p className="mt-2.5 text-[0.85rem] font-bold leading-snug text-ink-soft" aria-live="polite">
        This service should leave the snow at about {Math.round(chosen.meanQuality * 100)}% quality by morning.
        In the most likely weather, that looks like {chosen.label.toLowerCase()}.
      </p>
      <p className="mt-1 text-[0.85rem] font-extrabold tabular-nums" aria-live="polite">
        {chosen.cost ? `The crew charges ${formatMoney(chosen.cost)} when you sleep.` : "Service is free tonight."}
      </p>
      <div className="mt-3 border-t border-snow-2 pt-1">
        <Forecast state={night} ahead={1} />
        <Forecast state={night} ahead={2} />
      </div>
    </div>
  );
}

export function NightRecapSheet({ onOffice, onMap }: { onOffice: (tab: OfficeTabId) => void; onMap: (layer: MapLayer) => void }) {
  const night = useGameStore((s) => (s.phase === "night" && s.nightRecap ? s : null));
  const setPendingFare = useGameStore((s) => s.setPendingFare);
  const setPendingSnow = useGameStore((s) => s.setPendingSnow);
  const acknowledgeBeat = useGameStore((s) => s.acknowledgeBeat);
  const tipsOn = useSettings(s => s.tips);
  const guideSeen = useGameStore(s => s.tipsSeen.includes(PROBLEM_GUIDE_ID));
  const markTipSeen = useGameStore(s => s.markTipSeen);
  const radio = useSettings(s => s.radioEnabled);
  const sleep = useGameStore((s) => s.sleep);
  const rushCrewPoint = useGameStore((s) => s.rushCrewPoint);
  const recapDayIndex = useGameStore((s) => (s.phase === "night" && s.nightRecap ? s.dayIndex : null));
  const [mobileStep, setMobileStep] = useState<"results" | "plan">("results");
  const [mobileStepNight, setMobileStepNight] = useState<number | null>(null);
  // Sheet stays mounted through the day; reset phone tabs each night.
  if (recapDayIndex != null && recapDayIndex !== mobileStepNight) {
    setMobileStepNight(recapDayIndex);
    setMobileStep("results");
  }

  const recap = night?.nightRecap;
  if (!night || !recap) return null;

  const { dayIndex, pendingBeat, beatAcknowledged, lastDay } = night;
  const finalNight = dayIndex === night.seasonLength;
  const planNight = !finalNight;
  const { weekday, date } = dayLabel(seasonCalendar(night), dayIndex);
  const nextTalent = nextTalentName(night.talentsOwned);
  const beat = storyBeatCopy(pendingBeat);
  const surprise = night.surpriseLog.find((entry) => entry.dayIndex === dayIndex);
  const surpriseCopy = surprise && surpriseRadio(surprise);
  const summitLinkOffer = summitLinkOfferOpen(night);
  const canSleep = !summitLinkOffer && (!pendingBeat || beatAcknowledged || (!radio && pendingBeat !== "school_bus"));
  const hasGuests = recap.arrivals > 0;
  const demand = hasGuests ? topGuestDemand(recap, demandContext(night)) : null;
  const guide = tipsOn && !guideSeen ? problemGuide(recap, demand?.key) : null;
  const guestsWant = demand?.line ?? null;
  const founderName = night.founderId ? founderById(night.founderId)?.name : undefined;
  const problemHeadline = hasGuests ? tidy(recap.problem) : NO_SKIERS_PROBLEM;
  const showRush =
    night.crewRushDay !== dayIndex &&
    night.cash >= CREW_RUSH_COST &&
    pickableTalents({ ...night, crewPoints: night.crewPoints + 1 }).length > 0;

  const planAside = planNight ? (
    <>
      <Choices night={night} setPendingFare={setPendingFare} setPendingSnow={setPendingSnow} />
      <div className="chip mt-4 space-y-2 px-3.5 py-2.5 text-[0.92rem] font-bold">
        {night.crewPoints > 0 ? (
          <p>
            {night.crewPoints} crew {night.crewPoints === 1 ? "point" : "points"} ready. Spend them in Office → Crew before you sleep.
          </p>
        ) : nextTalent ? (
          <p>
            Sleep to earn 1 crew point. Next skill: {talentDescription(nextTalent, night)}
          </p>
        ) : null}
        {pickableTalents(night).length > 0 && (
          <button type="button" className="key press min-h-11 w-full px-3 text-sm font-extrabold" onClick={() => onOffice("Crew")}>
            Choose crew skill
          </button>
        )}
        {showRush && (
          <button type="button" className="key press min-h-11 w-full px-3 text-sm font-extrabold" onClick={() => rushCrewPoint()}>
            Rush +1 point ({formatMoney(CREW_RUSH_COST)})
          </button>
        )}
      </div>
    </>
  ) : null;

  const hideResultsOnMobile = planNight && mobileStep === "plan";
  const hidePlanOnMobile = planNight && mobileStep === "results";

  return (
    <Sheet
      modal
      wide
      titleHidden
      mood="night"
      z="z-50"
      title="Closing recap"
      aside={
        planAside ? (
          <div className={hidePlanOnMobile ? "hidden md:block short:block" : undefined}>
            {planAside}
          </div>
        ) : undefined
      }
      footer={
        <div>
          {!canSleep && (
            <p
              id="sleep-hint"
              className="mb-2 text-center text-[0.88rem] font-bold text-ink short:mb-1.5"
            >
              {summitLinkOffer && "Answer Vivian before you turn in."}
              {!summitLinkOffer && (pendingBeat === "school_bus"
                ? "Give Al an answer on the school bus before you turn in."
                : "Read the radio message, then tap Got it.")}
            </p>
          )}
          {planNight && (
            <div
              className="mb-2 grid grid-cols-2 gap-2 md:hidden short:hidden"
              role="tablist"
              aria-label="Recap steps"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mobileStep === "results"}
                className={`key press min-h-11 px-2 text-sm font-extrabold ${
                  mobileStep === "results" ? "key-solid [--key-fill:var(--sign-yellow)]" : ""
                }`}
                onClick={() => setMobileStep("results")}
              >
                Today&apos;s results
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileStep === "plan"}
                className={`key press min-h-11 px-2 text-sm font-extrabold ${
                  mobileStep === "plan" ? "key-solid [--key-fill:var(--sign-yellow)]" : ""
                }`}
                onClick={() => setMobileStep("plan")}
              >
                Plan tomorrow
              </button>
            </div>
          )}
          <PrimaryButton
            tone="brown"
            disabled={!canSleep}
            aria-describedby={canSleep ? undefined : "sleep-hint"}
            onClick={() => {
              if (!radio && pendingBeat && !beatAcknowledged) acknowledgeBeat();
              if (guide) markTipSeen(PROBLEM_GUIDE_ID);
              sleep();
            }}
          >
            <CocoaIcon size={24} />
            {planNight ? "Sleep until morning" : "Finish the winter"}
          </PrimaryButton>
        </div>
      }
    >
      <div className={hideResultsOnMobile ? "hidden md:block short:block" : undefined}>
        <Sign
          innerClassName="pb-4 pt-3"
          tab={`Dutch Hill, ${WEEKDAY_FULL[weekday]} ${date} night`}
        >
          <div className="flex items-center justify-between gap-2 px-3.5 pt-1">
            <SheetTitle className="display display-lg whitespace-nowrap text-[1.85rem] text-white">
              Closing recap
            </SheetTitle>
            <span className="max-w-[6.2rem] text-right text-[0.82rem] font-extrabold leading-tight text-sign-green-ink">
              Lights on in the lodge
            </span>
          </div>
          <div className="knit mt-3" aria-hidden="true" />
          <div className="grid grid-cols-3 gap-3 px-3.5 pt-3">
            <StatTile onSign label="Skiers" value={recap.arrivals} />
            <StatTile
              onSign
              label="Happiness"
              value={hasGuests ? `${Math.round(recap.satisfaction)}%` : "No skiers"}
              note={hasGuests ? moodWord(recap.satisfaction).word : undefined}
            />
            <StatTile
              onSign
              label="Cash today"
              value={formatMoney(recap.cashDelta, { signed: true })}
            />
          </div>
        </Sign>

        <NightMoney
          key={`${night.seasonSeed}-${dayIndex}`}
          recap={recap}
          night={night}
          lastDay={lastDay}
          dayIndex={dayIndex}
        />

        <TopTakeaway
          headline={problemHeadline}
          guestLine={guestsWant}
          guide={guide}
          founderName={founderName}
          onMap={onMap}
          onOffice={onOffice}
          onDismissGuide={() => markTipSeen(PROBLEM_GUIDE_ID)}
        />

        {!!recap.facts.balked && (
          <p className="mt-2 text-sm font-bold">
            Guests balked at the lift line {recap.facts.balked} {recap.facts.balked === 1 ? "time" : "times"} today.
          </p>
        )}

        {hasGuests && <WhyList key={dayIndex} recap={recap} patrol={TALENT.firstAidHut.learned(night.talentsOwned)} />}

        <SummitLinkCard night={night} />
        <SchoolContractCard night={night} />
        {radio && beat && !beatAcknowledged && pendingBeat !== "school_bus" && !summitLinkOffer && (
          <RadioCard
            title={beat.title}
            action={
              <button
                type="button"
                onClick={acknowledgeBeat}
                className="key key-solid press flex h-12 w-full items-center justify-center text-[1rem] font-extrabold [--key-fill:var(--sign-yellow)] [--lift:4px]"
              >
                Got it
              </button>
            }
          >
            {tidy(beat.radio)}
          </RadioCard>
        )}
        {radio && surpriseCopy && <RadioCard title={surpriseCopy.title}>{surpriseCopy.radio}</RadioCard>}
      </div>
    </Sheet>
  );
}
