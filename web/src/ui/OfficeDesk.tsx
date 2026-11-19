"use client";

import { useMemo, type ReactNode } from "react";
import { needsAttention, type AttentionItem } from "@/game/attention";
import { latestRadio } from "@/game/deskRadio";
import { daysLeftLine, goalChips } from "@/game/goals";
import { useGameStore } from "@/game/store";
import type { WeatherKind } from "@/game/types";
import { outlookFor } from "@/game/weather";
import { Forecast } from "@/ui/NightRecapSheet";
import { closeOffice } from "@/ui/officeStore";
import { requestFocus } from "@/ui/placementDraft";
import { CheckIcon, SnowfallIcon, SunIcon, ThawIcon, WindIcon } from "@/ui/kit/icons";
import { SectionHeading, tidy } from "@/ui/kit/parts";
import { RadioCard } from "@/ui/kit/RadioCard";

const WEATHER: Record<WeatherKind, { label: string; icon: ReactNode }> = {
  snow: { label: "Fresh snow", icon: <SnowfallIcon size={18} /> },
  storm: { label: "Snowstorm", icon: <WindIcon size={18} /> },
  clear: { label: "Clear skies", icon: <SunIcon size={18} /> },
  thaw: { label: "Thaw", icon: <ThawIcon size={18} /> },
};

/** Closes the Office and frames the problem on the hill. */
function showOnHill(item: AttentionItem) {
  if (!item.focus) return;
  closeOffice();
  useGameStore.getState().setFollowId(null);
  requestFocus(item.focus);
}

function AttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return <p className="panel px-4 py-3 text-[1rem] font-bold">Nothing needs you right now.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>
          {item.focus ? (
            <button
              type="button"
              onClick={() => showOnHill(item)}
              className="key press flex min-h-11 w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left [--lift:3px]"
            >
              <span className="text-[1rem] font-extrabold leading-snug">{item.text}</span>
              <span className="text-[0.82rem] font-bold text-ink-soft">Tap to see it on the hill.</span>
            </button>
          ) : (
            <p className="panel px-3.5 py-2.5 text-[1rem] font-extrabold leading-snug">{item.text}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Today's headline, the winter goal, the forecast, what needs attention and the radio. Reads state and changes none. */
export function DeskTab() {
  const state = useGameStore((s) => s);
  const attention = useMemo(() => needsAttention(state), [state]);
  const radio = latestRadio(state);
  const chips = goalChips(state);
  const weather = WEATHER[state.weather];
  const hasTomorrow = outlookFor(state, 1) !== null;

  return (
    <div className="flex flex-col pb-2">
      <SectionHeading>Today</SectionHeading>
      <section aria-label="Today" className="panel px-4 py-3">
        <p className="chip inline-flex items-center gap-1.5 px-2.5 py-1 text-[0.85rem] font-extrabold">
          {weather.icon}
          {weather.label}
        </p>
        <p className="mt-2 text-[1.05rem] font-bold leading-snug">{tidy(state.morningHeadline)}</p>
      </section>

      <SectionHeading aside={daysLeftLine(state.dayIndex, state.seasonLength)}>Winter goal</SectionHeading>
      <ul aria-label="Winter goal" className="panel divide-y-2 divide-snow-2 px-4">
        {chips.map((chip) => (
          <li key={chip.id} className="flex items-start gap-3 py-3">
            <span
              aria-hidden="true"
              className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink ${
                chip.done ? "bg-sign-green text-white" : "bg-white"
              }`}
            >
              {chip.done && <CheckIcon size={14} />}
            </span>
            <div className="min-w-0">
              <p className="text-[1rem] font-extrabold leading-tight">
                {chip.label}
                <span className="sr-only">{chip.done ? ", done" : ", not done"}</span>
                <span aria-hidden="true" className="ml-2 text-[0.82rem] font-bold text-ink-soft">
                  {chip.done ? "Done" : "To do"}
                </span>
              </p>
              <p className="mt-0.5 text-[0.95rem] font-bold leading-snug text-ink-soft">{chip.explainer}</p>
            </div>
          </li>
        ))}
      </ul>

      <SectionHeading>Tomorrow</SectionHeading>
      <section aria-label="Forecast" className="panel px-4 py-3">
        {hasTomorrow ? (
          <>
            <Forecast state={state} ahead={1} />
            <Forecast state={state} ahead={2} />
          </>
        ) : (
          <p className="text-[1rem] font-bold">Today is the last day of the winter.</p>
        )}
      </section>

      <SectionHeading>Needs attention</SectionHeading>
      <AttentionList items={attention} />

      <SectionHeading>Route 100 Radio</SectionHeading>
      {radio ? (
        <RadioCard title={radio.title}>{tidy(radio.radio)}</RadioCard>
      ) : (
        <p className="panel px-4 py-3 text-[1rem] font-bold">
          Maris has not been on the air yet. She will be after the first closing.
        </p>
      )}
    </div>
  );
}
