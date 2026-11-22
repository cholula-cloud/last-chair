import { dayKind, inHolidayWeek, weekdayForDay, type CalendarDef } from "./calendar";
import { formatOperatorText } from "./content";
import { PERSONAS } from "./personas";
import { mix32, STREAM, streamFor } from "./rng";
import { makeGuest } from "./sim";
import type { Guest, WeatherKind } from "./types";

export type SurpriseKind = "pie" | "former_regulars" | "road_delay";

export type SurprisePlan = {
  dayIndex: number;
  kind: SurpriseKind;
  guestIds: string[];
};

export type SurpriseEntry = {
  dayIndex: number;
  kind: SurpriseKind;
  affectedGuests: number;
};

type SurpriseDay = {
  calendar: CalendarDef;
  dayIndex: number;
  seasonSeed: number;
  weather: WeatherKind;
  surpriseLog: readonly SurpriseEntry[];
};

const PIE_CHANCE = 0.02;
const REGULARS_CHANCE = 0.06;
const ROAD_DELAY_CHANCE = 0.08;
const ROAD_REOPENS_MIN = 10 * 60 + 15;
const ROAD_DELAY_MIN = 25;

/** Apply one eligible surprise to this morning's already-drawn roster. */
export function arrangeSurprise(day: SurpriseDay, guests: Guest[]): { guests: Guest[]; surprise: SurprisePlan | null } {
  const { calendar, dayIndex, seasonSeed, weather, surpriseLog } = day;
  if (dayIndex <= 1) return { guests, surprise: null };

  const rng = streamFor(seasonSeed ^ mix32(dayIndex), STREAM.SURPRISE);
  const pieRoll = rng.next();
  const regularsRoll = rng.next();
  const roadRoll = rng.next();
  const unseen = (kind: SurpriseKind) => !surpriseLog.some((entry) => entry.kind === kind);
  if (pieRoll < PIE_CHANCE && unseen("pie")) {
    return { guests, surprise: { dayIndex, kind: "pie", guestIds: [] } };
  }

  const weekday = weekdayForDay(calendar, dayIndex);
  const midweek = (weekday === "Tue" || weekday === "Wed" || weekday === "Thu") &&
    dayKind(calendar, dayIndex) === "weekday" && !inHolidayWeek(calendar, dayIndex);
  if (midweek && regularsRoll < REGULARS_CHANCE && unseen("former_regulars")) {
    const [lo, hi] = PERSONAS.regular.targetRuns;
    const count = 3 + Math.floor(rng.next() * 3);
    const arriveAtMin = 9 * 60 + 15 + Math.floor(rng.next() * 60);
    const returning = Array.from({ length: count }, (_, i) => {
      return makeGuest({
        id: `returning-${seasonSeed}-${dayIndex}-${i}`,
        label: `Returning regular ${i + 1}`,
        state: "pending",
        arriveAtMin,
        stateSinceMin: arriveAtMin,
        mood: 0.7 + rng.next() * 0.2,
        targetRuns: lo + Math.floor(rng.next() * (hi - lo + 1)),
      });
    });
    return {
      guests: [...guests, ...returning].sort((a, b) => a.arriveAtMin - b.arriveAtMin),
      surprise: { dayIndex, kind: "former_regulars", guestIds: returning.map((guest) => guest.id) },
    };
  }

  if (weather !== "thaw" && guests.length >= 2 && roadRoll < ROAD_DELAY_CHANCE && unseen("road_delay")) {
    const delayedCount = Math.max(2, Math.round(guests.length / 4));
    const delayed = guests.slice(0, delayedCount);
    const reopen = Math.max(ROAD_REOPENS_MIN, Math.ceil(delayed[delayed.length - 1].arriveAtMin) + ROAD_DELAY_MIN);
    const delayedIds = new Set(delayed.map((guest) => guest.id));
    return {
      guests: guests.map((guest) => delayedIds.has(guest.id)
        ? { ...guest, arriveAtMin: reopen, stateSinceMin: reopen }
        : guest).sort((a, b) => a.arriveAtMin - b.arriveAtMin),
      surprise: { dayIndex, kind: "road_delay", guestIds: [...delayedIds] },
    };
  }

  return { guests, surprise: null };
}

export function resolveSurprise(plan: SurprisePlan | null, guests: readonly Guest[]): SurpriseEntry | null {
  if (!plan) return null;
  const affectedGuests = guests.filter((guest) => guest.state !== "pending" && plan.guestIds.includes(guest.id)).length;
  if (plan.kind !== "pie" && affectedGuests === 0) return null;
  return { dayIndex: plan.dayIndex, kind: plan.kind, affectedGuests };
}

export function surpriseRadio(entry: SurpriseEntry, operatorName: string | null = null): { title: string; radio: string } {
  const count = entry.affectedGuests;
  const sub = (text: string) => formatOperatorText(text, operatorName);
  switch (entry.kind) {
    case "pie": return {
      title: "Pie on the counter",
      radio: sub("Someone left a warm maple cream pie on the lodge counter with a sticky note: 'For the lifties.' The crew split it before the ink dried."),
    };
    case "former_regulars": return {
      title: "Old tracks, new turns",
      radio: sub(count === 1
        ? "One skier who learned to wedeln here in '76 pulled in before nine. Didn't even ask for a trail map."
        : `${count} skiers who learned to wedeln here in '76 pulled in before nine. None of them needed a trail map.`),
    };
    case "road_delay": return {
      title: "Slow going on Route 100",
      radio: sub(count === 1
        ? "State plow's creeping behind a milk tanker on Route 100. One skier rolled in late once the salt hit."
        : `State plow's creeping behind a milk tanker on Route 100. ${count} skiers rolled in late once the salt hit.`),
    };
  }
}
