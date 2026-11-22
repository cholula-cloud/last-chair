import { dayKind, inHolidayWeek, operatingDayIndex, weekdayForDay, type CalendarDef } from "./calendar";
import { formatOperatorText } from "./content";
import { drawPersona, PERSONAS } from "./personas";
import { mix32, STREAM, streamFor } from "./rng";
import { makeGuest } from "./sim";
import { TALENT } from "./talents";
import type { DayWeather, FarePreset, Guest, SnowPreset, WeatherKind } from "./types";

export type SurpriseKind =
  | "pie"
  | "former_regulars"
  | "road_delay"
  | "thaw_ice"
  | "snow_day"
  | "january_thaw"
  | "dot_call"
  | "skin_tracks";

export const THREAT_SURPRISES: ReadonlySet<SurpriseKind> = new Set([
  "road_delay",
  "thaw_ice",
  "january_thaw",
]);

export const REVERSAL_SURPRISES: ReadonlySet<SurpriseKind> = new Set([
  "thaw_ice",
  "january_thaw",
]);

const NON_GUEST_SURPRISES: ReadonlySet<SurpriseKind> = new Set([
  "pie",
  "thaw_ice",
  "january_thaw",
  "dot_call",
  "skin_tracks",
]);

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

export type SurpriseRadioContext = {
  fare?: FarePreset;
};

type SurpriseDay = {
  calendar: CalendarDef;
  dayIndex: number;
  seasonSeed: number;
  weather: WeatherKind;
  surpriseLog: readonly SurpriseEntry[];
  weatherDays?: readonly DayWeather[];
  reputation?: number;
  talentsOwned?: readonly string[];
  icyLowerSegments?: number;
  yesterdayWeather?: WeatherKind;
  yesterdaySnow?: SnowPreset;
  schoolBookedDay?: number | null;
};

const PIE_CHANCE = 0.02;
const REGULARS_CHANCE = 0.06;
const ROAD_DELAY_CHANCE = 0.08;
const SNOW_DAY_CHANCE = 0.40;
const ROAD_REOPENS_MIN = 10 * 60 + 15;
const ROAD_DELAY_MIN = 25;

/** Check whether a day sits in a quiet midweek/Friday slot outside holidays. */
function isQuietWeekday(calendar: CalendarDef, dayIndex: number): boolean {
  if (inHolidayWeek(calendar, dayIndex) || dayKind(calendar, dayIndex) === "holiday") return false;
  const weekday = weekdayForDay(calendar, dayIndex);
  if (calendar.openWeekdays?.length) {
    return weekday === "Fri";
  }
  return (weekday === "Tue" || weekday === "Wed" || weekday === "Thu") && dayKind(calendar, dayIndex) === "weekday";
}

/** Priority score for the 1-radio-item-per-night queue. */
export function surprisePriority(kind: SurpriseKind): number {
  return REVERSAL_SURPRISES.has(kind) ? 2 : 0;
}

