import { TALENT } from "./talents";
import { liftName } from "./assetNames";
import { winterRecord } from "./winterMemory";
import {
  BANKRUPTCY_MORNINGS, LOAN_TERMS,
  canRepayLoan, constructionDraw, constructionPayables, dailyCosts, loanOffered,
  liquidNetWorth, morningCash, operatingCosts, payoffAmount, winterLoanRate, type Payable,
} from "./economy";
import {
  calendarForSeason,
  isOperatingDay,
  operatingDayIndex,
  seasonCalendar,
  weekdayForDay,
  isFestiveDay,
  guestMixForDay,
} from "./calendar";
import { advanceClosedDays, formatWeekdayDigest } from "./closedDays";
import { morningWeatherHeadline, outlookFor, WEATHER_KINDS, weatherForDay } from "./weather";
import {
  assetRevenue,
  assetEffect,
  advanceLodgeUpgrade,
  lodgeAttachPads,
  LODGE_TIERS,
  nextLodgeTier,
  placedAssetsFromLegacy,
  previewAssetPlacement,
  terminalOverlapsBuilding,
  type AssetId,
} from "./base";
import { clearingCells, clearingQuote, trailExposure, type ClearingCell } from "./clearing";
import {
  gunCoverageForTrails,
  gunPlacementReason,
  groomCoverage,
  groomedFeet,
  gunSegmentsTonight,
  GUN_COST,
  maxGunsFor,
  type GunPlacementReason,
} from "./guns";
import { OFF_LEASE_MESSAGE } from "./lease";
import { applyActivityEconomy } from "./activities";
import { isKnownStyleId, isStyleUnlocked, normalizeStyleId } from "./styles";
import { previewPaintedTrail, STANDARD_BRUSH_WIDTH, type PaintStroke } from "./paintedTrail";
import { hasTrailDependents } from "./trailNetwork";
import { canDemolish, canTakeSummitLinkEquity, clearingCostFor, reputationDriftFor, warmWeekPenalty } from "./founders";
import { FOUNDERS, founderById } from "./content";
import { CREW_RUSH_COST, pickTalent as applyTalentPick, type TalentId } from "./talentProgress";

/** Bonus crew point when a lodge upgrade finishes (Tier 2 or 3 opening). */
export const LODGE_UPGRADE_CREW_POINT = 1;
import {
  checkLiftLine,
  checkSpacing,
  MAX_LIFTS,
  MAX_LIFT_SLOTS,
  rulesFor,
  type LiftLine,
  type PlacementReason,
} from "./descent";
import {
  chooseLift,
  currentWaitMin,
  isLiftOperational,
  lapOverheadForLift,
  longestQueue,
  resetLiftQueues,
  stepLifts,
} from "./lifts";
import { createRng } from "./rng";
import { nextSchoolBusDay, schoolBusPupils, SCHOOL_BUS_FARE, type SchoolContractDecision } from "./schoolContract";
import {
  THAW_START_MIN,
  averageTrail,
  deriveSnow,
  experiencedSnow,
  readSnow,
  type SnowTone,
  softenTrail,
  wearTrail,
} from "./snow";
import { SAT, daySatisfaction, venueValue, type SatisfactionContext } from "./satisfaction";
import { settleOperatingDay, ticketBaseOnArrival } from "./intradayCash";
import { observeGuests } from "./why";
import {
  DAY_END_MIN,
  DAY_START_MIN,
  applyOvernight,
  buildNightRecap,
  createInitialGuests,
  emptyDayStats,
  isOnHill,
  meanArrivals,
  nextTalentName,
  planArrivals,
  readyStoryBeat,
  schoolBusGuests,
  tickGuests,
} from "./sim";
import { createInitialState, type GameState, type LiftSlot } from "./state";
import { SUMMIT_LINK_PAYMENT, type SummitLinkDecision } from "./summitLink";
import { arrangeSurprise, resolveSurprise } from "./surprises";
import {
  routeOptions,
  segmentElevationsForPath,
  snowCarriers,
  trailCost,
  trailsOnLift,
  type RouteOption,
  type TrailRun,
} from "./trails";
import { TERRAIN, type Terrain, type XZ } from "./terrain";
import {
  MS_PER_GAME_MINUTE,
  liftCost,
  type BuildingId,
  type DayWeather,
  type Outlook,
  type Wind,
  type FarePreset,
  type FounderId,
  type LiftType,
  snowNightCost,
  type SnowPreset,
  type WeatherKind,
} from "./types";

export { canDemolish } from "./founders";

function clearedLand(state: Partial<Pick<GameState, "clearedCells">>): Set<ClearingCell> {
  return new Set(state.clearedCells);
}

function exposureFor(state: GameState): number[][] {
  const cleared = clearedLand(state);
  return state.trails.map((trail) => trailExposure(trail, cleared));
}

/** Every rule is pure: `(state, ...args) => state`. It returns the same object when nothing changes. */

export function arrivalMood(
  buildings: BuildingId[],
  founderId: FounderId | null,
  weather: WeatherKind = "clear",
): number {
  let mood = 0.65;
  if (weather === "snow" || weather === "storm") mood += 0.06;
  if (weather === "thaw") mood -= 0.08;
  if (buildings.includes("warming_hut")) mood += 0.05;
  if (buildings.includes("cafe")) mood += 0.04;
  const founder = founderById(founderId);
  if (founder) mood += founder.arrivalMoodBonus;
  return Math.max(0, Math.min(0.95, mood));
}

/**
 * Queue input to satisfaction: today's measured mean wait so far, or the
 * current expected wait at the busiest lift before anyone has been dispatched.
 */
export function measuredWaitMin(state: GameState): number {
  const { dispatched, waitSumMin } = state.dayStats;
  return dispatched > 0 ? waitSumMin / dispatched : currentWaitMin(state);
}

/** Day-wide inputs to every guest's satisfaction, shared by the HUD, the Guests sheet and `openNight` so they cannot drift. */
export function satisfactionContext(
  state: Pick<
    GameState,
    "fare" | "buildings" | "founderId" | "weather" | "clockMin"
    | "assets" | "talentsOwned" | "mountainId" | "dayIndex" | "weatherDays" | "seasonLength"
  >,
): SatisfactionContext {
  const founder = founderById(state.founderId);
  const owned = state.talentsOwned;
  const calendar = calendarForSeason(state.mountainId, state.seasonLength);
  const day = state.dayIndex;
  const band = TALENT.houseBand.learned(owned) && isFestiveDay(calendar, day);
  return {
    fare: state.fare,
    firstTimerMoodBonus: TALENT.skiSchool.learned(owned) ? TALENT.skiSchool.mood : 0,
    snowPenaltyScale: TALENT.firstAidHut.learned(owned) ? TALENT.firstAidHut.penaltyScale : 1,
    arrivalMood: Math.min(0.95, arrivalMood(state.assets ? [] : state.buildings, state.founderId, state.weather) + (band ? TALENT.houseBand.mood : 0) - warmWeekPenalty(state) +
      (state.assets ?? []).reduce((sum, asset) => sum + assetEffect(asset, "arrivalMood"), 0)),
    venueValue: (TALENT.cafeShift.learned(owned) && state.buildings.includes("cafe") ? TALENT.cafeShift.value : 0) + (state.assets
      ? state.assets.reduce((sum, asset) => sum + assetEffect(asset, "hillValue"), 0)
      : venueValue(state.buildings)),
    snowExpectation: SAT.SNOW_EXPECTED + (founder?.snowExpectationPenalty ?? 0),
    now: state.clockMin,
  };
}

/** Satisfaction as `openNight` would record it right now; the HUD uses this. */
export function liveSatisfaction(state: GameState): number {
  return daySatisfaction(state.guests, satisfactionContext(state)).score;
}

/** Reputation a radio beat adds when it is chosen at close. */
const BEAT_REPUTATION_BONUS = 2;

