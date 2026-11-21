import { TALENT } from "./talents";
import { TALENT_PICK_ORDER } from "./talentProgress";
import type { OperatingCosts } from "./economy";
import { calendarForSeason, dayKind, inHolidayWeek, guestMixForDay, type GuestMix, weekdayForDay, type CalendarDef } from "./calendar";
import { TERRAIN } from "./terrain";
import { isWindHeld, morningWeatherHeadline, windHoldWindow } from "./weather";
import {
  ASSET_CATALOG,
  assetEffect,
  hasCafeForArrivals,
  isRefuelHospitality,
  LODGE_TIERS,
  REFUEL_HOSPITALITY_IDS,
  type AssetId,
  type LodgeTier,
  type PlacedAsset,
} from "./base";
import { CREW_TALENTS, STORY_BEATS, founderById } from "./content";
import { PERSONAS, drawPersona, personaShare, skiMinutes } from "./personas";
import { chooseLift, lapOverheadForLift, liftLoadingClosesAt, liftWaitMin } from "./lifts";
import { SCHOOL_BUS_ARRIVAL_MIN } from "./schoolContract";
import { SUMMIT_LINK_MIN_REPUTATION, summitLinkFirstDay, type SummitLinkDecision } from "./summitLink";
import { runEnergyCost, runSkiMinutes } from "./trails";
import { pickSkiRoute } from "./trailNetwork";
import {
  remoteTrailEndThreshold,
  walkDurationMin,
  walkToBasePath,
  walkToLiftPath,
} from "./walkPaths";
import type { LiftSlot } from "./state";
import type { TrailRun } from "./trails";
import {
  deriveSnow,
  experiencedSnow,
  gunReach,
  overnightTrail,
  type Trail,
} from "./snow";
import {
  expectedHillValue,
  NO_SKIERS_PROBLEM,
  problemLine,
  type DaySatisfaction,
  type SatTerms,
} from "./satisfaction";
import {
  ARRIVAL_EARLIEST_MIN,
  ARRIVAL_EARLY_LATEST_MIN,
  ARRIVAL_EARLY_PEAK_MIN,
  ARRIVAL_EARLY_SHARE,
  ARRIVAL_LATEST_MIN,
  ARRIVAL_PEAK_MIN,
  ARRIVE_WALK_MIN,
  DEPART_WALK_MIN,
  DAY_END_MIN,
  DAY_START_MIN,
  FARE_PRICES,
  SEASON_LENGTH,
  snowNightCost,
  type BuildingId,
  type DayStats,
  type DayWeather,
  type FarePreset,
  type FounderId,
  type Guest,
  type SkiLeg,
  type SnowPreset,
  type StoryBeatId,
  type WeatherKind,
  type Wind,
} from "./types";

