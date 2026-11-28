"use client";

import { TALENT } from "@/game/talents";

import { useId, useState } from "react";
import { BANKRUPTCY_MORNINGS, dailyCosts, morningCash } from "@/game/economy";
import { formatMoney } from "@/game/format";
import { expectedArrivals, mtShuttleOfferOpen, previewOvernight, schoolContractOfferDay, snowServiceStats, summitLinkOfferOpen } from "@/game/rules";
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
import { CLUB_BUS_DISCOUNT, CLUB_BUS_SKIERS, SUMMIT_LINK_PAYMENT } from "@/game/summitLink";
import { NIGHT_LIGHTS_COST, NIGHT_SESSION_UPKEEP, mountTomNightNet } from "@/game/mountains/mountTom";
import {
  INSPECTOR_REPAIR_COST,
  ORCHARD_PARCEL_COST,
  mapleValleyRadioNote,
} from "@/game/mountains/mapleValley";
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
import { SegmentedControl } from "@/ui/kit/SegmentedControl";
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
import { GroomerDownCard } from "@/ui/GroomerDownCard";
import { MountTomShuttleCard } from "@/ui/MountTomShuttleCard";
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
    <div className="mt-2.5 first:mt-0" aria-label={title} role="group">
      <p className="text-sm font-extrabold">{title}</p>
      <ul className="mt-1.5 grid grid-cols-4 gap-1.5">
        {odds.map((kind, index) => {
          const { name, Icon } = FORECAST[kind];
          const top = index === 0;
          return (
            <li
              key={kind}
              className={`flex flex-col items-center rounded-lg border px-1.5 py-1.5 text-center ${
                top
                  ? "border-ink/25 bg-white text-ink"
                  : "border-transparent bg-white/55 text-ink-soft"
              }`}
            >
              <span className="inline-flex items-center gap-1 text-[0.82rem] font-extrabold leading-none tabular-nums text-ink">
                <Icon size={14} />
                {Math.round(outlook[kind] * 100)}%
              </span>
              <span className="mt-0.5 text-[0.7rem] font-bold leading-none">
                {name}
              </span>
            </li>
          );
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

function Deltas({ recap, last, dayIndex, className }: { recap: NightRecap; last: LastDay; dayIndex: number; className?: string }) {
  const skiers = delta(recap.arrivals, last.arrivals, (d) => `${Math.round(d)}`, 0.5);
  const happy = delta(recap.satisfaction, last.satisfaction, (d) => `${Math.round(d)} pts`, 0.5);
  const cash = delta(recap.cashDelta, last.cashDelta, (d) => formatMoney(d), 0.5);
  return (
    <div
      className={`well grid grid-cols-3 gap-x-3 gap-y-1 px-3 py-2 ${className ?? ""}`}
      aria-label={`Change since day ${dayIndex - 1}`}
    >
      <DeltaChip direction={skiers.direction} what="Skiers">{skiers.text}</DeltaChip>
      {recap.arrivals > 0 && last.arrivals > 0
        ? <DeltaChip direction={happy.direction} what="Happiness">{happy.text}</DeltaChip>
        : <span className="text-xs font-bold text-ink-soft">Nothing yet</span>}
      <DeltaChip direction={cash.direction} what="Cash today">{cash.text}</DeltaChip>
      <p className="col-span-3 text-[0.76rem] font-bold leading-snug text-ink-soft">
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
    <section className="panel mt-3 px-3.5 py-3" aria-label="Top takeaway">
      <h3 className="text-xs font-extrabold text-sign-brown">Top takeaway</h3>
      <p className="mt-1 text-[1rem] font-extrabold leading-snug">{headline}</p>
      {guestLine && <p className="mt-1.5 text-sm font-bold leading-snug text-ink-soft">{guestLine}</p>}
      {guide && (
        <div className="well mt-2.5 space-y-2 p-2.5">
          <p className="text-sm font-bold leading-snug">
            <LiveMessage>
              <strong>{founderName}:</strong> {guide.text}
            </LiveMessage>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="key key-sm press min-h-10 px-2.5 text-xs font-extrabold [--lift:2px]" onClick={() => onMap(guide.layer)}>
              Map: {LAYERS[guide.layer]}
            </button>
            <button type="button" className="key key-sm press min-h-10 px-2.5 text-xs font-extrabold [--lift:2px]" onClick={() => onOffice(guide.tab)}>
              Office: {guide.tab}
            </button>
            <button type="button" className="min-h-10 px-1 text-xs font-extrabold underline" onClick={onDismissGuide}>
              Dismiss advice
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function WhyAndBreakdown({
  night,
  recap,
  lastDay,
  dayIndex,
  hasGuests,
  patrol,
}: {
  night: GameState;
  recap: NightRecap;
  lastDay: LastDay | null;
  dayIndex: number;
  hasGuests: boolean;
  patrol: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const lines = whyLines(recap);
  const today = observeGuests(recap);
  const costs = dailyCosts(night);
  const breakdown = recap.costs && recap.revenue != null ? revenueBreakdownFromRecap(recap) : null;
  const costLines = recap.costs && recap.revenue != null ? [
    { label: "Fixed operating costs", amount: -(costs.fixed - (costs.vacationStaffing ?? 0)) },
    { label: "Vacation-week staffing", amount: -(costs.vacationStaffing ?? 0) },
    { label: "Founder operating costs", amount: -costs.founder },
    { label: "Lift operations", amount: -costs.liftOps },
    { label: "Building upkeep", amount: -costs.upkeep },
  ] : [];
  const otherLines = [
    ...(breakdown ? [] : [{ label: "Cash from operations", amount: recap.cashDelta }]),
    { label: "Construction paid today", amount: -costs.constructionSpent },
    { label: "Snow and service tonight", amount: -costs.snowNight },
    { label: "Construction payments tonight", amount: -costs.draws },
    { label: "Loan received tonight", amount: recap.loanReceived },
    { label: "Loan repaid tonight", amount: -recap.loanRepaid },
    { label: "Whiterock Pass payment tonight", amount: recap.summitLinkReply === "accepted" ? (recap.summitLinkPayment ?? SUMMIT_LINK_PAYMENT) : 0 },
  ];

  return (
    <section className="mt-3" aria-label="Why and money breakdown">
      <DisclosureButton flat open={open} controls={panelId} onToggle={() => setOpen((v) => !v)}>
        Why {hasGuests ? `${Math.round(recap.satisfaction)}% happy` : "today ended like this"} &amp; ledger
      </DisclosureButton>
      <div hidden={!open} id={panelId} className="panel beat-swap mt-2 space-y-3 px-3.5 py-3">
        {lastDay && <Deltas recap={recap} last={lastDay} dayIndex={dayIndex} />}

        {hasGuests && (
          <div className="space-y-2">
            {today && (
              <p className="border-b-2 border-snow-2 pb-2 text-sm font-extrabold">
                {GUEST_MEASURE_LABELS[today.measure]} today:{" "}
                <span className="tabular-nums">{formatGuestObservation(today)}</span>
              </p>
            )}
            <ul className="divide-y-2 divide-snow-2">
              {lines.map((line) => {
                const width = Math.min(1, Math.abs(line.points) / BAR_FULL_PTS) * 50;
                const rounded = Math.round(line.points);
                return (
                  <li key={line.key} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[0.95rem] font-extrabold">{line.label}</span>
                      <span
                        className={`text-[0.98rem] font-extrabold tabular-nums ${
                          rounded > 0 ? "text-sign-green" : rounded < 0 ? "text-barn-deep" : "text-ink-soft"
                        }`}
                      >
                        {formatPoints(line.points)}
                      </span>
                    </div>
                    <p className="text-[0.82rem] font-bold leading-snug text-ink-soft">
                      {line.detail}
                      {patrol && line.key === "snow" && line.points < 0 ? " Dana's patrol aid softened the rough snow." : ""}
                    </p>
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
            <p className="text-[0.78rem] font-bold text-ink-soft">
              Guests start at {WHY_BASE}, add the lines above, and land near {Math.round(recap.satisfaction)}.
            </p>
          </div>
        )}

        <div className="border-t-2 border-snow-2 pt-3">
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
            {otherLines.filter(({ amount }) => amount !== 0).map(({ label, amount }) => (
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
      </div>
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
      note: locked ? "Whiterock fare cap" : `~${skiers(v)} skiers`,
      disabled: locked,
    };
  });
  const previews = Object.fromEntries(SNOWS.map((v) => [v, previewOvernight(night, v)])) as Record<
    SnowPreset,
    ReturnType<typeof previewOvernight>
  >;
  const tomorrow = night.weatherDays[night.dayIndex];
  const thawOutlook = (outlookFor(night, 1)?.thaw ?? 0) >= 0.45;
  const snowOptions: ChoiceOption<SnowPreset>[] = SNOWS.map((v) => {
    const stats = snowServiceStats(night, v, tomorrow);
    const crew =
      v === "minimal"
        ? "guns & cat off"
        : `${stats.gunSegments} guns, ${stats.groomFeet.toLocaleString()} ft cat`;
    return {
      value: v,
      label: SNOW_LABELS[v],
      detail: previews[v].cost ? `${formatMoney(previews[v].cost)}/night` : "Free",
      note: `${crew}, ~${Math.round(previews[v].meanQuality * 100)}%`,
    };
  });
  const installNightLights = useGameStore((s) => s.installNightLights);
  const setNightSession = useGameStore((s) => s.setNightSession);
  const worth = Math.round(expectedHillValue(night.reputation, night.buildings, night.talentsOwned));
  const chosen = previews[pendingSnow];
  const tomProjection = mountTomNightNet(Math.round(skiers(pendingFare)));
  return (
    <div className="panel space-y-3 px-3.5 pb-4 pt-3.5">
      <div className="well px-3 py-2.5">
        <Forecast state={night} ahead={1} />
        <Forecast state={night} ahead={2} />
      </div>

      <div>
        <SectionHeading aside="Tomorrow’s public ticket">Fare</SectionHeading>
        <ChoiceTiles label="Fare" options={fareOptions} value={pendingFare} onPick={setPendingFare} />
        <p className="mt-2 text-[0.82rem] font-bold leading-snug text-ink-soft" aria-live="polite">
          At {formatMoney(FARE_PRICES[pendingFare])}, expect ~{skiers(pendingFare)} skiers with {SNOW_LABELS[pendingSnow].toLowerCase()} service. Locals figure a day here is worth ~{formatMoney(worth)}.
        </p>
      </div>

      <div>
        <SectionHeading aside="Crew overnight">Snow &amp; service</SectionHeading>
        <ChoiceTiles
          label="Snow and service"
          options={snowOptions}
          value={pendingSnow}
          onPick={setPendingSnow}
        />
        <p className="mt-2 text-[0.82rem] font-bold leading-snug text-ink-soft" aria-live="polite">
          Targets ~{Math.round(chosen.meanQuality * 100)}% quality ({chosen.label.toLowerCase()}).{" "}
          {thawOutlook && pendingSnow !== "minimal" && night.guns.length > 0
            ? "Thaw is likely tonight: guns hold the base while grooming fixes the surface. "
            : ""}
          <span className="font-extrabold text-ink">
            {chosen.cost ? `${formatMoney(chosen.cost)} charged when you sleep.` : "Free tonight."}
          </span>
        </p>
      </div>

      {night.mountainId === "mount_tom" && (
        <div className="border-t-2 border-snow-2 pt-2.5 space-y-1.5">
          {!night.nightLights ? (
            <>
              <button
                type="button"
                disabled={night.cash < NIGHT_LIGHTS_COST}
                onClick={installNightLights}
                className="key key-solid press min-h-11 w-full px-3 text-sm font-extrabold [--key-fill:var(--sign-yellow)] [--lift:3px]"
              >
                Wire ridge floodlights ({formatMoney(NIGHT_LIGHTS_COST)})
              </button>
              <p className="text-[0.82rem] font-bold text-ink-soft">
                Turns on Mount Tom Night Sessions (+evening pass revenue, {formatMoney(NIGHT_SESSION_UPKEEP)}/night power).
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setNightSession(!night.nightSessionOn)}
                className={`key press min-h-11 w-full px-3 text-sm font-extrabold [--lift:3px] ${
                  night.nightSessionOn ? "key-solid [--key-fill:var(--sign-yellow)]" : ""
                }`}
              >
                Night session: {night.nightSessionOn ? "ON" : "OFF"}
              </button>
              <p className="text-[0.82rem] font-bold text-ink-soft">
                {night.nightSessionOn
                  ? `Range lights lit tonight (est. ${formatMoney(tomProjection.net, { signed: true })} net on ~${skiers(pendingFare)} skiers).`
                  : "Range lights off tonight ($0 power upkeep)."}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function NightRecapSheet({ onOffice, onMap }: { onOffice: (tab: OfficeTabId) => void; onMap: (layer: MapLayer) => void }) {
  const night = useGameStore((s) => (s.phase === "night" && s.nightRecap ? s : null));
  const setPendingFare = useGameStore((s) => s.setPendingFare);
  const setPendingSnow = useGameStore((s) => s.setPendingSnow);
  const acknowledgeBeat = useGameStore((s) => s.acknowledgeBeat);
  const decideClubBooking = useGameStore((s) => s.decideClubBooking);
  const decideOrchardParcel = useGameStore((s) => s.decideOrchardParcel);
  const decideInspectorNotice = useGameStore((s) => s.decideInspectorNotice);
  const tipsOn = useSettings(s => s.tips);
  const guideSeen = useGameStore(s => s.tipsSeen.includes(PROBLEM_GUIDE_ID));
  const markTipSeen = useGameStore(s => s.markTipSeen);
  const radio = useSettings(s => s.radioEnabled);
  const sleep = useGameStore((s) => s.sleep);
  const rushCrewPoint = useGameStore((s) => s.rushCrewPoint);
  const takeLoan = useGameStore((s) => s.takeLoan);
  const repayLoan = useGameStore((s) => s.repayLoan);
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
  const projected = morningCash(night);
  const finalNight = dayIndex === night.seasonLength;
  const planNight = !finalNight;
  const { weekday, date } = dayLabel(seasonCalendar(night), dayIndex);
  const nextTalent = nextTalentName(night.talentsOwned);
  const beat = storyBeatCopy(pendingBeat, night.operatorName ?? null, night.guns.length);
  const surprise = night.surpriseLog.find((entry) => entry.dayIndex === dayIndex);
  const showSummitOffer = summitLinkOfferOpen(night);
  const showSchoolOffer = night.pendingBeat === "school_bus" && schoolContractOfferDay(night) !== null;
  const groomerChoiceNeeded = pendingBeat === "groomer_down" && night.groomerDownDecision === null;
  const showGroomerOffer = groomerChoiceNeeded;
  const showClubOffer = night.clubBooking?.decision === "pending";
  const showOrchardOffer = night.mountainId === "maple_valley" && night.orchardParcel === "pending";
  const showShuttleOffer = mtShuttleOfferOpen(night);
  const showInspectorOffer = night.mountainId === "maple_valley" && night.inspectorNotice?.decision === "pending";
  const showBusSummary = Boolean(night.nightRecap?.facts.schoolBus);
  const surpriseCopy =
    !pendingBeat &&
    surprise &&
    surprise.kind !== "club_bus" &&
    surprise.kind !== "groomer_down"
      ? surpriseRadio(surprise, night.operatorName ?? null, {
          fare: night.fare,
          vivianVisit: night.vivianVisit,
          reputation: night.reputation,
        })
      : null;
  const summitLinkOffer = showSummitOffer;
  const canSleep =
    !summitLinkOffer &&
    !groomerChoiceNeeded &&
    !showClubOffer &&
    !showOrchardOffer &&
    !showShuttleOffer &&
    !showInspectorOffer &&
    (!pendingBeat || beatAcknowledged || (!radio && pendingBeat !== "school_bus" && pendingBeat !== "groomer_down"));
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
    <div key={`plan-${mobileStep}`} className="beat-swap space-y-3">
      <Choices night={night} setPendingFare={setPendingFare} setPendingSnow={setPendingSnow} />
      <div className="well-white space-y-2 px-3.5 py-2.5 text-[0.9rem] font-bold">
        {night.crewPoints > 0 ? (
          <p>
            {night.crewPoints} crew {night.crewPoints === 1 ? "point" : "points"} ready. Spend in Office, Talent tree before you sleep.
          </p>
        ) : nextTalent ? (
          <p>
            Sleep to earn 1 crew point. Next skill: {talentDescription(nextTalent, night)}
          </p>
        ) : null}
        {(pickableTalents(night).length > 0 || showRush) && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {pickableTalents(night).length > 0 && (
              <button
                type="button"
                className="key press min-h-11 flex-1 px-3 text-sm font-extrabold [--lift:3px]"
                onClick={() => onOffice("Crew")}
              >
                Open talent tree
              </button>
            )}
            {showRush && (
              <button
                type="button"
                className="key press min-h-11 flex-1 px-3 text-sm font-extrabold [--lift:3px]"
                onClick={() => rushCrewPoint()}
              >
                Rush +1 ({formatMoney(CREW_RUSH_COST)})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
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
              className="mb-2 text-center text-[0.86rem] font-extrabold text-ink short:mb-1.5"
            >
              {summitLinkOffer && "Answer Sloane before you turn in."}
              {!summitLinkOffer && showSchoolOffer && "Give Hank an answer on the school bus before you turn in."}
              {!summitLinkOffer && !showSchoolOffer && showGroomerOffer && "Tell Frank whether you're borrowing the town cat or running guns only."}
              {!summitLinkOffer && !showSchoolOffer && !showGroomerOffer && showClubOffer && "Answer the Bennington Ski Club before you turn in."}
              {!summitLinkOffer && !showSchoolOffer && !showGroomerOffer && !showClubOffer && showOrchardOffer && "Answer Rosa on the Maple Valley orchard parcel."}
              {!summitLinkOffer && !showSchoolOffer && !showGroomerOffer && !showClubOffer && !showOrchardOffer && showShuttleOffer && "Answer Sloane on the Saturday shuttle before turning in."}
              {!summitLinkOffer && !showSchoolOffer && !showGroomerOffer && !showClubOffer && !showOrchardOffer && !showShuttleOffer && showInspectorOffer && "Answer the Vermont tramway inspector before turning in."}
              {!summitLinkOffer && !showSchoolOffer && !showGroomerOffer && !showClubOffer && !showOrchardOffer && !showShuttleOffer && !showInspectorOffer && "Read the radio message, then tap Got it."}
            </p>
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
      {planNight && (
        <div className="mb-3 md:hidden short:hidden">
          <SegmentedControl
            role="tablist"
            ariaLabel="Recap steps"
            size="sm"
            value={mobileStep}
            onChange={setMobileStep}
            options={[
              { value: "results", label: "1. Tonight" },
              { value: "plan", label: "2. Tomorrow" },
            ]}
          />
        </div>
      )}

      <div key={`results-${mobileStep}`} className={hideResultsOnMobile ? "hidden md:block short:block" : "beat-swap"}>
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

        {!finalNight && projected < 0 && night.debtMornings + 1 >= BANKRUPTCY_MORNINGS && (
          <p className="well-white mt-3 border-barn-deep/40 px-3.5 py-2.5 text-sm font-extrabold text-barn-deep" role="status">
            One more morning below zero and the winter is over.
          </p>
        )}

        {/* Active Radio Dispatch & Decision Cards — always front-and-center above the fold */}
        <SummitLinkCard night={night} />
        {!showSummitOffer && <SchoolContractCard night={night} />}
        {!showSummitOffer && !showSchoolOffer && <GroomerDownCard night={night} />}
        {!showSummitOffer && !showSchoolOffer && !showGroomerOffer && night.clubBooking && (() => {
          if (night.clubBooking.decision === "pending") {
            const clubDate = dayLabel(seasonCalendar(night), night.clubBooking.day);
            const primaryClass = "key key-solid press min-h-12 w-full px-2 text-sm font-extrabold [--key-fill:var(--sign-yellow)] [--lift:3px]";
            const secondaryClass = "key press min-h-12 w-full px-2 text-sm font-extrabold [--lift:3px]";
            return (
              <RadioCard
                title="Bennington Ski Club offer"
                from="Bennington club secretary"
                action={
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className={primaryClass}
                      onClick={() => decideClubBooking("accepted")}
                    >
                      Book {CLUB_BUS_SKIERS} skiers
                    </button>
                    <button type="button" className={secondaryClass} onClick={() => decideClubBooking("declined")}>
                      Decline
                    </button>
                  </div>
                }
              >
                Folks in Bennington heard about your zero-wait Saturday. Can they send {CLUB_BUS_SKIERS} club skiers on{" "}
                {clubDate.weekday} {clubDate.date} for {formatMoney(CLUB_BUS_DISCOUNT)} off tickets?
              </RadioCard>
            );
          }
          if (night.clubBooking.decision === "accepted" && night.clubBooking.day > dayIndex && !showGroomerOffer) {
            const clubDate = dayLabel(seasonCalendar(night), night.clubBooking.day);
            return (
              <p className="well-white mt-3 px-3 py-2 text-sm font-bold">
                Bennington Ski Club booked for {clubDate.weekday} {clubDate.date} ({CLUB_BUS_SKIERS} skiers at {formatMoney(CLUB_BUS_DISCOUNT)} off).
              </p>
            );
          }
          if (
            night.clubBooking.decision === "accepted" &&
            night.clubBooking.day === dayIndex &&
            night.clubBooking.skiersArrived !== null &&
            !showGroomerOffer &&
            !showBusSummary
          ) {
            return (
              <RadioCard title="Bennington Ski Club" from="Club secretary">
                {night.clubBooking.skiersArrived} of {CLUB_BUS_SKIERS} Bennington skiers rode Dutch Hill today. Clean lifts keep them coming back.
              </RadioCard>
            );
          }
          return null;
        })()}
        {!showSummitOffer && !showSchoolOffer && !showClubOffer && !showGroomerOffer && showOrchardOffer && (() => {
          const copy = mapleValleyRadioNote("orchard_bid", night.operatorName ?? null);
          const primaryClass = "key key-solid press min-h-12 w-full px-2 text-sm font-extrabold [--key-fill:var(--sign-yellow)] [--lift:3px]";
          const secondaryClass = "key press min-h-12 w-full px-2 text-sm font-extrabold [--lift:3px]";
          return (
            <RadioCard
              title={copy.title}
              from="Rosa Merrill, Dummerston"
              action={
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={night.cash < ORCHARD_PARCEL_COST}
                    className={primaryClass}
                    onClick={() => decideOrchardParcel("buy")}
                  >
                    Buy parcel ({formatMoney(ORCHARD_PARCEL_COST)})
                  </button>
                  <button type="button" className={secondaryClass} onClick={() => decideOrchardParcel("decline")}>
                    Let Whiterock bid
                  </button>
                </div>
              }
            >
              {copy.radio}
            </RadioCard>
          );
        })()}
        {!showSummitOffer && !showSchoolOffer && !showClubOffer && !showGroomerOffer && !showOrchardOffer && showInspectorOffer && (() => {
          const copy = mapleValleyRadioNote("inspectors_tuesday", night.operatorName ?? null);
          const primaryClass = "key key-solid press min-h-12 w-full px-2 text-sm font-extrabold [--key-fill:var(--sign-yellow)] [--lift:3px]";
          const secondaryClass = "key press min-h-12 w-full px-2 text-sm font-extrabold [--lift:3px]";
          return (
            <RadioCard
              title={copy.title}
              from="Vermont Tramway Division"
              action={
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={primaryClass}
                    onClick={() => decideInspectorNotice("repaired")}
                  >
                    Fix bearing ({formatMoney(INSPECTOR_REPAIR_COST)})
                  </button>
                  <button type="button" className={secondaryClass} onClick={() => decideInspectorNotice("closed")}>
                    Hold lift 1 day ($0)
                  </button>
                </div>
              }
            >
              {copy.radio}
            </RadioCard>
          );
        })()}
        {!showSummitOffer && !showSchoolOffer && !showClubOffer && !showGroomerOffer && !showOrchardOffer && !showInspectorOffer && !showBusSummary &&
          radio && beat && !beatAcknowledged && pendingBeat !== "school_bus" && pendingBeat !== "groomer_down" && !summitLinkOffer && (
          <RadioCard
            title={beat.title}
            action={
              <button
                type="button"
                onClick={acknowledgeBeat}
                className="key key-solid press flex h-12 w-full items-center justify-center text-[1rem] font-extrabold [--key-fill:var(--sign-yellow)] [--lift:3px]"
              >
                Got it
              </button>
            }
          >
            {tidy(beat.radio)}
          </RadioCard>
        )}
        {!showSummitOffer && !showSchoolOffer && !showClubOffer && !showGroomerOffer && !showOrchardOffer && !showInspectorOffer && !showBusSummary &&
          radio && surpriseCopy && <RadioCard title={surpriseCopy.title}>{surpriseCopy.radio}</RadioCard>}
        {!showSummitOffer && !showSchoolOffer && !showClubOffer && !showGroomerOffer && !showOrchardOffer && !showInspectorOffer && showShuttleOffer && (
          <MountTomShuttleCard night={night} />
        )}

        <LoanCard night={night} onTake={takeLoan} onRepay={repayLoan} repaid={recap.loanRepaid} />

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

        <WhyAndBreakdown
          key={`${night.seasonSeed}-${dayIndex}`}
          night={night}
          recap={recap}
          lastDay={lastDay}
          dayIndex={dayIndex}
          hasGuests={hasGuests}
          patrol={TALENT.firstAidHut.learned(night.talentsOwned)}
        />

        {planNight && (
          <button
            type="button"
            onClick={() => setMobileStep("plan")}
            className="key key-solid press mt-3 flex min-h-12 w-full items-center justify-center px-3 text-sm font-extrabold [--key-fill:var(--sign-yellow)] [--lift:3px] md:hidden short:hidden"
          >
            Set tomorrow’s plan
          </button>
        )}
      </div>
    </Sheet>
  );
}