export function openNight(state: GameState): GameState {
  if (state.phase !== "day" || openingStep(state)) return state;
  const withActivities = applyActivityEconomy(state);
  const calendar = seasonCalendar(withActivities);
  const openLifts = withActivities.lifts.filter((lift, i) => isLiftOperational(lift, i, withActivities.trails)).length;
  const avgQueueMin = measuredWaitMin(withActivities);
  const ctx = satisfactionContext(withActivities);
  const day = daySatisfaction(withActivities.guests, ctx);
  const stats = { ...withActivities.dayStats, avgQueueMin };
  const invited = schoolBusPupils(withActivities.schoolContract, withActivities.dayIndex);
  const pupils = invited ? withActivities.guests.filter((guest) => guest.schoolPupil) : [];
  const arrived = pupils.filter((guest) => guest.state !== "pending").length;
  const taught = pupils.filter((guest) => guest.schoolLessonCompleted).length;
  const schoolProgramProven = withActivities.schoolProgramProven || (
    withActivities.lodgeTier >= 2 && withActivities.guests.some((guest) => guest.schoolLessonCompleted)
  );
  const settled = settleOperatingDay({ ...withActivities, dayStats: stats }, day.score, arrived);
  const recap = buildNightRecap({
    stats: { ...settled.dayStats, arrivals: day.guests },
    fare: settled.fare,
    snowQuality: settled.snowQuality,
    snowTrouble: readSnow(snowCarriers(settled.trails)).trouble,
    snowLabel: readSnow(snowCarriers(settled.trails)).label,
    day,
    arrivalMood: day.guests ? SAT.ARRIVAL_NEUTRAL + day.breakdown.arrivalMood / SAT.ARRIVAL_PTS : ctx.arrivalMood,
    costs: operatingCosts(settled),
    schoolBus: invited ? { invited, arrived, taught, ticketRevenue: arrived * SCHOOL_BUS_FARE } : undefined,
    busiestLift: settled.dayStats.byLift.reduce<{ label: string; min: number } | undefined>((busiest, record, i) => {
      const min = record.rides ? record.waitSumMin / record.rides : 0;
      const lift = settled.lifts[i];
      return min > (busiest?.min ?? 0) && lift ? { min, label: liftName(lift, i) } : busiest;
    }, undefined),
  });
  const rawReputation = recap.arrivals > 0
    ? Math.round(state.reputation * 0.85 + recap.satisfaction * 0.15 + reputationDriftFor(state.founderId))
    : state.reputation;
  // The beat's +2 reputation lands here, so the recap and its previews open with final numbers.
  const reputationAfterBeat = (beat: string | null) => Math.min(100, rawReputation + (beat ? BEAT_REPUTATION_BONUS : 0)
    + (TALENT.heritageSign.learned(state.talentsOwned) && weekdayForDay(calendar, state.dayIndex) === "Sun" ? TALENT.heritageSign.reputation : 0));
  const pendingBeat = readyStoryBeat({
    calendar,
    dayIndex: state.dayIndex,
    seasonLength: state.seasonLength,
    liftsOpen: openLifts,
    completedRuns: state.dayStats.completedRuns,
    arrivals: recap.arrivals,
    snowDepth: state.snowDepth,
    daysWithoutSnow: state.daysWithoutSnow,
    reputation: rawReputation,
    schoolOfferReady: schoolContractOfferDay({ ...state, schoolProgramProven }) !== null,
    completedBeats: state.completedBeats.filter((id) =>
      (id !== "school_bus" || state.schoolContract !== null) &&
      (id !== "summit_link" || state.summitLinkDecision !== null)),
  });
  const surprise = resolveSurprise(settled.surprise, settled.guests);
  return {
    ...settled,
    phase: "night",
    paused: true,
    nightRecap: recap,
    surprise: null,
    surpriseLog: surprise ? [...settled.surpriseLog, surprise] : settled.surpriseLog,
    pendingFare: settled.fare,
    pendingSnow: settled.snow,
    reputation: reputationAfterBeat(
      pendingBeat === "summit_link" && state.completedBeats.includes(pendingBeat) ? null : pendingBeat,
    ),
    pendingBeat,
    beatAcknowledged: pendingBeat == null,
    schoolProgramProven,
    schoolContract: invited && settled.schoolContract?.decision === "accepted"
      ? { ...settled.schoolContract, pupilsTaught: taught }
      : settled.schoolContract,
    dayStats: settled.dayStats,
  };
}

/**
 * Minutes a guest finishing a run expects before the next one starts skiing:
 * the wait at the best open lift (counting their own turn) plus its ride time.
 */
function lapOverheadMin(lifts: GameState["lifts"], talentsOwned: string[], trails: GameState["trails"], wind: Wind, clockMin: number): number {
  const li = chooseLift(lifts, talentsOwned, trails, undefined, wind, clockMin);
  if (li < 0) return Infinity;
  return lapOverheadForLift(lifts, talentsOwned, li);
}

/** Longest slice of game time simulated in one step, so coarse ticks still measure waits to within it. */
const MAX_STEP_MIN = 0.5;

export function tick(state: GameState, deltaMs: number): GameState {
  if (state.phase !== "day" || state.paused || openingStep(state)) return state;

  const wind = weatherForDay(state).wind;
  const addMin = deltaMs / MS_PER_GAME_MINUTE;
  const steps = Math.max(1, Math.ceil(addMin / MAX_STEP_MIN));
  const stepMin = addMin / steps;

  let { clockMin, guests, lifts, trails } = state;
  let {
    completedRuns,
    dispatched,
    waitSumMin,
    maxQueueLength,
    peakWaitMin,
    guestsArrived,
    turnedAway,
    peakOnHill,
    refuels,
    balked,
    seatsFullMin,
  } = state.dayStats;
  const byLift = lifts.map((_, i) => ({ ...(state.dayStats.byLift[i] ?? { rides: 0, waitSumMin: 0 }) }));
  const totalRunsByTrail = trails.map((_, i) => state.dayStats.runsByTrail[i] ?? 0);
  const previousSegmentRuns = state.dayStats.segmentRunsByTrail;
  let segmentRunsByTrail = previousSegmentRuns && trails.map((_, i) => previousSegmentRuns[i]?.slice() ?? null);
  const venueRevenue = { ...state.dayStats.venueRevenue };
  let cash = state.cash;
  let ticketBasePosted = state.dayStats.ticketBasePosted ?? 0;
  let schoolBusPosted = state.dayStats.schoolBusPosted ?? 0;
  let intradayRevenue = Boolean(state.dayStats.intradayRevenue);
  const seats = state.assets.reduce((sum, asset) =>
    sum + ((asset.id === "cafe" || asset.id === "warming_hut" || asset.id === "apres_bar")
      ? Math.floor(assetEffect(asset, "seats")) : 0), 0);
  const exposure = state.weather === "thaw" && clockMin + addMin >= THAW_START_MIN
    ? exposureFor(state)
    : [];
  for (let k = 0; k < steps; k++) {
    clockMin += stepMin;
    const fullTrailRuns = trails.map(() => 0);
    const partialWear: (number[] | undefined)[] = [];
    const moved = tickGuests(guests, {
      now: clockMin,
      wind,
      snowQuality: state.snowQuality,
      snowByTrail: trails.map((t) => experiencedSnow(t.snow)),
      trails,
      lifts,
      talentsOwned: state.talentsOwned,
      lapOverheadMin: lapOverheadMin(lifts, state.talentsOwned, trails, wind, clockMin),
      assets: state.assets,
      onTrailUse: ({ trailIndex, from, to }, firstUse) => {
        const trail = trails[trailIndex];
        if (!trail) return;
        if (from === 0 && to === 1) {
          fullTrailRuns[trailIndex]++;
          const row = segmentRunsByTrail?.[trailIndex];
          if (row) for (let i = 0; i < row.length; i++) row[i]++;
        } else {
          const n = trail.snow.length;
          segmentRunsByTrail ??= trails.map(() => null);
          const row = segmentRunsByTrail[trailIndex] ??= trail.snow.map(() => totalRunsByTrail[trailIndex]);
          const shares = partialWear[trailIndex] ??= trail.snow.map(() => 0);
          for (let i = 0; i < n; i++) {
            const share = Math.max(0, Math.min(i + 1, to * n) - Math.max(i, from * n));
            shares[i] += share;
            row[i] += share;
          }
        }
        if (firstUse) totalRunsByTrail[trailIndex]++;
      },
    });
    let occupiedSeats = 0;
    moved.forEach((g, i) => {
      const was = guests[i];
      completedRuns += g.runs - was.runs;
      const asset = g.state === "refuel" ? state.assets[g.venueIndex ?? -1] : undefined;
      if (asset?.id === "cafe" || asset?.id === "warming_hut" || asset?.id === "apres_bar") occupiedSeats += 1;
      if (asset && (was.state !== "refuel" || g.stateSinceMin !== was.stateSinceMin)) {
        const rate = assetRevenue(asset, state.founderId);
        venueRevenue[asset.id] = (venueRevenue[asset.id] ?? 0) + rate;
        cash += rate;
        intradayRevenue = true;
        if (asset.id === "cafe" || asset.id === "warming_hut" || asset.id === "apres_bar") {
          if ((g.balks ?? 0) > (was.balks ?? 0)) balked += 1;
          else refuels += 1;
          const shop = state.assets.find((item) => item.id === "shop");
          if (shop && !was.refuelled && g.refuelled) {
            const shopRate = assetRevenue(shop, state.founderId);
            venueRevenue.shop = (venueRevenue.shop ?? 0) + shopRate;
            cash += shopRate;
          }
        }
      }
      if (was.state === "pending" && g.state !== "pending") {
        guestsArrived += 1;
        const fare = ticketBaseOnArrival(g, state.fare);
        if (fare > 0) {
          cash += fare;
          intradayRevenue = true;
          if (g.schoolPupil) schoolBusPosted += fare;
          else ticketBasePosted += fare;
        }
      }
      // Sent home from the line at closing before a single ride.
      if (was.state === "queue" && g.state === "depart" && g.runs === 0) turnedAway += 1;
    });
    if (seats > 0 && occupiedSeats >= seats) {
      seatsFullMin += stepMin;
    }
    // Traffic scrapes the trail segments guests used. Thaw afternoons soften the low end.
    const thawing = state.weather === "thaw" && clockMin >= THAW_START_MIN;
    trails = trails.map((t, ti) => {
      let snow = wearTrail(t.snow, fullTrailRuns[ti], partialWear[ti]);
      if (thawing) snow = softenTrail(snow, stepMin, t.elevations, exposure[ti]);
      return snow === t.snow ? t : { ...t, snow };
    });
    const step = stepLifts(moved, lifts, trails, state.talentsOwned, clockMin, stepMin, wind);
    step.byLift.forEach((stats, i) => {
      byLift[i].rides += stats.rides;
      byLift[i].waitSumMin += stats.waitSumMin;
    });
    guests = step.guests;
    lifts = step.lifts;
    for (const w of step.waits) {
      dispatched += 1;
      waitSumMin += w;
      peakWaitMin = Math.max(peakWaitMin, w);
    }
    maxQueueLength = Math.max(maxQueueLength, longestQueue(lifts));
    peakOnHill = Math.max(peakOnHill, guests.filter(isOnHill).length);
  }
  // The camera follows a guest only while they are on the hill.
  const followed = state.followId
    ? guests.find((g) => g.id === state.followId)
    : undefined;

  const next: GameState = {
    ...state,
    cash,
    clockMin,
    guests,
    lifts,
    trails,
    followId: followed && followed.state !== "gone" ? state.followId : null,
    ...deriveSnow(snowCarriers(trails)),
    dayStats: {
      ...state.dayStats,
      byLift,
      runsByTrail: totalRunsByTrail,
      ...(segmentRunsByTrail ? { segmentRunsByTrail } : {}),
      venueRevenue,
      refuels,
      balked,
      seatsFullMin,
      guestsArrived,
      runsPerGuest: guestsArrived > 0 ? completedRuns / guestsArrived : 0,
      turnedAway,
      peakOnHill,
      completedRuns,
      dispatched,
      waitSumMin,
      maxQueueLength,
      peakWaitMin,
      avgQueueMin: dispatched > 0 ? waitSumMin / dispatched : 0,
      ticketBasePosted,
      schoolBusPosted,
      ...(intradayRevenue ? { intradayRevenue: true } : {}),
    },
  };
  return clockMin >= DAY_END_MIN
    ? openNight({ ...next, clockMin: DAY_END_MIN })
    : next;
}

