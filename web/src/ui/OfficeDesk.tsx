"use client";

import { useMemo, type ReactNode } from "react";
import { lodgeName } from "@/game/assetNames";
import { needsAttention, type AttentionItem } from "@/game/attention";
import { LODGE_TIERS } from "@/game/base";
import { seasonCalendar } from "@/game/calendar";
import { founderById } from "@/game/content";
import { dailyCosts, liquidNetWorth } from "@/game/economy";
import { formatMoney } from "@/game/format";
import { openingStep } from "@/game/rules";
import { SCHOOL_BUS_ARRIVAL_MIN } from "@/game/schoolContract";
import { formatClock } from "@/game/sim";
import { operatingGoalText } from "@/game/winterArc";
import { useSettings } from "./settingsStore";
import { latestRadio } from "@/game/deskRadio";
import { goalChips, goalInputs, operatingDaysLeftLine } from "@/game/goals";
import { useGameStore } from "@/game/store";
import { whiterockBuyoutOffer } from "@/game/caretaker";
import type { WeatherKind } from "@/game/types";
import { outlookFor } from "@/game/weather";
import { Forecast } from "@/ui/NightRecapSheet";
import { closeOffice, setOfficeTab } from "@/ui/officeStore";
import { requestFocus } from "@/ui/placementDraft";
import { CheckIcon, MountainMoonIcon, SnowfallIcon, SunIcon, ThawIcon, WindIcon } from "@/ui/kit/icons";
import { useOffice } from "@/ui/officeStore";
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

