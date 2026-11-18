"use client";

import { ASSET_CATALOG, type AssetId } from "@/game/base";

import { useState } from "react";
import { formatMoney } from "@/game/format";
import { expectedArrivals, previewOvernight } from "@/game/rules";
import { expectedHillValue } from "@/game/satisfaction";
import { nextTalentName, weekdayLabel, type NightRecap } from "@/game/sim";
import { storyBeatCopy, useGameStore } from "@/game/store";
import type { GameState, LastDay } from "@/game/state";
import { WHY_BASE, delta, formatPoints, whyLines } from "@/game/why";
import {
  FARE_LABELS,
  FARE_PRICES,
  SNOW_LABELS,
  SNOW_NIGHT_COST,
  type FarePreset,
  type SnowPreset,
  type WeatherKind,
} from "@/game/types";
import { outlookFor } from "@/game/weather";
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

function Forecast({ state, ahead }: { state: GameState; ahead: 1 | 2 }) {
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
  if (score >= 75) return { word: "Happy", tone: "good" };
  if (score >= 55) return { word: "Content", tone: "good" };
  if (score >= 40) return { word: "Mixed", tone: "watch" };
  return { word: "Grumpy", tone: "bad" };
}

/** Largest effect on the bars; anything bigger fills the half-track. */
const BAR_FULL_PTS = 20;

function WhyList({ recap }: { recap: NightRecap }) {
  const [open, setOpen] = useState(false);
  const lines = whyLines(recap);
  return (
    <div className="mt-3">
      <DisclosureButton open={open} controls="why-list" onToggle={() => setOpen((o) => !o)}>
        Why {Math.round(recap.satisfaction)}% happy?
      </DisclosureButton>
      {open && (
        <div id="why-list" className="panel mt-2.5 px-3.5 py-1.5">
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
                  <p className="text-[0.85rem] font-bold leading-snug text-ink-soft">{line.detail}</p>
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
            Average guest: {WHY_BASE} to start, plus the above, is about{" "}
            {Math.round(recap.satisfaction)}.
          </p>
        </div>
      )}
    </div>
  );
}