/** The first morning waits until a surface lift has a descent. */
export function openingStep(state: Pick<GameState, "phase" | "dayIndex" | "lifts" | "trails">): "lift" | "trail" | null {
  if (state.phase !== "day" || state.dayIndex !== 1 ||
      state.lifts.some((lift, i) => isLiftOperational(lift, i, state.trails))) return null;
  return state.lifts.some((lift) => lift.confirmed) ? "trail" : "lift";
}

export function togglePause(state: GameState): GameState {
  if (state.paused && openingStep(state)) return state;
  return { ...state, paused: !state.paused };
}

export function openNightIfReady(state: GameState): GameState {
  if (state.phase !== "day" || state.clockMin < DAY_END_MIN) return state;
  return openNight(state);
}

/**
 * Fast-forward the rest of the day through the real simulation, so skipping
 * produces the same kind of day (queues, waits, runs) as watching it.
 */
export function skipToClose(state: GameState): GameState {
  if (state.phase !== "day" || openingStep(state)) return state;
  const STEP_MIN = 4;
  let s: GameState = { ...state, paused: false };
  while (s.phase === "day") {
    s = tick(s, STEP_MIN * MS_PER_GAME_MINUTE);
  }
  return s;
}

export function setPendingFare(state: GameState, fare: FarePreset): GameState {
  if (state.summitLinkDecision === "accepted" && fare === "expensive") return state;
  return { ...state, pendingFare: fare };
}

export function setPendingSnow(state: GameState, snow: SnowPreset): GameState {
  return { ...state, pendingSnow: snow };
}

export function setFollowId(state: GameState, id: string | null): GameState {
  return { ...state, followId: id };
}

/** Opening the build sheet pauses the day so the player can place without the clock running. */
export function setBuildMode(state: GameState, on: boolean): GameState {
  return { ...state, buildMode: on, paused: on ? true : state.paused };
}

export function setSelectedLiftType(state: GameState, type: LiftType): GameState {
  return { ...state, selectedLiftType: type };
}

export type PlacementCheck =
  | { ok: true; cost: number; length: number; vertical: number }
  | { ok: false; reason: PlacementReason; type?: LiftType; need?: number };

/** The line of a built lift; a lift without a stored bottom starts at the base. */
export function liftLineOf(lift: LiftSlot): LiftLine {
  return { bottom: lift.bottom ?? TERRAIN.base, top: lift.anchor };
}

type LiftPlacementState = Pick<GameState, "lifts" | "cash"> &
  Partial<Pick<GameState, "assets" | "lodgeTier" | "founderId">>;

/** Terrain, buildings, lift count, spacing, crossing and cash checks. */
export function checkPlacement(
  state: LiftPlacementState,
  type: LiftType,
  line: LiftLine,
): PlacementCheck {
  line = { bottom: roundXZ(line.bottom), top: roundXZ(line.top) };
  const open = state.lifts.filter((l) => l.confirmed);
  if (type === "chair" && state.lodgeTier === 1) return { ok: false, reason: "lodge_tier" };
  if (open.length >= MAX_LIFTS || state.lifts.length >= MAX_LIFT_SLOTS) return { ok: false, reason: "max_lifts" };
  const terrain = checkLiftLine(line, TERRAIN, type);
  if (!terrain.ok) return terrain;
  const assets = state.assets ?? [];
  if (terminalOverlapsBuilding(line.bottom, assets) || terminalOverlapsBuilding(line.top, assets)) {
    return { ok: false, reason: "base_occupied" };
  }
  const conflict = checkSpacing(
    line,
    open.map((l) => ({ line: liftLineOf(l), type: l.type })),
  );
  if (conflict) return { ok: false, reason: conflict.reason, type: conflict.type };
  const cost = liftCost(type, line, TERRAIN, state.founderId);
  const { deposit } = constructionDraw(cost);
  if (state.cash < deposit) return { ok: false, reason: "cash", need: deposit - state.cash };
  return { ok: true, cost, length: terrain.length, vertical: terrain.vertical };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const roundXZ = (p: XZ): XZ => ({ x: round2(p.x), z: round2(p.z) });

/** Clamp a tap in the base disc to a legal lift bottom. */
export function projectLiftBottom(hit: XZ, terrain: Terrain = TERRAIN): XZ {
  const base = terrain.base;
  const r = rulesFor(terrain).baseAreaRadius;
  const dx = hit.x - base.x;
  const dz = hit.z - base.z;
  const len = Math.hypot(dx, dz);
  if (len <= r) return roundXZ(hit);
  const k = (r - 0.01) / len;
  return roundXZ({ x: base.x + dx * k, z: base.z + dz * k });
}

export type SnapTopResult = {
  top: XZ;
  snapped: boolean;
  check: PlacementCheck;
};

/** Snap a top tap to the nearest valid placement within radius r (world units). */
export function snapTop(
  state: LiftPlacementState,
  type: LiftType,
  line: LiftLine,
  radius: number,
): SnapTopResult {
  const hit = line.top;
  const direct = checkPlacement(state, type, { bottom: line.bottom, top: hit });
  if (direct.ok) return { top: hit, snapped: false, check: direct };

  let best: { top: XZ; check: Extract<PlacementCheck, { ok: true }> } | null = null;
  let bestD = Infinity;
  let bestV = -Infinity;
  const rings = [radius / 4, radius / 2, (3 * radius) / 4, radius];
  const dirs = [8, 12, 16, 24];
  for (let ri = 0; ri < rings.length; ri++) {
    const ring = rings[ri];
    const n = dirs[ri];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const top = { x: hit.x + Math.cos(a) * ring, z: hit.z + Math.sin(a) * ring };
      const check = checkPlacement(state, type, { bottom: line.bottom, top });
      if (!check.ok) continue;
      const d = Math.hypot(top.x - hit.x, top.z - hit.z);
      if (d > bestD) continue;
      if (d < bestD - 1e-9 || check.vertical > bestV) {
        bestD = d;
        bestV = check.vertical;
        best = { top, check };
      }
    }
  }
  if (best) return { top: best.top, snapped: true, check: best.check };
  return { top: hit, snapped: false, check: direct };
}

