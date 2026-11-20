import { BANKRUPTCY_MORNINGS, LOW_CASH } from "./economy";
import { formatMoney } from "./format";
import { demandContext, topGuestDemand } from "./guestsWant";
import { isLiftOperational } from "./lifts";
import { measuredWaitMin, satisfactionContext } from "./rules";
import { daySatisfaction } from "./satisfaction";
import { formatClock } from "./sim";
import { readSnow } from "./snow";
import type { GameState } from "./state";
import { TERRAIN, type XZ } from "./terrain";
import { snowCarriers } from "./trails";
import { FARE_PRICES, LIFT_LABELS } from "./types";
import { isWindHeld, weatherForDay, WIND_HOLD } from "./weather";

/** One thing on the hill that needs the player. */
export type AttentionItem = {
  id: string;
  /** One complete sentence. */
  text: string;
  /** World points to frame when the player taps the item; absent when the problem has no place on the map. */
  focus?: XZ[];
};

/** Guests who must have arrived before a "Guests want" line is trusted. */
export const GUESTS_WANT_MIN_ARRIVALS = 5;

type AttentionState = Pick<
  GameState,
  | "phase" | "cash" | "lifts" | "trails" | "talentsOwned" | "guests" | "dayStats"
  | "fare" | "buildings" | "assets" | "founderId" | "weather" | "weatherDays" | "dayIndex" | "clockMin"
  | "snowQuality" | "mountainId"
>;

const liftLabel = (state: Pick<GameState, "lifts">, i: number) => `${LIFT_LABELS[state.lifts[i].type]} ${i + 1}`;

/**
 * What needs the player right now, most urgent first. Reads live state only and changes nothing.
 * Lift and trail problems come from the same rules the sim runs on, and the "Guests want" line from
 * the same satisfaction terms the closing recap uses.
 */
export function needsAttention(state: AttentionState): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (state.cash < 0) {
    items.push({
      id: "cash-negative",
      text: `Cash is ${formatMoney(state.cash)}. ${BANKRUPTCY_MORNINGS} mornings in a row below zero and the bank closes the book on your winter.`,
    });
  }

  state.lifts.forEach((lift, i) => {
    if (!lift.confirmed || isLiftOperational(lift, i, state.trails)) return;
    items.push({
      id: `lift-no-trail-${i}`,
      text: `${liftLabel(state, i)} has no open trail yet. Paint one from the top so guests have somewhere to go.`,
      focus: [lift.bottom ?? TERRAIN.base, lift.anchor],
    });
  });

  if (state.phase === "day") {
    const wind = weatherForDay(state).wind;
    state.lifts.forEach((lift, i) => {
      if (!isLiftOperational(lift, i, state.trails) || !isWindHeld(lift.type, wind, state.clockMin)) return;
      items.push({
        id: `lift-wind-${i}`,
        text: `${liftLabel(state, i)} is on wind hold until ${formatClock(WIND_HOLD.toMin)}. Dana says nobody is happy and everybody is safe.`,
        focus: [lift.bottom ?? TERRAIN.base, lift.anchor],
      });
    });
  }

  const reading = readSnow(snowCarriers(state.trails));
  const ctx = satisfactionContext(state);
  const arrived = daySatisfaction(state.guests, ctx);
  const demand = arrived.guests >= GUESTS_WANT_MIN_ARRIVALS
    ? topGuestDemand(
        {
          breakdown: arrived.breakdown,
          facts: {
            avgWaitMin: measuredWaitMin(state as GameState),
            snowQuality: state.snowQuality,
            snowLabel: reading.label,
            farePrice: FARE_PRICES[state.fare],
            hillValue: arrived.hillValue,
            runsPerGuest: state.dayStats.runsPerGuest,
            turnedAway: state.dayStats.turnedAway,
            arrivalMood: ctx.arrivalMood,
            busiestLift: busiestLiftToday(state),
          },
        },
        demandContext(state),
      )
    : null;
  const want = demand?.line ?? null;
  const wantIsSnow = demand?.key === "snow";

  if (reading.tone === "bad" && !wantIsSnow) {
    items.push({ id: "snow", text: `${reading.trouble}. Pick more snow and service tonight at closing.` });
  }

  if (want) items.push({ id: "guests-want", text: want });

  if (state.cash >= 0 && state.cash < LOW_CASH) {
    items.push({
      id: "cash-low",
      text: `Cash is down to ${formatMoney(state.cash)}. Hold off on building until the ticket window catches up.`,
    });
  }

  return items;
}

function busiestLiftToday(state: Pick<GameState, "lifts" | "dayStats">): { label: string; min: number } | undefined {
  let best: { label: string; min: number } | undefined;
  state.dayStats.byLift.forEach((record, i) => {
    const lift = state.lifts[i];
    const min = record.rides ? record.waitSumMin / record.rides : 0;
    if (lift && min > (best?.min ?? 0)) best = { label: liftLabel(state, i), min };
  });
  return best;
}
