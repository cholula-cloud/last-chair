import {
  dayKind,
  inHolidayWeek,
  operatingDayIndex,
  operatingSeasonLength,
  weekdayForDay,
  type CalendarDef,
} from "./calendar";
import { formatOperatorText } from "./content";
import { drawPersona, PERSONAS } from "./personas";
import { mix32, STREAM, streamFor } from "./rng";
import { makeGuest } from "./sim";
import {
  CLUB_BUS_DISCOUNT,
  CLUB_BUS_SKIERS,
  GROOMER_REPAIR_COST,
  type SloaneVisitFacts,
} from "./summitLink";
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
  | "skin_tracks"
  | "sloane_visit"
  | "club_bus"
  | "groomer_down"
  | "last_saturday";

export const THREAT_SURPRISES: ReadonlySet<SurpriseKind> = new Set([
  "road_delay",
  "thaw_ice",
  "january_thaw",
]);

export const DECISION_SURPRISES: ReadonlySet<SurpriseKind> = new Set([
  "club_bus",
  "groomer_down",
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
  "club_bus",
  "groomer_down",
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
  vivianVisit?: SloaneVisitFacts | null;
  reputation?: number;
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
  clubBookingDay?: number | null;
  hasSloaneVisit?: boolean;
};

const PIE_CHANCE = 0.02;
const REGULARS_CHANCE = 0.06;
const ROAD_DELAY_CHANCE = 0.08;
const SNOW_DAY_CHANCE = 0.40;
const ROAD_REOPENS_MIN = 10 * 60 + 15;
const ROAD_DELAY_MIN = 25;
export const SLOANE_SCOUT_ID = "sloane-scout";

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
  if (DECISION_SURPRISES.has(kind)) return 4;
  if (kind === "last_saturday") return 3;
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
    clubBookingDay,
    hasSloaneVisit = false,
  } = day;
  const openDay = operatingDayIndex(calendar, dayIndex);
  if (dayIndex <= 1 || openDay <= 1) return { guests, surprise: null };
  if (schoolBookedDay === dayIndex) return { guests, surprise: null };

  const rng = streamFor(seasonSeed ^ mix32(dayIndex), STREAM.SURPRISE);
  const pieRoll = rng.next();
  const regularsRoll = rng.next();
  const roadRoll = rng.next();
  const snowDayRoll = rng.next();
  const unseen = (kind: SurpriseKind) => !surpriseLog.some((entry) => entry.kind === kind);
  const weekday = weekdayForDay(calendar, dayIndex);
  const openTotal = operatingSeasonLength(calendar);

  // DH13 Last Saturday set piece: reliable finale crowd with holiday guest mix.
  if (weekday === "Sat" && openTotal - openDay <= 1 && unseen("last_saturday")) {
    const shifted = guests.map((guest) => {
      const persona = drawPersona(rng.next(), "holiday");
      const [lo, hi] = PERSONAS[persona].targetRuns;
      return {
        ...guest,
        persona,
        targetRuns: lo + Math.floor(rng.next() * (hi - lo + 1)),
      };
    });
    const bonusCount = 4 + Math.floor(Math.max(0, reputation - 40) / 10);
    const extras = Array.from({ length: bonusCount }, (_, i) => {
      const persona = drawPersona(rng.next(), "holiday");
      const [lo, hi] = PERSONAS[persona].targetRuns;
      const arriveAtMin = 9 * 60 + 15 + Math.floor(rng.next() * 75);
      return makeGuest({
        id: `lastsat-${seasonSeed}-${dayIndex}-${i}`,
        label: `Last Saturday skier ${i + 1}`,
        persona,
        state: "pending",
        arriveAtMin,
        stateSinceMin: arriveAtMin,
        mood: 0.78 + rng.next() * 0.2,
        targetRuns: lo + Math.floor(rng.next() * (hi - lo + 1)),
      });
    });
    return {
      guests: [...shifted, ...extras].sort((a, b) => a.arriveAtMin - b.arriveAtMin),
      surprise: { dayIndex, kind: "last_saturday", guestIds: extras.map((g) => g.id) },
    };
  }

  if (clubBookingDay === dayIndex) return { guests, surprise: null };

  // Pacing cap: at most 2 surprises in any 7 civil days.
  const recent7 = surpriseLog.filter((entry) => dayIndex - entry.dayIndex < 7).length;
  if (recent7 >= 2) return { guests, surprise: null };

  const threatAllowed = !surpriseLog.some(
    (entry) => THREAT_SURPRISES.has(entry.kind) && dayIndex - entry.dayIndex < 5,
  );

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

  // DH10 Grammy Dot calls in: first Sunday with rep >= 60 or Heritage Sign learned.
  if (
    weekdayForDay(calendar, dayIndex) === "Sun" &&
    (reputation >= 60 || TALENT.heritageSign.learned(talentsOwned)) &&
    unseen("dot_call")
  ) {
    return { guests, surprise: { dayIndex, kind: "dot_call", guestIds: [] } };
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

  // DH11 Skin tracks at dawn: morning after snow/storm with Minimal overnight service.
  if (
    (yesterdayWeather === "snow" || yesterdayWeather === "storm") &&
    yesterdaySnow === "minimal" &&
    unseen("skin_tracks")
  ) {
    return { guests, surprise: { dayIndex, kind: "skin_tracks", guestIds: [] } };
  }

  // DH6 Whiterock scout visit: Sat or Sun in Weeks 2-3 once rep >= 40 (below operational/weather beats).
  const inScoutWindow = calendar.openWeekdays?.length
    ? openDay >= 4 && openDay <= (openTotal >= 21 ? 15 : 12)
    : dayIndex >= 8 && dayIndex <= 16;
  if (
    inScoutWindow &&
    (weekday === "Sat" || weekday === "Sun") &&
    reputation >= 40 &&
    !hasSloaneVisit &&
    unseen("sloane_visit")
  ) {
    const arriveAtMin = 10 * 60 + 15;
    const scout = makeGuest({
      id: SLOANE_SCOUT_ID,
      label: "Visitor in a very clean jacket",
      persona: "regular",
      state: "pending",
      arriveAtMin,
      stateSinceMin: arriveAtMin,
      mood: 0.68,
      targetRuns: 4,
    });
    return {
      guests: [...guests, scout].sort((a, b) => a.arriveAtMin - b.arriveAtMin),
      surprise: { dayIndex, kind: "sloane_visit", guestIds: [scout.id] },
    };
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
    case "sloane_visit": {
      const visit = context.vivianVisit;
      const detail = visit
        ? `Timed a ${Math.round(visit.avgWaitMin)}-minute queue, checked snow at ${Math.round(visit.avgSnow * 100)}%,${visit.boughtCocoa ? " bought cocoa," : ""} and tipped ten dollars.`
        : "Walked in wearing spotless boots, timed every bullwheel lap, and vanished by two.";
      return {
        title: "The stranger with the stopwatch",
        radio: sub(`Whiterock scout rode four runs today. ${detail} Told {operator} they will be in touch.`),
      };
    }
    case "club_bus":
      return {
        title: "Bennington Ski Club wants next Saturday",
        radio: sub(`Word got down Route 7 about your zero-wait Saturdays. Bennington Ski Club wants to bring ${CLUB_BUS_SKIERS} skiers next Saturday at $${CLUB_BUS_DISCOUNT} off tickets.`),
      };
    case "groomer_down":
      return {
        title: "Groomer threw a track",
        radio: sub(`Frank called from the barn: Groomer threw a track over on the Windmill side, kid. She'll live, just not tonight. $${GROOMER_REPAIR_COST} borrows the town machine, or tomorrow opens rough.`),
      };
    case "last_saturday": {
      const dotLine = (context.reputation ?? 0) >= 60
        ? " Even Grammy Dot rode the chair up with a thermos."
        : "";
      return {
        title: "Last Saturday of winter",
        radio: sub(`Parking lot filled out to the pines by nine.${dotLine} Half of Readsboro showed up to ski out the winter before the chairs stop.`),
      };
    }
  }
}