/** Build a lift during the day; invalid input returns `state` unchanged. */
export function placeLift(
  state: GameState,
  req: { type: LiftType; bottom: XZ; top: XZ },
): GameState {
  if (state.phase !== "day" || openingStep(state) === "trail") return state;
  const line: LiftLine = { bottom: roundXZ(req.bottom), top: roundXZ(req.top) };
  const check = checkPlacement(state, req.type, line);
  if (!check.ok) return state;
  const lift: LiftSlot = {
    type: req.type,
    anchor: line.top,
    bottom: line.bottom,
    confirmed: true,
    queue: [],
    dispatchCredit: 0,
    builtDay: state.dayIndex,
    builtAtMin: state.clockMin,
    paid: constructionDraw(check.cost).deposit,
  };
  return {
    ...state,
    lifts: [...state.lifts, lift],
    ...purchaseConstruction(state, check.cost, "lift", state.lifts.length),
    buildMode: false,
  };
}

/** Undo the most recent lift at its construction minute. Remove its trails first. */
export function undoableLiftIndex(
  state: Pick<GameState, "lifts" | "dayIndex" | "clockMin" | "phase"> & Partial<Pick<GameState, "trails">>,
): number {
  const i = state.lifts.length - 1;
  const last = state.lifts[i];
  if (!last?.confirmed || last.closing || state.phase !== "day" ||
      state.trails?.some((trail) => trail.liftIndex === i && trail.open)) return -1;
  return last.builtDay === state.dayIndex && last.builtAtMin === state.clockMin ? i : -1;
}

export function undoLift(state: GameState): GameState {
  const i = undoableLiftIndex(state);
  if (i < 0) return state;
  const indices = new Map<number, number>();
  const remaining = state.trails.flatMap((trail, index) => {
    if (trail.liftIndex === i) return [];
    indices.set(index, indices.size);
    return [index];
  });
  const remap = <T extends { trailIndex: number }>(link: T | undefined): T | undefined => {
    const trailIndex = link && indices.get(link.trailIndex);
    return link && trailIndex !== undefined ? { ...link, trailIndex } : undefined;
  };
  const changed = remaining.length !== state.trails.length;
  return {
    ...state,
    lifts: state.lifts.slice(0, i),
    trails: changed ? remaining.map((index) => {
      const trail = state.trails[index];
      if (!trail.links) return trail;
      const start = remap(trail.links.start);
      const end = remap(trail.links.end);
      const crossings = trail.links.crossings?.flatMap((link) => remap(link) ?? []);
      return {
        ...trail,
        links: { ...(start ? { start } : {}), ...(end ? { end } : {}), ...(crossings?.length ? { crossings } : {}) },
      };
    }) : state.trails,
    ...(changed ? {
      guests: state.guests.map((guest) => {
        const trailIndex = guest.trailIndex == null ? undefined : indices.get(guest.trailIndex);
        const legs = guest.skiRoute?.legs.flatMap((leg) => remap(leg) ?? []);
        return { ...guest, trailIndex, ...(guest.skiRoute && legs ? { skiRoute: { ...guest.skiRoute, legs } } : {}) };
      }),
      dayStats: {
        ...state.dayStats,
        runsByTrail: remaining.map((index) => state.dayStats.runsByTrail[index] ?? 0),
        ...(state.dayStats.segmentRunsByTrail ? {
          segmentRunsByTrail: remaining.map((index) => state.dayStats.segmentRunsByTrail?.[index] ?? null),
        } : {}),
      },
    } : {}),
    cash: state.cash + (state.lifts[i].paid ?? 0),
    constructionSpent: state.constructionSpent - (state.lifts[i].paid ?? 0),
    payables: state.payables.filter(({ liftIndex }) => liftIndex !== i),
  };
}

function closeLiftsNow(state: GameState, indices: ReadonlySet<number>): GameState {
  if (!indices.size) return state;
  return {
    ...state,
    lifts: state.lifts.map((lift, i) => indices.has(i)
      ? { ...lift, confirmed: false, closing: false, queue: [], dispatchCredit: 0 }
      : lift),
    trails: state.trails.map((trail) => indices.has(trail.liftIndex)
      ? { ...trail, open: false }
      : trail),
  };
}

function liftHasTrailDependents(state: Pick<GameState, "trails">, liftIndex: number): boolean {
  const removed = new Set(state.trails.flatMap((trail, index) => trail.liftIndex === liftIndex ? [index] : []));
  return hasTrailDependents(state.trails, removed);
}

export function liftClosureProblem(state: GameState, index: number): string | null {
  const lift = state.lifts[index];
  if (state.phase !== "day" || !lift?.confirmed || lift.closing || openingStep(state)) return "This lift can’t close right now.";
  if (liftHasTrailDependents(state, index)) return "Close the trails that connect to this lift’s trails first.";
  if (isLiftOperational(lift, index, state.trails) && !state.lifts.some((other, i) =>
    i !== index && !other.closing && isLiftOperational(other, i, state.trails))) return "Keep at least one lift with a skiable descent.";
  return null;
}

export function closeLift(state: GameState, index: number): GameState {
  if (liftClosureProblem(state, index)) return state;
  if (state.clockMin === DAY_START_MIN && !state.guests.some(isOnHill)) {
    const next = closeLiftsNow(state, new Set([index]));
    return { ...next, ...deriveSnow(snowCarriers(next.trails)) };
  }
  return { ...state, lifts: state.lifts.map((item, i) => i === index ? { ...item, closing: true } : item) };
}

export function checkPaint(state: GameState, strokes: readonly PaintStroke[], glade = false, connectCrossings = true) {
  const preview = previewPaintedTrail(state, strokes, TERRAIN, connectCrossings);
  const original = preview.trailIndex == null ? undefined : state.trails[preview.trailIndex];
  const isGlade = original ? !!original.glade : glade;
  const name = original?.name ?? `${isGlade ? "Glade" : "Painted trail"} ${state.trails.length + 1}`;
  const { path, widths, previousWidths } = preview.clearing;
  const excludedCells = previousWidths && !isGlade && !preview.deleteTrail
    ? [...state.clearedCells, ...clearingCells(path, previousWidths)]
    : state.clearedCells;
  const cleared = isGlade || path.length < 2 || preview.deleteTrail
    ? { newCells: [], acres: 0, cost: 0 }
    : clearingQuote(path, widths, excludedCells);
  cleared.cost = clearingCostFor(state.founderId, cleared.cost);
  // The prepared trail costs money even when no new trees need to come out.
  const preparation = preview.trailIndex == null && preview.path.length >= 2 ? 150 : 0;
  const cost = preview.deleteTrail ? 0 : preparation + cleared.cost;
  const inUse = preview.deleteTrail && preview.trailIndex != null && state.guests.some((guest) =>
    guest.state === "ski" && (guest.trailIndex === preview.trailIndex ||
      guest.skiRoute?.legs.some((leg) => leg.trailIndex === preview.trailIndex)));
  const reason = preview.reason ?? (inUse ? "Wait for skiers to finish using this trail."
    : state.phase !== "day" ? "Building happens during the day. Wait for morning."
    : state.cash < cost ? "Not enough cash for the deposit. Close out the day, then check your balance." : null);
  return { ...preview, cost, reason, cleared, name, glade: isGlade };
}