/** Apply at most one eligible surprise to this morning's already-drawn roster. */
export function arrangeSurprise(day: SurpriseDay, guests: Guest[]): { guests: Guest[]; surprise: SurprisePlan | null } {
  const {
    calendar,
    dayIndex,
    seasonSeed,
    weather,
    surpriseLog,
    weatherDays,
    reputation = 40,
    talentsOwned = [],
    icyLowerSegments = 0,
    yesterdayWeather,
    yesterdaySnow,
    schoolBookedDay,
  } = day;
  if (dayIndex <= 1 || operatingDayIndex(calendar, dayIndex) <= 1) return { guests, surprise: null };
  if (schoolBookedDay === dayIndex) return { guests, surprise: null };

  // Pacing cap: at most 2 surprises in any 7 civil days.
  const recent7 = surpriseLog.filter((entry) => dayIndex - entry.dayIndex < 7).length;
  if (recent7 >= 2) return { guests, surprise: null };

  const threatAllowed = !surpriseLog.some(
    (entry) => THREAT_SURPRISES.has(entry.kind) && dayIndex - entry.dayIndex < 5,
  );

  const rng = streamFor(seasonSeed ^ mix32(dayIndex), STREAM.SURPRISE);
  const pieRoll = rng.next();
  const regularsRoll = rng.next();
  const roadRoll = rng.next();
  const snowDayRoll = rng.next();
  const unseen = (kind: SurpriseKind) => !surpriseLog.some((entry) => entry.kind === kind);

  if (pieRoll < PIE_CHANCE && unseen("pie")) {
    return { guests, surprise: { dayIndex, kind: "pie", guestIds: [] } };
  }

  const quietWeekday = isQuietWeekday(calendar, dayIndex);
  if (quietWeekday && regularsRoll < REGULARS_CHANCE && unseen("former_regulars")) {
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

  // DH5 Snow day: storm on a quiet non-holiday Friday (or legacy Tue-Thu), seeded 40%, holiday guest mix.
  if (quietWeekday && weather === "storm" && snowDayRoll < SNOW_DAY_CHANCE && unseen("snow_day")) {
    const snowDayGuests = guests.map((guest) => {
      const persona = drawPersona(rng.next(), "holiday");
      const [lo, hi] = PERSONAS[persona].targetRuns;
      return {
        ...guest,
        persona,
        targetRuns: lo + Math.floor(rng.next() * (hi - lo + 1)),
      };
    });
    const extraCount = 2 + Math.floor(rng.next() * 3);
    const extras = Array.from({ length: extraCount }, (_, i) => {
      const persona = rng.next() < 0.6 ? "family_pack" : "first_timer";
      const [lo, hi] = PERSONAS[persona].targetRuns;
      const arriveAtMin = 9 * 60 + 30 + Math.floor(rng.next() * 90);
      return makeGuest({
        id: `snowday-${seasonSeed}-${dayIndex}-${i}`,
        label: `Snow day kid ${i + 1}`,
        persona,
        state: "pending",
        arriveAtMin,
        stateSinceMin: arriveAtMin,
        mood: 0.72 + rng.next() * 0.2,
        targetRuns: lo + Math.floor(rng.next() * (hi - lo + 1)),
      });
    });
    const merged = [...snowDayGuests, ...extras].sort((a, b) => a.arriveAtMin - b.arriveAtMin);
    return {
      guests: merged,
      surprise: { dayIndex, kind: "snow_day", guestIds: extras.map((g) => g.id) },
    };
  }

  // DH9 January thaw: forecast run of >= 2 consecutive thaw days starting tomorrow, in/after Week 2.
  const openDay = operatingDayIndex(calendar, dayIndex);
  const week2Reached = calendar.openWeekdays?.length ? openDay >= 4 : dayIndex >= 8;
  const twoThawsAhead = Boolean(
    weatherDays &&
    weatherDays[dayIndex]?.kind === "thaw" &&
    weatherDays[dayIndex + 1]?.kind === "thaw",
  );
  if (threatAllowed && week2Reached && twoThawsAhead && unseen("january_thaw")) {
    return { guests, surprise: { dayIndex, kind: "january_thaw", guestIds: [] } };
  }

  // DH4 Thaw Monday, ice Wednesday: thaw followed by clear leaving >= 2 lower segments icy.
  if (
    threatAllowed &&
    dayIndex >= 3 &&
    weather === "clear" &&
    yesterdayWeather === "thaw" &&
    icyLowerSegments >= 2 &&
    unseen("thaw_ice")
  ) {
    return { guests, surprise: { dayIndex, kind: "thaw_ice", guestIds: [] } };
  }

  // DH3 Slow going on Route 100.
  if (threatAllowed && weather !== "thaw" && guests.length >= 2 && roadRoll < ROAD_DELAY_CHANCE && unseen("road_delay")) {
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

  // DH10 Grammy Dot calls in: first Sunday with rep >= 60 or Heritage Sign learned.
  if (
    weekdayForDay(calendar, dayIndex) === "Sun" &&
    (reputation >= 60 || TALENT.heritageSign.learned(talentsOwned)) &&
    unseen("dot_call")
  ) {
    return { guests, surprise: { dayIndex, kind: "dot_call", guestIds: [] } };
  }

  // DH11 Skin tracks at dawn: morning after snow/storm with Minimal overnight service.
  if (
    (yesterdayWeather === "snow" || yesterdayWeather === "storm") &&
    yesterdaySnow === "minimal" &&
    unseen("skin_tracks")
  ) {
    return { guests, surprise: { dayIndex, kind: "skin_tracks", guestIds: [] } };
  }

  return { guests, surprise: null };
}

export function resolveSurprise(plan: SurprisePlan | null, guests: readonly Guest[]): SurpriseEntry | null {
  if (!plan) return null;
  const affectedGuests = guests.filter((guest) => guest.state !== "pending" && plan.guestIds.includes(guest.id)).length;
  if (!NON_GUEST_SURPRISES.has(plan.kind) && affectedGuests === 0) return null;
  return { dayIndex: plan.dayIndex, kind: plan.kind, affectedGuests };
}

export function surpriseRadio(
  entry: SurpriseEntry,
  operatorName: string | null = null,
  context: SurpriseRadioContext = {},
): { title: string; radio: string } {
  const count = entry.affectedGuests;
  const sub = (text: string) => formatOperatorText(text, operatorName);
  switch (entry.kind) {
    case "pie":
      return {
        title: "Pie on the counter",
        radio: sub("Someone left a warm maple cream pie on the lodge counter with a sticky note: 'For the lifties.' The crew split it before the ink dried."),
      };
    case "former_regulars": {
      const cheapNote = context.fare === "cheap" ? " One tried to pay six dollars 'just like '85.'" : "";
      return {
        title: "Old tracks, new turns",
        radio: sub(
          count === 1
            ? `One skier who learned to wedeln here in '76 pulled in before nine.${cheapNote} Didn't even ask for a trail map.`
            : `${count} skiers who learned to wedeln here in '76 pulled in before nine.${cheapNote} None of them needed a trail map.`,
        ),
      };
    }
    case "road_delay":
      return {
        title: "Slow going on Route 100",
        radio: sub(
          count === 1
            ? "State plow's creeping behind a milk tanker on Route 100. One skier rolled in late once the salt hit."
            : `State plow's creeping behind a milk tanker on Route 100. ${count} skiers rolled in late once the salt hit.`,
        ),
      };
    case "thaw_ice":
      return {
        title: "Thaw Monday, ice Wednesday",
        radio: sub("Thawed yesterday, froze boilerplate by midnight. Route 100 rule of thumb: sharpen your edges or crank the groomer tonight."),
      };
    case "snow_day":
      return {
        title: "Snow day in Readsboro",
        radio: sub("Readsboro called off school. Every kid with a Flexible Flyer and a cousin with a Subaru is pointed up the driveway."),
      };
    case "january_thaw":
      return {
        title: "January thaw incoming",
        radio: sub("Warm air from Jersey is parked over the Green Mountains for a couple days. Watch the lower meadows before they turn to mashed potatoes."),
      };
    case "dot_call":
      return {
        title: "Grammy Dot on line one",
        radio: sub("Caller on line one, says she's your grandmother. 'Hon, Dutch Meadows always glazed over by the J-bar. Your grandfather had a whole vocabulary for that corner.'"),
      };
    case "skin_tracks":
      return {
        title: "Skin tracks at dawn",
        radio: sub("Skin tracks up the Windmill side before the bullwheel turned. Folks kept hiking this hill after '85, and now they ride past a lit lodge."),
      };
  }
}