export function formatClock(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function weekdayLabel(dayIndex: number, seasonLength = 28): string {
  return weekdayForDay(calendarForSeason("dutch_hill", seasonLength), dayIndex);
}

export function isWeekend(dayIndex: number, seasonLength = 28): boolean {
  const weekday = weekdayForDay(calendarForSeason("dutch_hill", seasonLength), dayIndex);
  return weekday === "Sat" || weekday === "Sun";
}

export type Rand = () => number;

/**
 * Arrival minute: a mix of early birds (triangle 08:00–10:00, peak 09:00) and the main
 * crowd (triangle 08:00–13:30, peak 09:30). First guests arrive about 08:00, about a
 * fifth are in by 09:00, the peak is mid-morning, the tail runs to 13:30.
 */
export function drawArrivalMin(rand: Rand): number {
  return rand() < ARRIVAL_EARLY_SHARE
    ? triangular(rand, ARRIVAL_EARLIEST_MIN, ARRIVAL_EARLY_LATEST_MIN, ARRIVAL_EARLY_PEAK_MIN)
    : triangular(rand, ARRIVAL_EARLIEST_MIN, ARRIVAL_LATEST_MIN, ARRIVAL_PEAK_MIN);
}

function triangular(rand: Rand, a: number, b: number, c: number): number {
  const u = rand();
  const split = (c - a) / (b - a);
  return u < split
    ? a + Math.sqrt(u * (b - a) * (c - a))
    : b - Math.sqrt((1 - u) * (b - a) * (b - c));
}

/** A guest at the car park door with the given persona; `over` overrides any field (tests, migration). */
export function makeGuest(over: Partial<Guest> = {}): Guest {
  const persona = over.persona ?? "regular";
  const def = PERSONAS[persona];
  return {
    id: "g",
    label: "Guest",
    state: "arrive",
    progress: 0,
    mood: 0.8,
    persona,
    energy: def.startEnergy,
    runs: 0,
    targetRuns: def.targetRuns[1],
    waitMin: 0,
    waitCount: 0,
    snowSum: 0,
    arriveAtMin: DAY_START_MIN,
    stateSinceMin: DAY_START_MIN,
    ...over,
  };
}

/**
 * The whole day's roster, all "pending", sorted by arrival time. Persona, target
 * runs and arrival minute are drawn per guest from `rand`.
 */
export function createInitialGuests(
  count: number,
  rand: Rand = Math.random,
  mix: GuestMix | boolean = "weekday",
): Guest[] {
  const seed = daySeed(rand);
  const drawn = Array.from({ length: count }, (_, i) => {
    const persona = drawPersona(rand(), mix);
    const [lo, hi] = PERSONAS[persona].targetRuns;
    const targetRuns = lo + Math.floor(rand() * (hi - lo + 1));
    const arriveAtMin = drawArrivalMin(rand);
    const mood = 0.7 + rand() * 0.2;
    return { i, persona, targetRuns, arriveAtMin, mood };
  });
  drawn.sort((x, y) => x.arriveAtMin - y.arriveAtMin);
  return drawn.map((d, rank) =>
    makeGuest({
      id: `g-${seed}-${d.i}`,
      label: `${PERSONAS[d.persona].label} ${rank + 1}`,
      state: "pending",
      mood: d.mood,
      persona: d.persona,
      targetRuns: d.targetRuns,
      arriveAtMin: d.arriveAtMin,
      stateSinceMin: d.arriveAtMin,
    }),
  );
}

function daySeed(rand: Rand): string {
  return rand().toString(36).slice(2, 7);
}

export function schoolBusGuests(day: number, pupils: number): Guest[] {
  return Array.from({ length: pupils }, (_, i) => makeGuest({
    id: `school-${day}-${i}`,
    label: `Readsboro pupil ${i + 1}`,
    persona: i % 3 === 2 ? "race_kid" : "first_timer",
    schoolPupil: true,
    state: "pending",
    arriveAtMin: SCHOOL_BUS_ARRIVAL_MIN,
    stateSinceMin: SCHOOL_BUS_ARRIVAL_MIN,
  }));
}

/** Guests on the hill: walking in, in a line, on a lift or skiing. */
export function isOnHill(g: Guest): boolean {
  return g.state === "arrive" || g.state === "refuel" || g.state === "queue" || g.state === "ride" || g.state === "ski" || g.state === "walk_lift" || g.state === "walk_out";
}

export type GuestClock = {
  /** Game clock minute at the end of this step. */
  now: number;
  wind?: Wind;
  snowQuality: number;
  /** Experienced snow per trail index; falls back to `snowQuality`. */
  snowByTrail?: number[];
  trails: readonly TrailRun[];
  lifts: readonly LiftSlot[];
  talentsOwned: string[];
  /** Expected wait plus ride at the best open lift (fallback lap time). */
  lapOverheadMin: number;
  assets?: readonly PlacedAsset[];
  onTrailUse?: (leg: SkiLeg, firstUseThisRun: boolean) => void;
};

function skiLegConditions(clock: GuestClock, leg: SkiLeg) {
  const trail = clock.trails[leg.trailIndex];
  if (!trail) return { lengthFt: 0, quality: clock.snowQuality };
  const whole = leg.from === 0 && leg.to === 1;
  const quality = whole ? clock.snowByTrail?.[leg.trailIndex] ?? clock.snowQuality : experiencedSnow(
    trail.snow.slice(Math.floor(leg.from * trail.snow.length), Math.ceil(leg.to * trail.snow.length)),
  );
  return { lengthFt: trail.lengthFt * (leg.to - leg.from), difficulty: trail.difficulty, quality };
}

function skiLegMinutes(clock: GuestClock, persona: Guest["persona"], leg: SkiLeg) {
  const { lengthFt, difficulty, quality } = skiLegConditions(clock, leg);
  return difficulty ? runSkiMinutes(persona, { lengthFt, difficulty }, quality) : skiMinutes(persona, quality);
}

/**
 * Advance guests that move on their own clock: pending guests arrive on their
 * minute, arrivals walk to the line, skiers finish runs, departers walk to the
 * car park. Queueing and riding belong to the lifts (`stepLifts`). Each timed
 * state's `progress` is elapsed / duration. At the bottom of a run the guest
 * goes home if tired, if they have done their runs, or if another lap cannot
 * finish before the lifts close; otherwise they queue again. Lifts stop
 * loading at LIFT_CLOSE_MIN, so anyone still in a line goes home.
 */
export function tickGuests(guests: Guest[], clock: GuestClock): Guest[] {
  const { now } = clock;
  const closeMin = liftLoadingClosesAt(clock.talentsOwned);
  const hold = windHoldWindow(clock.talentsOwned);
  const goHome = (g: Guest, over: Partial<Guest> = {}): Guest => {
    // Sent home from a line: the wait so far counts as a completed wait.
    const left =
      g.state === "queue" && g.joinedQueueAtMin !== undefined
        ? { waitMin: g.waitMin + (now - g.joinedQueueAtMin), waitCount: g.waitCount + 1 }
        : {};
    return { ...g, ...left, ...over, state: "depart", progress: 0, stateSinceMin: now };
  };
  /** Back in line: the next wait starts when stepLifts seats the guest in a lift queue. */
  const joinLine = (g: Guest, over: Partial<Guest> = {}): Guest => {
    const next: Guest = { ...g, ...over, state: "queue", progress: 0 };
    delete next.joinedQueueAtMin;
    delete next.trailIndex;
    return next;
  };

  const assets = clock.assets ?? [];
  const occupied = assets.map(() => 0);
  for (const guest of guests) {
    if (guest.state === "refuel" && guest.venueIndex != null &&
        now - guest.stateSinceMin < (guest.visitMinutes ?? 20)) occupied[guest.venueIndex]++;
  }
  const visit = (guest: Guest, ids: readonly AssetId[], balk = false): Guest | null => {
    if (now >= closeMin) return null;
    const index = ids.flatMap((id) => assets.map((asset, i) => asset.id === id ? i : -1)).find((i) =>
      i >= 0 && occupied[i] < Math.floor(assetEffect(assets[i], "seats")));
    if (index === undefined) return null;
    const id = assets[index].id;
    occupied[index]++;
    return {
      ...guest, state: "refuel", progress: 0, stateSinceMin: now, venueIndex: index,
      visitMinutes: balk ? 15 : ASSET_CATALOG[id].visitMinutes,
      ...(id === "rentals" ? { rented: true } : id === "ski_school" ? { lesson: true }
        : balk ? { balks: (guest.balks ?? 0) + 1 } : { refuelled: true }),
    };
  };
  const chooseQueue = (guest: Guest): Guest => {
    if (now >= closeMin) return goHome(guest);
    const index = chooseLift(clock.lifts, clock.talentsOwned, clock.trails, guest, clock.wind, now);
    if (index < 0) {
      const reopensLater = clock.wind === "gusty" && chooseLift(clock.lifts, clock.talentsOwned, clock.trails) >= 0;
      return reopensLater ? { ...joinLine(guest), joinedQueueAtMin: now } : goHome(guest);
    }
    if ((guest.balks ?? 0) < 2 && liftWaitMin(clock.lifts[index], clock.talentsOwned) > 12) {
      const stop = visit(guest, [...REFUEL_HOSPITALITY_IDS], true);
      if (stop) return stop;
    }
    return joinLine(guest);
  };
  const beginnerService = (guest: Guest): Guest | null => {
    if (guest.schoolPupil && !guest.lesson) return visit(guest, ["ski_school"]);
    if (guest.persona === "race_kid") return !guest.lesson ? visit(guest, ["ski_school"]) : null;
    if (guest.persona === "family_pack") return !guest.rented ? visit(guest, ["rentals"]) : null;
    if (guest.persona !== "first_timer") return null;
    return (!guest.rented ? visit(guest, ["rentals"]) : null) ??
      (!guest.lesson ? visit(guest, ["ski_school"]) : null);
  };
  return guests.map((g) => {
    switch (g.state) {
      case "pending":
        return now >= g.arriveAtMin
          ? { ...g, state: "arrive", progress: 0, stateSinceMin: now }
          : g;
      case "arrive": {
        const progress = (now - g.stateSinceMin) / ARRIVE_WALK_MIN;
        if (progress < 1) return { ...g, progress };
        return now >= closeMin ? goHome(g) : beginnerService(g) ?? chooseQueue(g);
      }
      case "refuel": {
        if (now >= closeMin) return goHome(g);
        const progress = (now - g.stateSinceMin) / (g.visitMinutes ?? 20);
        if (progress < 1) return { ...g, progress };
        const asset = assets[g.venueIndex ?? -1];
        const returning = {
          ...g,
          ...(asset?.id === "ski_school" ? { schoolLessonCompleted: true } : {}),
          energy: asset && isRefuelHospitality(asset.id) && g.visitMinutes !== 15
            ? Math.min(1, g.energy + 0.35 * (asset.attachPad == null ? 1 : 1.05)) : g.energy,
        };
        return (g.runs === 0 && beginnerService(returning)) || chooseQueue(returning);
      }
      case "queue": {
        if (now >= closeMin) return goHome(g);
        const waited = g.joinedQueueAtMin == null ? 0 : now - g.joinedQueueAtMin;
        if (waited > 12 && (g.balks ?? 0) < 2) {
          const next = visit({
            ...g, waitMin: g.waitMin + waited, waitCount: g.waitCount + 1, joinedQueueAtMin: undefined,
          }, [...REFUEL_HOSPITALITY_IDS], true);
          if (next) return next;
        }
        return g;
      }
      case "walk_lift":
      case "walk_out": {
        const trailPath = clock.trails[g.trailIndex ?? -1]?.path;
        const lift = g.state === "walk_lift" ? clock.lifts[g.liftIndex ?? -1] : undefined;
        const to = lift?.bottom ?? TERRAIN.base;
        const path = g.state === "walk_lift"
          ? walkToLiftPath(trailPath, to)
          : walkToBasePath(trailPath, to);
        const duration = walkDurationMin(path, TERRAIN);
        const progress = (now - g.stateSinceMin) / duration;
        if (progress < 1) return { ...g, progress };
        if (g.state === "walk_out" || now >= closeMin) return goHome(g);
        if (lift && isWindHeld(lift.type, clock.wind ?? "calm", now, clock.talentsOwned)) {
          return { ...g, progress: 1, joinedQueueAtMin: g.joinedQueueAtMin ?? now };
        }
        return { ...joinLine(g), trailIndex: g.trailIndex, joinedQueueAtMin: g.joinedQueueAtMin };
      }
      case "ski": {
        const route = g.skiRoute;
        let current = route?.current ?? 0;
        let leg = route?.legs[current] ?? { trailIndex: g.trailIndex ?? g.liftIndex ?? 0, from: 0, to: 1 };
        let startedAt = g.stateSinceMin;
        let snowFt = route?.snowFt ?? 0;
        let distanceFt = route?.distanceFt ?? 0;
        let duration: number;
        let quality: number;
        for (;;) {
          const conditions = skiLegConditions(clock, leg);
          quality = conditions.quality;
          duration = conditions.difficulty
            ? runSkiMinutes(g.persona, conditions, quality)
            : skiMinutes(g.persona, quality);
          const progress = duration > 0 ? (now - startedAt) / duration : 1;
          if (progress < 1) {
            if (!route || current === route.current) return { ...g, progress };
            return {
              ...g, trailIndex: leg.trailIndex, stateSinceMin: startedAt, progress,
              skiRoute: { legs: route.legs, current, snowFt, distanceFt },
            };
          }
          const firstUse = !route?.legs.slice(0, current).some((earlier) => earlier.trailIndex === leg.trailIndex);
          clock.onTrailUse?.(leg, firstUse);
          snowFt += quality * conditions.lengthFt;
          distanceFt += conditions.lengthFt;
          const next = route?.legs[current + 1];
          if (!next) break;
          current++;
          startedAt += duration;
          leg = next;
        }
        const trail = clock.trails[leg.trailIndex];
        const skier = route ? { ...g, trailIndex: leg.trailIndex } : g;
        if (route) delete skier.skiRoute;
        const runs = g.runs + 1;
        const energy = g.energy - runEnergyCost(g.persona, route ? { lengthFt: distanceFt } : trail);
        const done = { runs, energy, snowSum: g.snowSum + (route && distanceFt > 0 ? snowFt / distanceFt : quality) };
        const returning = { ...g, runs };
        const openLift = chooseLift(clock.lifts, clock.talentsOwned, clock.trails, returning, clock.wind, now);
        const allHeld = openLift < 0 && clock.wind === "gusty" && now >= hold.fromMin && now < hold.toMin;
        const li = allHeld
          ? chooseLift(clock.lifts, clock.talentsOwned, clock.trails, returning, clock.wind, hold.toMin)
          : openLift;
        const lapOverhead =
          clock.lifts[li]?.confirmed
            ? lapOverheadForLift(clock.lifts, clock.talentsOwned, li)
            : clock.lapOverheadMin;
        const nextRoute = li < 0 ? [] : pickSkiRoute(g.persona, clock.trails, li, g.id, runs);
        const nextRun = nextRoute.length ? nextRoute.reduce((sum, part) => sum + skiLegMinutes(clock, g.persona, part), 0) : duration;
        const lapEnds = now + lapOverhead + nextRun;
        const end = trail?.path.at(-1);
        const destination = clock.lifts[li]?.bottom ?? TERRAIN.base;
        const remoteThreshold = remoteTrailEndThreshold(TERRAIN);
        const remote = !!end && Math.hypot(end.x - destination.x, end.z - destination.z) > remoteThreshold;
        const walkingMin = end
          ? walkDurationMin(walkToLiftPath(trail?.path, destination), TERRAIN)
          : 0;
        if (!remote && !allHeld && energy < (g.persona === "family_pack" ? 0.65 : 0.4) && !g.refuelled && runs < g.targetRuns && lapEnds + 20 <= closeMin) {
          const stop = visit({ ...skier, ...done }, [...REFUEL_HOSPITALITY_IDS]);
          if (stop) return stop;
        }
        const waitForHold = allHeld ? Math.max(0, hold.toMin - now - walkingMin) : 0;
        if (energy <= 1e-9 || runs >= g.targetRuns || lapEnds + walkingMin + waitForHold > closeMin || li < 0) {
          const away = end && Math.hypot(end.x - TERRAIN.base.x, end.z - TERRAIN.base.z) > remoteThreshold;
          return away ? { ...skier, ...done, state: "walk_out", progress: 0, stateSinceMin: now } : goHome(skier, done);
        }
        if (remote || allHeld) {
          return { ...skier, ...done, state: "walk_lift", liftIndex: li, progress: 0, stateSinceMin: now, joinedQueueAtMin: undefined };
        }
        return chooseQueue({ ...skier, ...done });
      }
      case "depart": {
        const progress = (now - g.stateSinceMin) / DEPART_WALK_MIN;
        return progress >= 1 ? { ...g, state: "gone", progress: 0 } : { ...g, progress };
      }
      default:
        return g;
    }
  });
}

export function computeDayRevenue(
  fare: FarePreset,
  satisfaction: number,
  arrivals: number,
): number {
  const mult = 0.5 + (satisfaction / 100) * 0.7;
  return Math.round(arrivals * FARE_PRICES[fare] * mult);
}

/** The real numbers behind the breakdown, so "Why?" can quote them. */
export type RecapFacts = {
  /** Mean measured wait per ride, game minutes. */
  avgWaitMin: number;
  /** Number of completed waits behind the mean, absent in older recaps. */
  dispatched?: number;
  /** Hill-wide mean snow quality at close, 0–1. */
  snowQuality: number;
  /** The conditions board word for the worst segment at close ("Good cover", "Icy bottom"). */
  snowLabel: string;
  /** Ticket price the day ran at, dollars. */
  farePrice: number;
  /** Mean dollars a day here was worth to the guests (see `guestHillValue`). */
  hillValue: number;
  runsPerGuest: number;
  turnedAway: number;
  /** Mood on arrival, 0–1. */
  arrivalMood: number;
  venueRevenue?: DayStats["venueRevenue"];
  balked?: number;
  busiestLift?: { label: string; min: number };
  schoolBus?: { invited: number; arrived: number; taught: number; ticketRevenue: number };
};

export type NightRecap = {
  arrivals: number;
  /** Mean guest satisfaction, 0–100. */
  satisfaction: number;
  /** Mean signed points of each satisfaction term over the guests who arrived. */
  breakdown: SatTerms;
  cashDelta: number;
  /** Null when the operating costs were not recorded in a legacy save. */
  costs: OperatingCosts | null;
  revenue: number | null;
  loanReceived: number;
  loanRepaid: number;
  summitLinkReply?: SummitLinkDecision;
  problem: string;
  facts: RecapFacts;
};

export function buildNightRecap(opts: {
  stats: DayStats;
  fare: FarePreset;
  snowQuality: number;
  snowTrouble?: string;
  /** Conditions board word for the worst segment at close. */
  snowLabel?: string;
  /** The day's guest-built satisfaction (see `daySatisfaction`). */
  day: DaySatisfaction;
  arrivalMood: number;
  costs: OperatingCosts;
  busiestLift?: RecapFacts["busiestLift"];
  schoolBus?: RecapFacts["schoolBus"];
}): NightRecap {
  const { stats, fare, day, schoolBus } = opts;
  const revenue = computeDayRevenue(fare, day.score, stats.arrivals - (schoolBus?.arrived ?? 0))
    + (schoolBus?.ticketRevenue ?? 0)
    + Object.values(stats.venueRevenue ?? {}).reduce((sum, amount) => sum + amount, 0);
  const { costs } = opts;
  const cashDelta = Math.round(revenue - costs.fixed - costs.founder - costs.liftOps - costs.upkeep);
  return {
    arrivals: stats.arrivals,
    satisfaction: day.score,
    breakdown: day.breakdown,
    cashDelta,
    costs,
    revenue,
    loanReceived: 0,
    loanRepaid: 0,
    problem: stats.arrivals === 0 ? NO_SKIERS_PROBLEM : problemLine(day.breakdown, {
      avgWaitMin: stats.avgQueueMin,
      dispatched: stats.dispatched,
      snowQuality: opts.snowQuality,
      snowTrouble: opts.snowTrouble,
      fare,
      turnedAway: stats.turnedAway,
      runsPerGuest: stats.runsPerGuest,
      arrivalMood: opts.arrivalMood,
      cashDelta,
    }),
    facts: {
      avgWaitMin: stats.avgQueueMin,
      dispatched: stats.dispatched,
      snowQuality: opts.snowQuality,
      snowLabel: opts.snowLabel ?? "Good cover",
      farePrice: FARE_PRICES[fare],
      hillValue: day.hillValue,
      runsPerGuest: stats.runsPerGuest,
      turnedAway: stats.turnedAway,
      arrivalMood: opts.arrivalMood,
      ...(Object.keys(stats.venueRevenue ?? {}).length ? { venueRevenue: stats.venueRevenue } : {}),
      ...(stats.balked ? { balked: stats.balked } : {}),
      ...(opts.busiestLift ? { busiestLift: opts.busiestLift } : {}),
      ...(schoolBus ? { schoolBus } : {}),
    },
  };
}

export type OvernightResult = {
  /** One trail per input trail, after the player's night and the morning weather. */
  trails: Trail[];
  /** Derived: means over `trails`. */
  snowQuality: number;
  snowDepth: number;
  cash: number;
  groomVisible: boolean;
  gunCoverage?: readonly boolean[][];
  groomCoverage?: readonly boolean[][];
  gunsFired: boolean;
  /** Fraction of the trail from the bottom the guns covered (0 when not fired). */
  gunReach: number;
  weather: WeatherKind;
  morningHeadline: string;
  talentLearned: string | null;
  nextTalentHint: string | null;
  crewPointsEarned: number;
  daysWithoutSnow: number;
};

export function applyOvernight(opts: {
  snow: SnowPreset;
  cash: number;
  trails: Trail[];
  trailElevations?: readonly (readonly number[])[];
  openTrails?: readonly boolean[];
  gunCoverage?: readonly boolean[][];
  groomCoverage?: readonly boolean[][];
  exposure?: readonly (readonly number[])[];
  hasPlacedGuns?: boolean;
  weatherTomorrow: DayWeather;
  buildings: BuildingId[];
  talentsOwned: string[];
  daysWithoutSnow: number;
  hasMaintenanceGarage?: boolean;
}): OvernightResult {
  const hasGuns = opts.hasPlacedGuns === true;
  const hasTrailGuns = TALENT.trailGuns.learned(opts.talentsOwned);
  const hasGarage = opts.hasMaintenanceGarage !== false;
  const hasGroom = hasGarage && TALENT.groomPass.learned(opts.talentsOwned);

  const { kind: weather } = opts.weatherTomorrow;
  const night = { snow: opts.snow, weather, hasGuns, hasTrailGuns, hasGroom,
    corduroy: TALENT.corduroy.learned(opts.talentsOwned), snowFences: TALENT.snowFences.learned(opts.talentsOwned) };
  const gunCoverage = opts.gunCoverage?.map((coverage) =>
    opts.snow === "minimal" ? coverage.map(() => false) : coverage);
  const reach = gunCoverage ? 0 : gunReach(night);
  const trails = opts.trails.map((t, i) => opts.openTrails?.[i] === false ? t :
    overnightTrail(t, night, opts.trailElevations?.[i], gunCoverage?.[i], opts.groomCoverage?.[i], opts.exposure?.[i]));
  const groomVisible = opts.groomCoverage ? opts.groomCoverage.some((row) => row.some(Boolean)) : opts.snow !== "minimal";
  const gunsFired = gunCoverage ? gunCoverage.some((row) => row.some(Boolean)) : reach > 0;
  const daysWithoutSnow = weather === "snow" || weather === "storm" ? 0 : opts.daysWithoutSnow + 1;

  const nextHint = nextTalentName(opts.talentsOwned);

  return {
    trails,
    ...deriveSnow(trails.map((trail, i) => ({ confirmed: opts.openTrails?.[i] !== false, trail }))),
    cash: opts.cash - snowNightCost(opts.snow, opts.talentsOwned, hasGarage),
    groomVisible,
    gunCoverage,
    groomCoverage: opts.groomCoverage,
    gunsFired,
    gunReach: reach,
    weather,
    morningHeadline: morningWeatherHeadline(weather),
    talentLearned: null,
    nextTalentHint: nextHint,
    crewPointsEarned: 1,
    daysWithoutSnow,
  };
}

export function nextTalentName(owned: string[]): string | null {
  const nextId = TALENT_PICK_ORDER.find((id) => !owned.includes(id));
  if (!nextId) return null;
  return CREW_TALENTS.find((t) => t.id === nextId)?.name ?? null;
}

/**
 * Fare elasticity (see SIMULATION_SPEC, Arrivals). A persona's demand is
 * `1 + ELASTICITY × valueWeight × (expectedValue / fare − REF_RATIO)`, clamped,
 * and the day's multiplier is the mean over the persona mix.
 */
export const DEMAND = {
  ELASTICITY: 0.8,
  /** Value-to-fare ratio at which demand is unchanged: Balanced at the starting reputation (40) with no venues. */
  REF_RATIO: 39 / 48,
  MIN_MULT: 0.75,
  MAX_MULT: 1.3,
  /** Reputation of a new hill. */
  START_REPUTATION: 40,
} as const;

/** Demand multiplier from the fare against what the town expects a day here to be worth. */
export function fareDemandMultiplier(
  fare: FarePreset,
  expectedValue: number,
  mix: GuestMix | boolean,
): number {
  const ratio = expectedValue / FARE_PRICES[fare];
  let mult = 0;
  for (const p of Object.values(PERSONAS)) {
    const share = personaShare(p, mix);
    const m = 1 + DEMAND.ELASTICITY * p.valueWeight * (ratio - DEMAND.REF_RATIO);
    mult += share * Math.max(DEMAND.MIN_MULT, Math.min(DEMAND.MAX_MULT, m));
  }
  return Math.max(DEMAND.MIN_MULT, Math.min(DEMAND.MAX_MULT, mult));
}

export type ArrivalInputs = {
  calendar?: CalendarDef;
  seasonLength?: number;
  dayIndex: number;
  fare: FarePreset;
  snowQuality: number;
  weather: WeatherKind;
  buildings: BuildingId[];
  assets?: readonly PlacedAsset[];
  lodgeTier?: LodgeTier;
  talentsOwned: string[];
  founderId: FounderId | null;
  /** Word of mouth, 0–100. Defaults to a new hill's. */
  reputation?: number;
};

function arrivalCount(opts: ArrivalInputs, noise: number): number {
  const calendar = opts.calendar ?? calendarForSeason("dutch_hill", opts.seasonLength ?? 28);
  const kind = dayKind(calendar, opts.dayIndex);
  const weekend = kind !== "weekday";
  let base = weekend ? 28 : 22;
  base += noise;
  if (weekend) base = Math.round(base * 1.3);
  else if (inHolidayWeek(calendar, opts.dayIndex)) base = Math.round(base * 1.15);
  const expected = expectedHillValue(opts.reputation ?? DEMAND.START_REPUTATION, opts.buildings, opts.talentsOwned);
  base = Math.round(base * fareDemandMultiplier(opts.fare, expected, guestMixForDay(calendar, opts.dayIndex)));
  if (opts.weather === "snow") base += 3;
  if (opts.weather === "storm") base -= TALENT.earlyPlow.learned(opts.talentsOwned) ? TALENT.earlyPlow.stormPenalty : 5;
  if (opts.weather === "thaw") base -= 4;
  if (opts.snowQuality < 0.4) base -= 3;
  if (hasCafeForArrivals(opts.buildings, opts.assets ?? [])) base += 1;
  if (TALENT.ticketBooth.learned(opts.talentsOwned) && weekend) base += TALENT.ticketBooth.visitors;
  if (TALENT.schoolDay.learned(opts.talentsOwned) && !weekend) base += TALENT.schoolDay.visitors;
  const founder = founderById(opts.founderId);
  if (founder) base += Math.round(founder.arrivalMoodBonus * 20);
  const tier = opts.lodgeTier ?? 1;
  const cap = LODGE_TIERS[tier].maxArrivals;
  return Math.max(12, Math.min(cap, base));
}

/** Honest next-day arrivals (fare against reputation, weather, buildings, founder). */
export function planArrivals(opts: ArrivalInputs & { rand?: Rand }): number {
  const rand = opts.rand ?? Math.random;
  return arrivalCount(opts, Math.floor(rand() * 5));
}

/** Mean of `planArrivals` over the day-to-day noise, without drawing any: the UI's "~27 skiers". */
export function meanArrivals(opts: ArrivalInputs): number {
  return [0, 1, 2, 3, 4].reduce((sum, noise) => sum + arrivalCount(opts, noise), 0) / 5;
}

export type BeatCheckInput = {
  calendar?: CalendarDef;
  seasonLength?: number;
  dayIndex: number;
  liftsOpen: number;
  completedRuns: number;
  arrivals: number;
  snowDepth: number;
  daysWithoutSnow: number;
  reputation: number;
  schoolOfferReady: boolean;
  completedBeats: StoryBeatId[];
};

export function readyStoryBeat(input: BeatCheckInput): StoryBeatId | null {
  for (const beat of STORY_BEATS) {
    if (input.completedBeats.includes(beat.id)) continue;
    if (beat.id === "winter_review") continue;
    if (beatGateMet(beat.id, input)) return beat.id;
  }
  return null;
}

function beatGateMet(id: StoryBeatId, input: BeatCheckInput): boolean {
  const calendar = input.calendar ?? calendarForSeason("dutch_hill", input.seasonLength ?? 28);
  switch (id) {
    case "first_load":
      return input.liftsOpen >= 1 && input.completedRuns >= 5;
    case "saturday":
      return weekdayForDay(calendar, input.dayIndex) === "Sat" && input.arrivals >= 22;
    case "school_bus":
      return input.schoolOfferReady;
    case "dry_week":
      return input.daysWithoutSnow >= 3 && input.snowDepth < 0.35;
    case "summit_link":
      return input.reputation >= SUMMIT_LINK_MIN_REPUTATION &&
        input.dayIndex >= summitLinkFirstDay(input.seasonLength ?? calendar.length) &&
        input.dayIndex < (input.seasonLength ?? calendar.length);
    default:
      return false;
  }
}

export function emptyDayStats(): DayStats {
  return {
    arrivals: 0,
    guestsArrived: 0,
    completedRuns: 0,
    runsPerGuest: 0,
    turnedAway: 0,
    peakOnHill: 0,
    avgQueueMin: 0,
    dispatched: 0,
    waitSumMin: 0,
    maxQueueLength: 0,
    peakWaitMin: 0,
    byLift: [],
    runsByTrail: [],
    venueRevenue: {},
    refuels: 0,
    balked: 0,
    seatsFullMin: 0,
    ticketBasePosted: 0,
    schoolBusPosted: 0,
  };
}

export { currentWaitMin } from "./lifts";

export { DAY_START_MIN, DAY_END_MIN, SEASON_LENGTH };