export function commitPaint(state: GameState, strokes: readonly PaintStroke[], glade = false, connectCrossings = true): GameState {
  const preview = checkPaint(state, strokes, glade, connectCrossings);
  if (preview.reason || preview.liftIndex == null || preview.liftIndex < 0) return state;
  const original = preview.trailIndex == null ? undefined : state.trails[preview.trailIndex];
  const snow = original?.snow ?? averageTrail(state.trails.filter((trail) => trail.open).map((trail) => trail.snow));
  const undoable = original?.paid !== undefined &&
    original.builtDay === state.dayIndex && original.builtAtMin === state.clockMin;
  const links = original?.links ?? preview.links;
  const trail: TrailRun = {
    ...original,
    liftIndex: preview.liftIndex,
    ...(links ? { links } : {}),
    ...(preview.glade ? { glade: true } : {}),
    name: preview.name,
    path: preview.deleteTrail && original ? original.path : preview.path,
    widths: preview.deleteTrail ? original?.widths : preview.widths,
    lengthFt: preview.deleteTrail && original ? original.lengthFt : preview.lengthFt,
    pitch: preview.deleteTrail && original ? original.pitch : preview.pitch,
    difficulty: preview.difficulty,
    open: !preview.deleteTrail,
    snow,
    elevations: preview.deleteTrail && original ? original.elevations : segmentElevationsForPath(preview.path),
    builtDay: original?.builtDay ?? state.dayIndex,
    builtAtMin: original?.builtAtMin ?? state.clockMin,
    paid: original ? (undoable ? (original.paid ?? 0) + preview.cost : original.paid) : preview.cost,
    paidClearing: original
      ? (undoable ? [...(original.paidClearing ?? []), ...preview.cleared.newCells] : original.paidClearing)
      : preview.cleared.newCells,
  };
  return {
    ...state,
    trails: preview.trailIndex == null
      ? [...state.trails, trail]
      : state.trails.map((item, i) => i === preview.trailIndex ? trail : item),
    cash: state.cash - preview.cost,
    constructionSpent: state.constructionSpent + preview.cost,
    clearedCells: [...state.clearedCells, ...preview.cleared.newCells].sort(),
    buildMode: false,
  };
}

export type TrailOffer = RouteOption & { cost: number };

export function trailOptions(
  state: Pick<GameState, "lifts" | "trails"> & Partial<Pick<GameState, "clearedCells" | "founderId">>,
  liftIndex: number,
  terrain: Terrain = TERRAIN,
): TrailOffer[] {
  const lift = state.lifts[liftIndex];
  if (!lift?.confirmed) return [];
  const existing = trailsOnLift(state.trails, liftIndex).map(({ trail }) => trail.path);
  return routeOptions(lift.anchor, existing, terrain).map((opt) => ({
    ...opt,
    cost: state.clearedCells
      ? 150 + clearingCostFor(state.founderId ?? null, clearingQuote(opt.path, opt.path.map(() => STANDARD_BRUSH_WIDTH), clearedLand(state), terrain).cost)
      : trailCost(opt.lengthFt),
  }));
}

export function cutTrail(
  state: GameState,
  liftIndex: number,
  optionIndex: number,
  terrain: Terrain = TERRAIN,
): GameState {
  if (state.phase !== "day" || openingStep(state)) return state;
  const lift = state.lifts[liftIndex];
  if (!lift?.confirmed) return state;
  if (trailsOnLift(state.trails, liftIndex).length >= 3) return state;
  if (state.trails.length >= 8) return state;
  const opts = trailOptions(state, liftIndex, terrain);
  const opt = opts[optionIndex];
  if (!opt) return state;
  if (state.cash < opt.cost) return state;
  const snow = averageTrail(state.trails.filter((t) => t.open).map((t) => t.snow));
  const widths = opt.path.map(() => STANDARD_BRUSH_WIDTH);
  const clearing = clearingQuote(opt.path, widths, clearedLand(state), terrain);
  const run: TrailRun = {
    liftIndex,
    name: opt.name,
    path: opt.path,
    widths,
    paidClearing: clearing.newCells,
    lengthFt: opt.lengthFt,
    pitch: opt.pitch,
    difficulty: opt.difficulty,
    open: true,
    snow,
    elevations: segmentElevationsForPath(opt.path, terrain),
    builtDay: state.dayIndex,
    builtAtMin: state.clockMin,
    paid: opt.cost,
  };
  return {
    ...state,
    trails: [...state.trails, run],
    clearedCells: [...state.clearedCells, ...clearing.newCells].sort(),
    cash: state.cash - opt.cost,
    constructionSpent: state.constructionSpent + opt.cost,
    buildMode: false,
  };
}

export function undoableTrailIndex(
  state: Pick<GameState, "trails" | "dayIndex" | "clockMin" | "phase">,
): number {
  const i = state.trails.length - 1;
  const last = state.trails[i];
  if (!last?.paid || !last.open || state.phase !== "day") return -1;
  return last.builtDay === state.dayIndex && last.builtAtMin === state.clockMin ? i : -1;
}

export function undoTrail(state: GameState): GameState {
  const i = undoableTrailIndex(state);
  if (i < 0) return state;
  const last = state.trails[i];
  const rolledBack = new Set(last.paidClearing);
  return {
    ...state,
    trails: state.trails.slice(0, i),
    clearedCells: state.clearedCells.filter((cell) => !rolledBack.has(cell)),
    cash: state.cash + (last.paid ?? 0),
    constructionSpent: state.constructionSpent - (last.paid ?? 0),
  };
}

function purchaseConstruction(state: GameState, total: number, what: Payable["what"], liftIndex?: number) {
  const { deposit } = constructionDraw(total);
  return {
    cash: state.cash - deposit,
    constructionSpent: state.constructionSpent + deposit,
    payables: [...state.payables, ...constructionPayables(total, state.dayIndex, what, liftIndex)],
  };
}

type SitePlacementState = Pick<GameState, "phase" | "dayIndex" | "lifts" | "trails" | "lodgeTier" | "lodgeStyleId" | "cash">;

export function checkAssetPlacement(
  state: SitePlacementState & Pick<GameState, "assets">,
  id: AssetId,
  at: XZ,
  options: { padIndex?: number } = {},
) {
  if (state.phase !== "day") return { ok: false as const, reason: "Building happens during the day. Wait for morning." };
  if (openingStep(state)) return { ok: false as const, reason: "Build a lift and a trail first. The rest of the hill opens up after that." };
  if (id === "snow_guns") return { ok: false as const, reason: "Place snow guns from the Snow section." };
  const terminals = state.lifts.flatMap((lift) => {
    if (!lift.confirmed) return [];
    const { bottom, top } = liftLineOf(lift);
    return [bottom, top];
  });
  const preview = previewAssetPlacement(id, at, state.lodgeTier, state.assets, {
    terminals,
    defaultStyleId: state.lodgeStyleId,
    padIndex: options.padIndex,
  });
  if (preview.ok && constructionDraw(preview.cost).deposit > state.cash) return { ok: false as const, reason: "Not enough cash for the deposit. Close out the day, then check your balance." };
  return preview;
}

export function checkAssetPlacementAtPad(
  state: SitePlacementState & Pick<GameState, "assets">,
  id: AssetId,
  padIndex: number,
) {
  const pads = lodgeAttachPads(state.lodgeTier);
  const at = pads[padIndex];
  if (!at) return { ok: false as const, reason: "That lodge pad isn't open yet." };
  return checkAssetPlacement(state, id, at, { padIndex });
}

export function pickCrewTalent(state: GameState, id: TalentId): GameState {
  return applyTalentPick(state, id);
}

/** Optional second crew point before sleep (one rush per closing). */
export function rushCrewPoint(state: GameState): GameState {
  if (state.phase !== "night" || !state.nightRecap) return state;
  if (state.crewRushDay === state.dayIndex) return state;
  if (state.cash < CREW_RUSH_COST) return state;
  return {
    ...state,
    cash: state.cash - CREW_RUSH_COST,
    crewPoints: state.crewPoints + 1,
    crewRushDay: state.dayIndex,
  };
}

export function placeAssetAtPad(state: GameState, id: AssetId, padIndex: number): GameState {
  const preview = checkAssetPlacementAtPad(state, id, padIndex);
  if (!preview.ok) return state;
  const buildings = id === "cafe" || id === "shop" || id === "warming_hut"
    ? Array.from(new Set([...state.buildings, id])) : state.buildings;
  return {
    ...state,
    ...purchaseConstruction(state, preview.cost, id),
    buildings,
    assets: [...state.assets, { ...preview.placement, purchase: { day: state.dayIndex, minute: state.clockMin, price: preview.cost } }],
  };
}

export function placeAsset(state: GameState, id: AssetId, at: XZ): GameState {
  const preview = checkAssetPlacement(state, id, at);
  if (!preview.ok) return state;
  const buildings = id === "cafe" || id === "shop" || id === "warming_hut"
    ? Array.from(new Set([...state.buildings, id])) : state.buildings;
  return { ...state, ...purchaseConstruction(state, preview.cost, id), buildings, assets: [...state.assets, { ...preview.placement, purchase: { day: state.dayIndex, minute: state.clockMin, price: preview.cost } }] };
}

