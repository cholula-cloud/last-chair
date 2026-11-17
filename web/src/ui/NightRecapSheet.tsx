"use client";

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
} from "@/game/types";
import { MoonIcon } from "@/ui/kit/icons";
import { PaperSheet } from "@/ui/kit/PaperSheet";
import {
  ChoiceTiles,
  DeltaChip,
  DisclosureButton,
  PlateHeading,
  PrimaryButton,
  StatTile,
  type ChoiceOption,
  type Tone,
} from "@/ui/kit/parts";
import { RadioCard } from "@/ui/kit/RadioCard";

const FARES: FarePreset[] = ["cheap", "balanced", "expensive"];
const SNOWS: SnowPreset[] = ["minimal", "mid", "high"];

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
        <div
          id="why-list"
          className="mt-2 rounded-xl border border-ink/10 bg-white/35 px-3.5 py-2"
        >
          <ul>
            {lines.map((line) => {
              const width = Math.min(1, Math.abs(line.points) / BAR_FULL_PTS) * 50;
              const rounded = Math.round(line.points);
              return (
                <li key={line.key} className="border-b border-ink/10 py-2.5 last:border-b-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="serif text-[1rem] font-semibold text-ink">{line.label}</span>
                    <span
                      className={`num text-[1.05rem] font-bold ${
                        rounded > 0 ? "text-pine" : rounded < 0 ? "text-barn" : "text-ink-soft"
                      }`}
                    >
                      {formatPoints(line.points)}
                    </span>
                  </div>
                  <p className="text-[0.85rem] leading-snug text-ink-soft">{line.detail}</p>
                  <div className="relative mt-1.5 h-2 rounded-full bg-ink/10" aria-hidden="true">
                    <span className="absolute inset-y-0 left-1/2 w-px bg-ink/35" />
                    <span
                      className={`absolute inset-y-0 rounded-full ${
                        line.points < 0 ? "right-1/2 bg-barn" : "left-1/2 bg-pine"
                      }`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="pt-1.5 text-[0.8rem] text-ink-soft">
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
      className="mt-1.5 grid grid-cols-3 gap-3 px-3.5"
      aria-label={`Change since day ${dayIndex - 1}`}
    >
      <DeltaChip direction={skiers.direction} what="Skiers">{skiers.text}</DeltaChip>
      <DeltaChip direction={happy.direction} what="Happiness">{happy.text}</DeltaChip>
      <DeltaChip direction={cash.direction} what="Cash today">{cash.text}</DeltaChip>
      <p className="col-span-3 -mt-1 text-[0.75rem] text-ink-soft">
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
  const fareOptions: ChoiceOption<FarePreset>[] = FARES.map((v) => ({
    value: v,
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
    <>
      <PlateHeading aside="Tomorrow’s ticket">Fare</PlateHeading>
      <ChoiceTiles label="Fare" options={fareOptions} value={pendingFare} onPick={setPendingFare} />
      <p className="mt-2 text-[0.85rem] leading-snug text-ink-soft" aria-live="polite">
        Tomorrow, locals expect a day here to be worth about {formatMoney(worth)}.{" "}
        {FARE_LABELS[pendingFare]} {formatMoney(FARE_PRICES[pendingFare])} brings about {skiers(pendingFare)} skiers.
      </p>

      <PlateHeading aside="Crew overnight">Snow &amp; service</PlateHeading>
      <ChoiceTiles
        label="Snow and service"
        options={snowOptions}
        value={pendingSnow}
        onPick={setPendingSnow}
      />
      <p className="mt-2 text-[0.85rem] leading-snug text-ink-soft" aria-live="polite">
        Tomorrow morning: {chosen.label.toLowerCase()}, average quality{" "}
        {Math.round(chosen.meanQuality * 100)}%.
      </p>
      <p className="num mt-1 text-[0.85rem] font-semibold text-ink" aria-live="polite">
        Tonight&rsquo;s snow &amp; service:{" "}
        {chosen.cost ? `${formatMoney(-chosen.cost)}, charged at Sleep` : "free, nothing charged"}
      </p>
    </>
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
    <PaperSheet
      modal
      wide
      z="z-50"
      aside={
        <>
          <Choices
            night={night}
            setPendingFare={setPendingFare}
            setPendingSnow={setPendingSnow}
          />

          {nextTalent && (
            <p className="mt-4 text-[0.88rem] text-ink-soft">
              Tomorrow the crew learns{" "}
              <span className="serif font-semibold text-pine">
                {nextTalent}
              </span>
            </p>
          )}
        </>
      }
      title="Closing recap"
      subtitle={`Day ${dayIndex} · ${weekdayLabel(dayIndex)} night`}
      footer={
        <div>
          {!canSleep && (
            <p
              id="sleep-hint"
              className="mb-2 text-center text-[0.85rem] font-medium text-ink-soft short:mb-1.5"
            >
              Read the radio message, then tap Got it.
            </p>
          )}
          <PrimaryButton
            disabled={!canSleep}
            aria-describedby={canSleep ? undefined : "sleep-hint"}
            onClick={sleep}
            className="short:h-12"
          >
            <MoonIcon size={20} />
            Sleep until morning
          </PrimaryButton>
        </div>
      }
    >
      <div>
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-ink/10 bg-white/35 px-3.5 py-3">
          <StatTile label="Skiers" value={recap.arrivals} />
          <StatTile
            label="Happiness"
            value={`${Math.round(recap.satisfaction)}%`}
            tone={mood.tone}
            note={mood.word}
          />
          <StatTile
            label="Cash today"
            value={formatMoney(recap.cashDelta, { signed: true })}
            tone={recap.cashDelta >= 0 ? "good" : "bad"}
          />
        </div>
        {lastDay && <Deltas recap={recap} last={lastDay} dayIndex={dayIndex} />}

        <p className="pencil mt-3 px-1 text-[1.05rem] text-ink">
          <span className="sr-only">Problem: </span>
          {recap.problem}
        </p>

        <WhyList key={dayIndex} recap={recap} />

        {beat && !beatAcknowledged && (
          <RadioCard
            title={beat.title}
            action={
              <button
                type="button"
                onClick={acknowledgeBeat}
                className="press flex h-12 w-full items-center justify-center rounded-xl bg-pine text-[0.95rem] font-semibold text-paper"
              >
                Got it
              </button>
            }
          >
            {beat.radio}
          </RadioCard>
        )}
      </div>
    </PaperSheet>
  );
}