function Deltas({ recap, last, dayIndex }: { recap: NightRecap; last: LastDay; dayIndex: number }) {
  const skiers = delta(recap.arrivals, last.arrivals, (d) => `${Math.round(d)}`, 0.5);
  const happy = delta(recap.satisfaction, last.satisfaction, (d) => `${Math.round(d)} pts`, 0.5);
  const cash = delta(recap.cashDelta, last.cashDelta, (d) => formatMoney(d), 0.5);
  return (
    <div
      className="chip mt-4 grid grid-cols-3 gap-x-3 gap-y-1 px-3.5 py-2"
      aria-label={`Change since day ${dayIndex - 1}`}
    >
      <DeltaChip direction={skiers.direction} what="Skiers">{skiers.text}</DeltaChip>
      <DeltaChip direction={happy.direction} what="Happiness">{happy.text}</DeltaChip>
      <DeltaChip direction={cash.direction} what="Cash today">{cash.text}</DeltaChip>
      <p className="col-span-3 text-[0.78rem] font-bold leading-snug text-ink-soft">
        vs yesterday ({FARE_LABELS[last.fare]} {formatMoney(FARE_PRICES[last.fare])}, {SNOW_LABELS[last.snow]} snow)
      </p>
    </div>
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
  const fareOptions: ChoiceOption<FarePreset>[] = FARES.map((v, i) => ({
    value: v,
    glyph: <PeaksGlyph peaks={(i + 1) as 1 | 2 | 3} />,
    label: FARE_LABELS[v],
    detail: formatMoney(FARE_PRICES[v]),
    note: `~${skiers(v)} skiers`,
  }));
  const previews = Object.fromEntries(SNOWS.map((v) => [v, previewOvernight(night, v)])) as Record<
    SnowPreset,
    ReturnType<typeof previewOvernight>
  >;
  const snowOptions: ChoiceOption<SnowPreset>[] = SNOWS.map((v) => ({
    value: v,
    label: SNOW_LABELS[v],
    detail: SNOW_NIGHT_COST[v] ? `${formatMoney(SNOW_NIGHT_COST[v])}/night` : "Free",
    note: `${previews[v].label}, ${Math.round(previews[v].meanQuality * 100)}%`,
  }));
  const worth = Math.round(expectedHillValue(night.reputation, night.buildings));
  const chosen = previews[pendingSnow];
  return (
    <div className="panel px-3.5 pb-4 pt-3.5">
      <Forecast state={night} ahead={1} />
      <Forecast state={night} ahead={2} />
      <SectionHeading aside="Tomorrow’s ticket">Fare</SectionHeading>
      <ChoiceTiles label="Fare" options={fareOptions} value={pendingFare} onPick={setPendingFare} />
      <p className="mt-2.5 text-[0.85rem] font-bold leading-snug text-ink-soft" aria-live="polite">
        Tomorrow, locals expect a day here to be worth about {formatMoney(worth)}.{" "}
        {FARE_LABELS[pendingFare]} {formatMoney(FARE_PRICES[pendingFare])} brings about {skiers(pendingFare)} skiers.
      </p>

      <SectionHeading aside="Crew overnight">Snow &amp; service</SectionHeading>
      <ChoiceTiles
        label="Snow and service"
        options={snowOptions}
        value={pendingSnow}
        onPick={setPendingSnow}
      />
      <p className="mt-2.5 text-[0.85rem] font-bold leading-snug text-ink-soft" aria-live="polite">
        Tomorrow morning: {chosen.label.toLowerCase()}, average quality{" "}
        {Math.round(chosen.meanQuality * 100)}%.
      </p>
      <p className="mt-1 text-[0.85rem] font-extrabold tabular-nums" aria-live="polite">
        Tonight&rsquo;s snow &amp; service:{" "}
        {chosen.cost ? `${formatMoney(-chosen.cost)}, charged at Sleep` : "free, nothing charged"}
      </p>
    </div>
  );
}

export function NightRecapSheet() {
  const night = useGameStore((s) => (s.phase === "night" && s.nightRecap ? s : null));
  const setPendingFare = useGameStore((s) => s.setPendingFare);
  const setPendingSnow = useGameStore((s) => s.setPendingSnow);
  const acknowledgeBeat = useGameStore((s) => s.acknowledgeBeat);
  const sleep = useGameStore((s) => s.sleep);

  const recap = night?.nightRecap;
  if (!night || !recap) return null;

  const { dayIndex, pendingBeat, beatAcknowledged, lastDay } = night;
  const nextTalent = nextTalentName(night.talentsOwned);
  const beat = storyBeatCopy(pendingBeat);
  const canSleep = !pendingBeat || beatAcknowledged;
  const mood = moodWord(recap.satisfaction);

  return (
    <Sheet
      modal
      wide
      titleHidden
      mood="night"
      z="z-50"
      title="Closing recap"
      aside={
        <>
          {dayIndex < night.seasonLength && <Choices
            night={night}
            setPendingFare={setPendingFare}
            setPendingSnow={setPendingSnow}
          />}

          {dayIndex < night.seasonLength && nextTalent && (
            <p className="chip mt-4 px-3.5 py-2.5 text-[0.92rem] font-bold">
              Tomorrow the crew learns{" "}
              <span className="font-extrabold text-sign-green">{nextTalent}</span>
            </p>
          )}
        </>
      }
      footer={
        <div>
          {!canSleep && (
            <p
              id="sleep-hint"
              className="mb-2 text-center text-[0.88rem] font-bold text-ink short:mb-1.5"
            >
              Read the radio message, then tap Got it.
            </p>
          )}
          <PrimaryButton
            tone="brown"
            disabled={!canSleep}
            aria-describedby={canSleep ? undefined : "sleep-hint"}
            onClick={sleep}
          >
            <CocoaIcon size={24} />
            {dayIndex < night.seasonLength ? "Sleep until morning" : "Finish the winter"}
          </PrimaryButton>
        </div>
      }
    >
      <div>
        <Sign
          innerClassName="pb-4 pt-3"
          tab={`Dutch Hill, ${WEEKDAY_FULL[weekdayLabel(dayIndex)] ?? weekdayLabel(dayIndex)} night`}
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
              value={`${Math.round(recap.satisfaction)}%`}
              note={mood.word}
            />
            <StatTile
              onSign
              label="Cash today"
              value={formatMoney(recap.cashDelta, { signed: true })}
            />
          </div>
        </Sign>
        {lastDay && <Deltas recap={recap} last={lastDay} dayIndex={dayIndex} />}

        <p className="mt-4 border-l-[5px] border-barn pl-3 text-[1.05rem] font-extrabold leading-snug">
          <span className="sr-only">Problem: </span>
          {tidy(recap.problem)}
        </p>

        {recap.facts.venueRevenue && (
          <ul aria-label="Venue takings" className="mt-2 space-y-1 text-sm font-bold">
            {Object.entries(recap.facts.venueRevenue).map(([id, amount]) => (
              <li key={id}>{ASSET_CATALOG[id as AssetId].label} took {formatMoney(amount)}</li>
            ))}
          </ul>
        )}
        {!!recap.facts.balked && <p className="mt-2 text-sm font-bold">{recap.facts.balked} stops to sit out a line</p>}
        <WhyList key={dayIndex} recap={recap} />

        {beat && !beatAcknowledged && (
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
      </div>
    </Sheet>
  );
}