/** Venue indices remain stable while guests are on the hill. */
function venueChangeProblem(state: GameState, index: number, undo = false): string | null {
  const asset = state.assets[index];
  if (!asset || state.phase !== "day") return "Venue changes wait for daylight.";
  if (!undo && (state.clockMin !== DAY_START_MIN || state.guests.some(isOnHill))) return "Change this venue before the lifts open.";
  if (state.guests.some(g => g.state === "refuel" && g.venueIndex === index)) return "Guests are still in there. Wait for them to finish their visit.";
  return null;
}

export function assetRemovalQuote(state: GameState, index: number) {
  const asset = state.assets[index];
  const purchase = asset?.purchase;
  const undo = purchase?.day === state.dayIndex && purchase?.minute === state.clockMin;
  let reason = venueChangeProblem(state, index, undo);
  if (!reason && asset.id === "warming_hut" && state.assets.findIndex(a => a.id === asset.id) === index &&
      !canDemolish(state, asset.id) && !undo) reason = "Elena’s keeping the original warming hut.";
  if (!reason && asset.id === "ski_school" && state.schoolContract?.decision === "accepted" &&
      state.schoolContract.day >= state.dayIndex && state.assets.filter(a => a.id === asset.id).length === 1) {
    reason = "The Readsboro kids are coming. Keep the school open until they’ve visited.";
  }
  if (!reason && !undo && (purchase ? state.dayIndex < purchase.day + 2 : state.payables.some(p => p.what === asset.id))) {
    reason = "Pay off the construction installments before you tear this down.";
  }
  const refund = purchase ? (undo ? constructionDraw(purchase.price).deposit : Math.floor(purchase.price / 2)) : 0;
  return { undo, refund, reason };
}

export function removeAsset(state: GameState, index: number): GameState {
  const { undo, refund, reason } = assetRemovalQuote(state, index);
  if (reason) return state;
  const asset = state.assets[index];
  const assets = state.assets.filter((_, i) => i !== index);
  const payables = [...state.payables];
  if (undo && asset.purchase) {
    // Two identical venues bought today have interchangeable installments. Remove exactly one pair.
    for (const draw of constructionPayables(asset.purchase.price, state.dayIndex, asset.id)) {
      const i = payables.findIndex(p => p.what === draw.what && p.amount === draw.amount && p.dueDay === draw.dueDay);
      if (i < 0) return state;
      payables.splice(i, 1);
    }
  }
  const buildings = state.buildings.filter(id => id !== asset.id || assets.some(a => a.id === id));
  return { ...state, assets, buildings, payables, cash: state.cash + refund,
    constructionSpent: undo ? state.constructionSpent - refund : state.constructionSpent,
    guests: state.guests.map(g => g.venueIndex === undefined ? g : {
      ...g, venueIndex: g.venueIndex === index ? undefined : g.venueIndex > index ? g.venueIndex - 1 : g.venueIndex,
    }),
  };
}

export function checkAssetMove(state: GameState, index: number, at: XZ) {
  const reason = venueChangeProblem(state, index);
  if (reason) return { ok: false as const, reason };
  const asset = state.assets[index];
  const terminals = state.lifts.filter(l => l.confirmed).flatMap(l => {
    const { bottom, top } = liftLineOf(l);
    return [bottom, top];
  });
  const result = previewAssetPlacement(asset.id, at, state.lodgeTier, state.assets.filter((_, i) => i !== index), { terminals });
  return result.ok ? { ...result, cost: 0 } : result;
}

export function moveAsset(state: GameState, index: number, at: XZ): GameState {
  const check = checkAssetMove(state, index, at);
  if (!check.ok) return state;
  return { ...state, assets: state.assets.map((asset, i) => i === index
    ? { ...check.placement, purchase: asset.purchase, styleId: asset.styleId, ...(asset.name ? { name: asset.name } : {}) } : asset) };
}

/** Cosmetic only — same footprint and sim numbers. */
export function setLodgeStyle(state: GameState, styleId: string): GameState {
  if (!isKnownStyleId(styleId)) return state;
  const lodgeStyleId = normalizeStyleId(styleId);
  if (!isStyleUnlocked(lodgeStyleId, state)) return state;
  return lodgeStyleId === state.lodgeStyleId ? state : { ...state, lodgeStyleId };
}

export function setAssetStyle(state: GameState, index: number, styleId: string): GameState {
  if (!isKnownStyleId(styleId)) return state;
  const asset = state.assets[index];
  if (!asset) return state;
  const nextStyle = normalizeStyleId(styleId);
  if (!isStyleUnlocked(nextStyle, state)) return state;
  if (nextStyle === asset.styleId) return state;
  if (venueChangeProblem(state, index)) return state;
  return { ...state, assets: state.assets.map((a, i) => (i === index ? { ...a, styleId: nextStyle } : a)) };
}

/** Keep the seeded balance strategy's fixed village coordinates. The player builds on the map. */
export function buyBuilding(state: GameState, id: BuildingId | "lodge"): GameState {
  if (id === "lodge" || id === "snow_guns" || id === "warming_hut" || state.buildings.includes(id)) return state;
  const at = id === "shop" ? { x: 12.5, z: 15.5 } : placedAssetsFromLegacy([id])[0]?.at;
  return at ? placeAsset(state, id, at) : state;
}

export function beginLodgeUpgrade(state: GameState): GameState {
  if (openingStep(state)) return state;
  const tier = nextLodgeTier(state.lodgeTier);
  if (state.phase !== "day" || state.lodgeUpgrade || tier == null) return state;
  const cost = LODGE_TIERS[tier].cost;
  if (state.cash < constructionDraw(cost).deposit) return state;
  return { ...state, ...purchaseConstruction(state, cost, "lodge"), lodgeUpgrade: { toTier: tier, nightsRemaining: 2 } };
}

const GUN_REASON_COPY: Record<GunPlacementReason, string> = {
  off_map: "That spot is off the map. Drag back onto the hill.",
  off_lease: OFF_LEASE_MESSAGE,
  out_of_pipe_reach: "Too far from the pipe. Place guns near the base or another gun.",
  max_guns: "Dutch Hill only has room for more snow guns.",
  gun_here: "There’s already a snow gun here.",
};

function gunReasonCopy(reason: GunPlacementReason | null, cap: number): string | null {
  if (!reason) return null;
  if (reason === "max_guns") return `Dutch Hill only has room for ${cap} snow guns.`;
  return GUN_REASON_COPY[reason];
}

export function checkGunPlacement(state: SitePlacementState & Pick<GameState, "guns">, at: XZ) {
  const point = roundXZ(at);
  const reason = state.phase !== "day" ? "Building happens during the day. Wait for morning."
    : openingStep(state) ? "Build a lift and a trail first. The rest of the hill opens up after that."
    : state.lodgeTier < 2 ? "Snow guns need Lodge Tier 2."
    : gunReasonCopy(gunPlacementReason(point, state.guns, TERRAIN, maxGunsFor(state.trails)), maxGunsFor(state.trails))
      ?? (state.cash < constructionDraw(GUN_COST).deposit ? "Not enough cash for the deposit. Close out the day, then check your balance." : null);
  if (reason) return { ok: false as const, reason };
  return {
    ok: true as const, cost: GUN_COST, acres: 0, attached: false,
    placement: { at: point, builtDay: state.dayIndex, paid: constructionDraw(GUN_COST).deposit },
  };
}

export function placeGun(state: GameState, at: XZ): GameState {
  const preview = checkGunPlacement(state, at);
  return preview.ok
    ? { ...state, ...purchaseConstruction(state, preview.cost, "snow_guns"), guns: [...state.guns, preview.placement] }
    : state;
}

export function pickFounder(state: GameState, id: FounderId): GameState {
  if (!FOUNDERS.some((f) => f.id === id)) return state;
  const rng = createRng(state.rngState);
  const rand = () => rng.next();
  const calendar = seasonCalendar(state);
  const arrivals = planArrivals({
    calendar,
    dayIndex: state.dayIndex,
    fare: state.fare,
    snowQuality: state.snowQuality,
    weather: state.weather,
    buildings: state.buildings,
    talentsOwned: [],
    founderId: id,
    rand,
  });
  return {
    ...state,
    founderId: id,
    morningHeadline: `${state.morningHeadline} ${morningWeatherHeadline(state.weather)}`,
    phase: "day",
    paused: true,
    guests: createInitialGuests(arrivals, rand, guestMixForDay(calendar, state.dayIndex)),
    dayStats: { ...emptyDayStats(), arrivals },
    lifts: resetLiftQueues(state.lifts),
    talentToast: null,
    rngState: rng.state(),
  };
}

export function acknowledgeBeat(state: GameState): GameState {
  if (state.pendingBeat === "school_bus" || summitLinkOfferOpen(state)) return state;
  return completeBeat(state);
}

