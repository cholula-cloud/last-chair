"use client";

import { formatMoney } from "@/game/format";
import { nextTalentName, weekdayLabel } from "@/game/sim";
import { storyBeatCopy, useGameStore } from "@/game/store";
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
  PlateHeading,
  PrimaryButton,
  StatTile,
  type ChoiceOption,
  type Tone,
} from "@/ui/kit/parts";
import { RadioCard } from "@/ui/kit/RadioCard";

const fareOptions: ChoiceOption<FarePreset>[] = (
  ["cheap", "balanced", "expensive"] as FarePreset[]
).map((v) => ({
  value: v,
  label: FARE_LABELS[v],
  detail: formatMoney(FARE_PRICES[v]),
}));

const snowOptions: ChoiceOption<SnowPreset>[] = (
  ["minimal", "mid", "high"] as SnowPreset[]
).map((v) => ({
  value: v,
  label: SNOW_LABELS[v],
  detail: SNOW_NIGHT_COST[v]
    ? `${formatMoney(SNOW_NIGHT_COST[v])}/night`
    : "Free",
}));

function moodWord(score: number): { word: string; tone: Tone } {
  if (score >= 75) return { word: "Happy", tone: "good" };
  if (score >= 55) return { word: "Content", tone: "good" };
  if (score >= 40) return { word: "Mixed", tone: "watch" };
  return { word: "Grumpy", tone: "bad" };
}

export function NightRecapSheet() {
  const phase = useGameStore((s) => s.phase);
  const recap = useGameStore((s) => s.nightRecap);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const pendingFare = useGameStore((s) => s.pendingFare);
  const pendingSnow = useGameStore((s) => s.pendingSnow);
  const pendingBeat = useGameStore((s) => s.pendingBeat);
  const beatAcknowledged = useGameStore((s) => s.beatAcknowledged);
  const setPendingFare = useGameStore((s) => s.setPendingFare);
  const setPendingSnow = useGameStore((s) => s.setPendingSnow);
  const acknowledgeBeat = useGameStore((s) => s.acknowledgeBeat);
  const sleep = useGameStore((s) => s.sleep);
  const talentsOwned = useGameStore((s) => s.talentsOwned);
  const nextTalent = nextTalentName(talentsOwned);

  if (phase !== "night" || !recap) return null;

  const beat = storyBeatCopy(pendingBeat);
  const canSleep = !pendingBeat || beatAcknowledged;
  const mood = moodWord(recap.satisfaction);

  return (
    <PaperSheet
      modal
      wide
      z="z-50"
      title="Closing recap"
      subtitle={`Day ${dayIndex} · ${weekdayLabel(dayIndex)} night`}
      footer={
        <div className="short:flex short:items-center short:gap-4">
          {!canSleep && (
            <p
              id="sleep-hint"
              className="mb-2 text-center text-[0.85rem] font-medium text-ink-soft short:mb-0 short:flex-1 short:text-left"
            >
              Read the radio message, then tap Got it.
            </p>
          )}
          <PrimaryButton
            disabled={!canSleep}
            aria-describedby={canSleep ? undefined : "sleep-hint"}
            onClick={sleep}
            className="short:ml-auto short:h-12 short:w-[min(22rem,50%)]"
          >
            <MoonIcon size={20} />
            Sleep until morning
          </PrimaryButton>
        </div>
      }
    >
      <div className="short:grid short:grid-cols-2 short:gap-6">
        <div>
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-ink/10 bg-white/35 px-3.5 py-3">
            <StatTile label="Skiers" value={recap.arrivals} />
            <StatTile
              label="Happy"
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

          <p className="pencil mt-3 px-1 text-[1.05rem] text-ink">
            <span className="sr-only">Problem: </span>
            {recap.problem}
          </p>

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
        <div>
          <PlateHeading aside="Tomorrow’s ticket">Fare</PlateHeading>
          <ChoiceTiles
            label="Fare"
            options={fareOptions}
            value={pendingFare}
            onPick={setPendingFare}
          />

          <PlateHeading aside="Crew overnight">Snow &amp; service</PlateHeading>
          <ChoiceTiles
            label="Snow and service"
            options={snowOptions}
            value={pendingSnow}
            onPick={setPendingSnow}
          />

          {nextTalent && (
            <p className="mt-4 text-[0.88rem] text-ink-soft">
              Tomorrow the crew learns{" "}
              <span className="serif font-semibold text-pine">
                {nextTalent}
              </span>
            </p>
          )}
        </div>
      </div>
    </PaperSheet>
  );
}