function AttentionList({ items, showFocus }: { items: AttentionItem[]; showFocus: boolean }) {
  if (items.length === 0) {
    return <p className="panel px-4 py-3 text-[1rem] font-bold">All quiet on the hill right now.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>
          {item.focus && showFocus ? (
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
  const attention = useMemo(() => {
    const items = needsAttention(state);
    const opening = openingStep(state);
    if (opening === "lift") items.push({ id: "opening", text: "Place your first lift." });
    if (opening === "trail" && !items.some(item => item.id.startsWith("lift-no-trail"))) {
      items.push({ id: "opening", text: "Paint a trail from your lift to the base." });
    }
    const due = dailyCosts(state).draws;
    if (due > 0) items.push({ id: "construction", text: `${formatMoney(due)} in construction payments is due at closing.` });
    if (state.schoolContract?.decision === "accepted" && state.schoolContract.day === state.dayIndex) {
      items.push({
        id: "school",
        text: `The Readsboro school bus arrives at ${formatClock(SCHOOL_BUS_ARRIVAL_MIN)} today. Keep the green trail soft.`,
      });
    }
    return items;
  }, [state]);
  const radioEnabled = useSettings(s => s.radioEnabled);
  const radio = latestRadio(state);
  const chips = goalChips(goalInputs(state));
  const weather = WEATHER[state.weather];
  const hasTomorrow = outlookFor(state, 1) !== null;
  const openBids = (state.careerHills ?? []).filter((h) => h.whiterockBidOpen);
  const decideBid = useGameStore((s) => s.decideWhiterockCaretakerBid);
  const dismissHomecoming = useGameStore((s) => s.dismissHomecomingNotes);

  const founder = founderById(state.founderId);
  const tier = LODGE_TIERS[state.lodgeTier];

  return (
    <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2 md:items-start">
      <div className="flex flex-col gap-0">
        {(state.homecomingNotes.length > 0 || openBids.length > 0) && (
          <>
            <SectionHeading>Homecoming &amp; sister hills</SectionHeading>
            <section className="panel mb-3 space-y-2.5 p-3.5">
              {state.homecomingNotes.map((note) => (
                <p key={note.mountainId} className="text-sm font-bold leading-snug">
                  {note.headline}
                </p>
              ))}
              {openBids.map((bid) => (
                <div key={bid.mountainId} className="chip space-y-2 p-2.5">
                  <p className="text-sm font-extrabold">
                    Sloane bid {formatMoney(whiterockBuyoutOffer(bid.mountainId))} for {bid.caretakerAlly}&apos;s hill.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => decideBid(bid.mountainId, "keep")}
                      className="key key-solid press min-h-10 px-2 text-xs font-extrabold [--key-fill:var(--sign-yellow)]"
                    >
                      Keep hill
                    </button>
                    <button
                      type="button"
                      onClick={() => decideBid(bid.mountainId, "sell")}
                      className="key press min-h-10 px-2 text-xs font-extrabold"
                    >
                      Sell ({formatMoney(whiterockBuyoutOffer(bid.mountainId))})
                    </button>
                  </div>
                </div>
              ))}
              {state.homecomingNotes.length > 0 && openBids.length === 0 && (
                <button
                  type="button"
                  onClick={dismissHomecoming}
                  className="key press min-h-9 px-3 text-xs font-extrabold"
                >
                  File dispatches
                </button>
              )}
            </section>
          </>
        )}

        <SectionHeading>Hill &amp; founder</SectionHeading>
        <section aria-label="Hill and founder" className="panel space-y-2 px-4 py-3">
          {founder && (
            <p className="text-sm font-bold leading-snug">
              <span className="font-extrabold">{founder.name}</span>
              <span className="text-ink-soft"> · {founder.title}</span>
            </p>
          )}
          <p className="text-sm font-extrabold">
            {lodgeName(state)} · Tier {state.lodgeTier}
          </p>
          <p className="text-xs font-bold leading-snug text-ink-soft">
            Cap ~{tier.maxArrivals} skiers · Seating ×{tier.seatMultiplier} · {tier.stalls} parking · {tier.pads} pads
            {state.lodgeUpgrade
              ? ` · Upgrade: ${state.lodgeUpgrade.nightsRemaining} ${state.lodgeUpgrade.nightsRemaining === 1 ? "night" : "nights"} left`
              : ""}
          </p>
          <button
            type="button"
            onClick={() => setOfficeTab("Crew")}
            className="key press mt-1 min-h-11 w-full px-3 text-sm font-extrabold"
          >
            Open talent tree
          </button>
        </section>
        <SectionHeading>Today</SectionHeading>
        <section aria-label="Today" className="panel px-4 py-3">
          <p className="chip inline-flex items-center gap-1.5 px-2.5 py-1 text-[0.85rem] font-extrabold">
            {weather.icon}
            {weather.label}
          </p>
          <p className="mt-2 text-[1.05rem] font-bold leading-snug">{tidy(state.morningHeadline)}</p>
        </section>

        <SectionHeading aside={operatingDaysLeftLine(state, state.outcome !== "playing")}>Winter goal</SectionHeading>
        <p className="panel mb-2 px-4 py-3 text-sm font-bold leading-snug">
          {formatMoney(liquidNetWorth(state))} after outstanding bills. {operatingGoalText(seasonCalendar(state), state.dayHistory)}
        </p>
        <ul aria-label="Winter goal" className="panel divide-y-2 divide-snow-2 px-4">
          {chips.map((chip) => (
            <li key={chip.id} className="flex items-start gap-3 py-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink ${
                  chip.status === "Done" ? "bg-sign-green text-white" : "bg-white"
                }`}
              >
                {chip.status === "Done" && <CheckIcon size={14} />}
              </span>
              <div className="min-w-0">
                <p className="text-[1rem] font-extrabold leading-tight">
                  {chip.label}
                  <span className="sr-only">{`, ${chip.status}`}</span>
                  <span aria-hidden="true" className="ml-2 text-[0.82rem] font-bold text-ink-soft">
                    {chip.status}
                  </span>
                </p>
                <p className="mt-0.5 text-[0.95rem] font-bold leading-snug text-ink-soft">{chip.explainer}</p>
              </div>
            </li>
          ))}
        </ul>

        <SectionHeading>Needs attention</SectionHeading>
        <AttentionList items={attention} showFocus={state.phase === "day"} />
      </div>

      <div className="flex flex-col gap-0">
        <SectionHeading>Tomorrow</SectionHeading>
        <section aria-label="Forecast" className="panel px-4 py-3">
          {hasTomorrow ? (
            <>
              <Forecast state={state} ahead={1} />
              <Forecast state={state} ahead={2} />
            </>
          ) : (
            <p className="text-[1rem] font-bold">Today is the last day of the winter. Last chair is yours to call.</p>
          )}
        </section>

        <SectionHeading>WVTK 100.7, Route 100 Radio</SectionHeading>
        {!radioEnabled ? (
          <p className="panel px-4 py-3 font-bold">Radio is off. Switch it back on from the HUD tuner or Reports.</p>
        ) : radio ? (
          <RadioCard announce={false} title={radio.title}>{tidy(radio.radio)}</RadioCard>
        ) : (
          <p className="panel px-4 py-3 text-[1rem] font-bold">
            WVTK 100.7 signed on this morning. Story dispatches and town rumors appear here after closing.
          </p>
        )}

        <SectionHeading>End of day</SectionHeading>
        <section aria-label="End of day" className="panel flex flex-col gap-2 px-4 py-3">
          <p className="text-[0.95rem] font-bold leading-snug">
            Skip ahead to 4 PM closing. Lift lines, runs, and guest mood simulate normally.
          </p>
          <button
            type="button"
            disabled={openingStep(state) !== null}
            onClick={() => {
              useOffice.setState({ open: false, resumeOnClose: false });
              useGameStore.getState().skipToClose();
            }}
            className="key key-solid press flex min-h-12 items-center justify-center gap-2 text-[1rem] font-extrabold [--key-fill:var(--barn-deep)] [--key-ink:#fff] [--lift:3px]"
          >
            <MountainMoonIcon size={22} />
            Close hill
          </button>
        </section>
      </div>
    </div>
  );
}