function completeBeat(state: GameState): GameState {
  if (!state.pendingBeat) {
    return state.beatAcknowledged ? state : { ...state, beatAcknowledged: true };
  }
  return {
    ...state,
    beatLog: [...state.beatLog, { id: state.pendingBeat, day: state.dayIndex }],
    completedBeats: state.completedBeats.includes(state.pendingBeat)
      ? state.completedBeats
      : [...state.completedBeats, state.pendingBeat],
    pendingBeat: null,
    beatAcknowledged: true,
  };
}

export function schoolContractOfferDay(state: GameState): number | null {
  if (state.schoolContract !== null || state.lodgeTier < 2 || !state.schoolProgramProven ||
      !state.assets.some((asset) => asset.id === "ski_school")) return null;
  return nextSchoolBusDay(seasonCalendar(state), state.dayIndex, state.seasonLength);
}

export function decideSchoolContract(state: GameState, decision: SchoolContractDecision): GameState {
  if (state.phase !== "night" || state.pendingBeat !== "school_bus") return state;
  const day = schoolContractOfferDay(state);
  if (day === null) return state;
  return completeBeat({
    ...state,
    schoolContract: decision === "accepted" ? { decision, day, pupilsTaught: null } : { decision },
  });
}

export function summitLinkOfferOpen(state: GameState): boolean {
  return state.phase === "night" && state.nightRecap !== null && state.dayIndex < state.seasonLength &&
    state.pendingBeat === "summit_link" && state.summitLinkDecision === null;
}

export function replyToSummitLink(state: GameState, reply: SummitLinkDecision): GameState {
  if (!summitLinkOfferOpen(state) || !state.nightRecap) return state;
  if (reply !== "accepted" && reply !== "declined") return state;
  if (reply === "accepted" && !canTakeSummitLinkEquity(state)) return state;
  const accepted = reply === "accepted";
  return completeBeat({
    ...state,
    cash: state.cash + (accepted ? SUMMIT_LINK_PAYMENT : 0),
    pendingFare: accepted && state.pendingFare === "expensive" ? "balanced" : state.pendingFare,
    summitLinkDecision: reply,
    nightRecap: { ...state.nightRecap, summitLinkReply: reply },
  });
}

/** One night's overnight result and the crew talents owned in the morning (the learned talent counts). */
function nightFor(
  state: GameState,
  snow: SnowPreset,
  weatherTomorrow: DayWeather = state.weatherDays[state.dayIndex] ?? weatherForDay(state),
) {
  const closing = new Set(state.lifts.flatMap((lift, i) => lift.closing ? [i] : []));
  state = closeLiftsNow(state, closing);
  const exposure = exposureFor(state);
  const overnight = applyOvernight({
    snow,
    cash: state.cash,
    trails: state.trails.map((t) => t.snow),
    openTrails: state.trails.map((t) => t.open),
    gunCoverage: gunCoverageForTrails(state.trails, state.guns, state.talentsOwned, weatherTomorrow.wind, exposure),
    groomCoverage: groomCoverage(state.trails, state.dayStats.runsByTrail, snow, state.talentsOwned),
    exposure,
    hasPlacedGuns: state.guns.length > 0,
    trailElevations: state.trails.map((t) => t.elevations),
    weatherTomorrow,
    buildings: state.buildings,
    talentsOwned: state.talentsOwned,
    daysWithoutSnow: state.daysWithoutSnow,
  });
  const crewPoints = state.crewPoints + overnight.crewPointsEarned;
  return { overnight, talentsOwned: state.talentsOwned, crewPoints };
}

function forecastResults(state: GameState, snow: SnowPreset) {
  return Object.fromEntries(WEATHER_KINDS.map((kind) =>
    [kind, nightFor(state, snow, { kind, wind: "calm" })],
  )) as Record<WeatherKind, ReturnType<typeof nightFor>>;
}

export type OvernightPreview = {
  /** Snow label for the most likely morning conditions. */
  label: string;
  tone: SnowTone;
  /** Mean snow quality weighted by the outlook. */
  meanQuality: number;
  cost: number;
  /** Most probable kind, or today's kind after the final day. */
  weather: WeatherKind;
  outlook: Outlook | null;
  results: ReturnType<typeof forecastResults>;
};

/** Gun and groom workload for a snow preset (closing state, tomorrow wind on gun reach). */
export function snowServiceStats(
  state: GameState,
  snow: SnowPreset,
  weatherTomorrow: DayWeather = state.weatherDays[state.dayIndex] ?? weatherForDay(state),
) {
  const exposure = exposureFor(state);
  return {
    gunSegments: gunSegmentsTonight(state.trails, state.guns, snow, state.talentsOwned, weatherTomorrow.wind, exposure),
    groomFeet: groomedFeet(state.trails, state.dayStats.runsByTrail, snow, state.talentsOwned),
  };
}

/** Tomorrow's snow across plausible conditions. Pure and independent of the guest RNG. */
export function previewOvernight(state: GameState, snow: SnowPreset): OvernightPreview {
  const outlook = outlookFor(state, 1);
  const results = forecastResults(state, snow);
  const weather = outlook
    ? WEATHER_KINDS.reduce((best, kind) => outlook[kind] > outlook[best] ? kind : best)
    : state.weather;
  const { overnight } = results[weather];
  const carriers = state.trails.map((t, i) => ({
    confirmed: t.open && !state.lifts[t.liftIndex]?.closing,
    trail: overnight.trails[i] ?? t.snow,
    elevations: t.elevations,
  }));
  const reading = readSnow(carriers);
  return {
    label: reading.label,
    tone: reading.tone,
    meanQuality: outlook ? WEATHER_KINDS.reduce((sum, kind) =>
      sum + outlook[kind] * results[kind].overnight.snowQuality, 0) : overnight.snowQuality,
    cost: snowNightCost(snow, state.talentsOwned),
    weather,
    outlook,
    results,
  };
}

/** Forecast-weighted mean attendance tomorrow, without drawing from the guest RNG. */
export function expectedArrivals(
  state: GameState,
  fare: FarePreset,
  snow: SnowPreset = state.pendingSnow,
): number {
  const outlook = outlookFor(state, 1);
  const results = forecastResults(state, snow);
  const arrivals = (weather: WeatherKind) => meanArrivals({
    calendar: seasonCalendar(state),
    dayIndex: state.dayIndex + 1,
    fare,
    snowQuality: results[weather].overnight.snowQuality,
    weather,
    buildings: state.buildings,
    talentsOwned: results[weather].talentsOwned,
    founderId: state.founderId,
    reputation: state.reputation,
  });
  const publicArrivals = outlook
    ? WEATHER_KINDS.reduce((sum, kind) => sum + outlook[kind] * arrivals(kind), 0)
    : arrivals(state.weather);
  return publicArrivals + schoolBusPupils(state.schoolContract, state.dayIndex + 1);
}

export function takeLoan(state: GameState): GameState {
  if (!state.nightRecap || !loanOffered(state)) return state;
  const principal = LOAN_TERMS.principal;
  return {
    ...state,
    cash: state.cash + principal,
    nightRecap: { ...state.nightRecap, loanReceived: principal },
    loanTaken: true,
    loan: { principal, balance: principal, ratePerDay: winterLoanRate(state) / state.seasonLength, takenDay: state.dayIndex },
  };
}

export function repayLoan(state: GameState, amount?: number): GameState {
  if (!state.nightRecap || !state.loan || !canRepayLoan(state)) return state;
  const payoff = payoffAmount(state.loan);
  const payment = amount === undefined ? payoff : Math.round(amount * 100) / 100;
  if (!Number.isFinite(payment) || payment <= 0 || payment > payoff) return state;
  const loan = payment === payoff ? null : {
    ...state.loan,
    principal: Math.max(0, state.loan.principal - payment),
    balance: state.loan.balance - payment,
  };
  return {
    ...state,
    cash: state.cash - payment,
    loan,
    nightRecap: { ...state.nightRecap, loanRepaid: state.nightRecap.loanRepaid + payment },
  };
}

export function sleep(state: GameState): GameState {
  if (state.phase !== "night" || !state.nightRecap) return state;
  if (summitLinkOfferOpen(state) || (state.pendingBeat && !state.beatAcknowledged)) return state;

  const cal = seasonCalendar(state);
  const recap = state.nightRecap;
  const costs = dailyCosts(state);
  const cash = morningCash(state);
  const debtMornings = cash < 0 ? state.debtMornings + 1 : 0;
  const upgrade = state.lodgeUpgrade && advanceLodgeUpgrade(state.lodgeUpgrade);
  const completedTier = state.lodgeUpgrade && !upgrade ? state.lodgeUpgrade.toTier : null;
  state = {
    ...state,
    cash,
    debtMornings,
    dayHistory: [...state.dayHistory, {
      day: operatingDayIndex(cal, state.dayIndex), fare: state.fare, snow: state.snow, weather: state.weather, recap,
      snowCost: costs.snowNight, constructionDue: costs.draws, closingCash: cash,
    }],
    seasonDays: [...state.seasonDays, { day: state.dayIndex, fare: state.fare, snow: state.snow,
      arrivals: recap.arrivals, satisfaction: recap.satisfaction, closingReputation: state.reputation, ...(completedTier && { lodgeOpening: completedTier }),
      ...(recap.summitLinkReply && { summitLink: {
        reply: recap.summitLinkReply,
        receipt: recap.summitLinkReply === "accepted" ? SUMMIT_LINK_PAYMENT : 0,
        fareCap: recap.summitLinkReply === "accepted" ? "balanced" : null,
      } }),
      ...(recap.facts.schoolBus && { schoolBus: recap.facts.schoolBus }) }],
    loan: state.loan ? { ...state.loan, balance: state.loan.balance + costs.interest } : null,
    payables: state.payables.filter(({ dueDay }) => dueDay > state.dayIndex),
  };
  state = closeLiftsNow(state, new Set(state.lifts.flatMap((lift, i) => lift.closing ? [i] : [])));
  const nextDay = state.dayIndex + 1;
  const observation = observeGuests(recap);
  const lastDay = {
    arrivals: recap.arrivals,
    satisfaction: recap.satisfaction,
    cashDelta: recap.cashDelta,
    avgWaitMin: recap.facts.avgWaitMin,
    snowNightCost: costs.snowNight,
    ...(observation ? { observation } : {}),
    fare: state.fare,
    snow: state.snow,
  };
  const bankrupt = debtMornings >= BANKRUPTCY_MORNINGS;
  let carry = state;
  let weekdayDigest: string | null = null;
  if (!bankrupt && nextDay <= state.seasonLength && !isOperatingDay(cal, nextDay)) {
    const advanced = advanceClosedDays(carry, cal, carry.dayIndex);
    carry = advanced.state;
    if (advanced.summary) weekdayDigest = formatWeekdayDigest(cal, advanced.summary);
    if (carry.debtMornings >= BANKRUPTCY_MORNINGS) {
      const review: GameState = {
        ...carry,
        phase: "winter_review",
        outcome: "bankrupt",
        loan: carry.loan && { ...carry.loan, balance: payoffAmount(carry.loan) },
        paused: true,
        lodgeUpgrade: upgrade,
        lodgeTier: completedTier ?? carry.lodgeTier,
        lastDay,
        nightRecap: null,
        pendingBeat: null,
        talentToast: null,
        beatLog: carry.beatLog,
        completedBeats: carry.completedBeats,
      };
      const record = winterRecord(review);
      return { ...review, lastWinter: record, career: [...review.career, record] };
    }
  }
  const openDay = carry.dayIndex + 1;
  const seasonOver = bankrupt || openDay > state.seasonLength;
  if (seasonOver) {
    const review: GameState = {
      ...carry,
      phase: "winter_review",
      outcome: bankrupt ? "bankrupt" : "finished",
      loan: state.loan && { ...state.loan, balance: payoffAmount(state.loan) },
      paused: true,
      lodgeUpgrade: upgrade,
      lodgeTier: completedTier ?? state.lodgeTier,
      lastDay,
      nightRecap: null,
      pendingBeat: null,
      talentToast: null,
      beatLog: bankrupt ? state.beatLog : [...state.beatLog, { id: "winter_review", day: state.dayIndex }],
      completedBeats: bankrupt || state.completedBeats.includes("winter_review")
        ? state.completedBeats
        : [...state.completedBeats, "winter_review"],
    };
    const record = winterRecord(review);
    return { ...review, lastWinter: record, career: [...review.career, record] };
  }

  const { overnight, talentsOwned, crewPoints: earnedCrewPoints } = nightFor(carry, carry.pendingSnow);
  const morningCrewPoints = earnedCrewPoints + (completedTier ? LODGE_UPGRADE_CREW_POINT : 0);
  const carried: GameState = {
    ...carry,
    lodgeUpgrade: upgrade,
    lodgeTier: completedTier ?? carry.lodgeTier,
    lastDay,
    paused: true,
    constructionSpent: 0,
    fare: state.pendingFare,
    snow: state.pendingSnow,
    trails: state.trails.map((t, i) => {
      const trail = {
        ...t,
        snow: overnight.trails[i] ?? t.snow,
        previousRuns: state.dayStats.runsByTrail[i] ?? 0,
        gunCovered: overnight.gunCoverage?.[i],
        groomed: overnight.groomCoverage?.[i],
      };
      const segmentRuns = state.dayStats.segmentRunsByTrail?.[i];
      if (segmentRuns) trail.previousSegmentRuns = segmentRuns;
      else delete trail.previousSegmentRuns;
      return trail;
    }),
    snowQuality: overnight.snowQuality,
    snowDepth: overnight.snowDepth,
    gunReach: overnight.gunReach,
    groomVisible: overnight.groomVisible,
    weather: overnight.weather,
    morningHeadline: completedTier
      ? `Route 100 Radio: Lodge Tier ${completedTier} is open. ${overnight.morningHeadline}`
      : weekdayDigest
        ? `${weekdayDigest} ${overnight.morningHeadline}`
        : overnight.morningHeadline,
    daysWithoutSnow: overnight.daysWithoutSnow,
    talentsOwned,
    crewPoints: morningCrewPoints,
    nightRecap: null,
    pendingBeat: null,
  };

  // Roll next-day arrivals at sleep (fare and weather apply).
  const rng = createRng(state.rngState);
  const rand = () => rng.next();
  const calendar = seasonCalendar(state);
  const arrivals = planArrivals({
    calendar,
    dayIndex: openDay,
    fare: state.pendingFare,
    snowQuality: overnight.snowQuality,
    weather: overnight.weather,
    buildings: state.buildings,
    talentsOwned: carried.talentsOwned,
    founderId: state.founderId,
    reputation: state.reputation,
    rand,
  });
  const pupils = schoolBusPupils(carry.schoolContract, openDay);
  const { guests, surprise } = arrangeSurprise({
    calendar,
    dayIndex: openDay,
    seasonSeed: state.seasonSeed,
    weather: overnight.weather,
    surpriseLog: state.surpriseLog,
  }, createInitialGuests(arrivals, rand, guestMixForDay(calendar, nextDay)));
  return {
    ...carried,
    phase: "day",
    gunsVisible: overnight.gunsFired,
    talentToast: (() => {
      const parts: string[] = [];
      if (morningCrewPoints > state.crewPoints) {
        const gained = morningCrewPoints - state.crewPoints;
        parts.push(
          gained === 1
            ? "Crew point earned. Open Office → Crew to unlock a skill."
            : `${gained} crew points earned. Open Office → Crew to unlock skills.`,
        );
      }
      if (completedTier) {
        parts.push(`Lodge Tier ${completedTier} is open — the crew celebrated with a bonus point.`);
      }
      if (parts.length) return parts.join(" ");
      return overnight.nextTalentHint
        ? `Crew board: ${overnight.nextTalentHint} is next when you earn a point.`
        : null;
    })(),
    clockMin: DAY_START_MIN,
    dayIndex: openDay,
    operatingDayIndex: operatingDayIndex(calendar, openDay),
    beatAcknowledged: true,
    guests: pupils
      ? [...guests, ...schoolBusGuests(openDay, pupils)].sort((a, b) => a.arriveAtMin - b.arriveAtMin)
      : guests,
    surprise,
    dayStats: { ...emptyDayStats(), arrivals: guests.length + pupils },
    lifts: resetLiftQueues(carried.lifts),
    rngState: rng.state(),
  };
}

export function finishWinterReview(state: GameState): GameState {
  if (state.phase !== "winter_review" || state.outcome !== "finished" || liquidNetWorth(state) < 0) return state;
  return { ...state, phase: "mountain2" };
}

export function startNewSeason(state: GameState): GameState {
  const next = pickFounder(createInitialState(state.rngState), state.founderId ?? "elena");
  // The store merges the rule result, so explicitly clear a name from the old hill.
  if (state.lodgeName !== undefined) next.lodgeName = undefined;
  if (state.lastWinter || state.outcome === "playing") {
    return { ...next, career: state.career, ...(state.lastWinter && { lastWinter: state.lastWinter }) };
  }
  const record = winterRecord(state);
  return { ...next, career: [...state.career, record], lastWinter: record };
}

export function nextTalentHint(state: GameState): string | null {
  return nextTalentName(state.talentsOwned);
}
