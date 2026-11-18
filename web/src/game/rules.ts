import { DUTCH_HILL_SITE } from "./mountains/dutchHill.site";
import {
  ASSET_CATALOG,
  assetRevenue,
  assetEffect,
  advanceLodgeUpgrade,
  LODGE_TIERS,
  nextLodgeTier,
  placedAssetsFromLegacy,
  previewAssetPlacement,
  terminalOverlapsBuilding,
  type AssetId,
} from "./base";
import { clearingCells, clearingQuote, trailExposure, type ClearingCell } from "./clearing";
import { gunCoverage, gunPlacementReason, groomCoverage, GUN_COST } from "./guns";
import { previewPaintedTrail, STANDARD_BRUSH_WIDTH, type PaintStroke } from "./paintedTrail";
import { CREW_TALENTS, FOUNDERS, founderById } from "./content";
import {
  checkLiftLine,
  checkSpacing,
  MAX_LIFTS,
  rulesFor,
  type LiftLine,
  type PlacementReason,
} from "./descent";
import {
  chooseLift,
  currentWaitMin,
  lapOverheadForLift,
  longestQueue,
  resetLiftQueues,
  stepLifts,
} from "./lifts";
import { createRng } from "./rng";
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
import {
  DAY_END_MIN,
  DAY_START_MIN,
  applyOvernight,
  buildNightRecap,
  createInitialGuests,
  emptyDayStats,
  isOnHill,
  isWeekend,
  meanArrivals,
  nextTalentName,
  planArrivals,
  readyStoryBeat,
  tickGuests,
} from "./sim";
import { defaultLifts, type GameState, type LiftSlot } from "./state";
import {
  defaultTrails,
  fallLineTrailForLift,
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
  LIFT_LABELS,
  liftCost,
  type BuildingId,
  type FarePreset,
  type FounderId,
  type LiftType,
  SNOW_NIGHT_COST,
  type SnowPreset,
  type WeatherKind,
} from "./types";

const includedClearings = new WeakMap<XZ[], ClearingCell[]>();

/** Starter corridors come with their lifts. A same-minute lift undo removes its included clearing. */
function clearedLand(state: Pick<GameState, "trails"> & Partial<Pick<GameState, "clearedCells">>): Set<ClearingCell> {
  const cells = new Set(state.clearedCells);
  for (const trail of state.trails) {
    if (trail.paid !== undefined) continue;
    let included = includedClearings.get(trail.path);
    if (!included) {
      included = clearingCells(trail.path, trail.path.map(() => STANDARD_BRUSH_WIDTH));
      includedClearings.set(trail.path, included);
    }
    for (const cell of included) cells.add(cell);
  }
  return cells;
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
  if (weather === "snow") mood += 0.06;
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
  > & Partial<Pick<GameState, "assets">>,
): SatisfactionContext {
  const founder = founderById(state.founderId);
  return {
    fare: state.fare,
    arrivalMood: Math.min(0.95, arrivalMood(state.assets ? [] : state.buildings, state.founderId, state.weather) +
      (state.assets ?? []).reduce((sum, asset) => sum + assetEffect(asset, "arrivalMood"), 0)),
    venueValue: state.assets
      ? state.assets.reduce((sum, asset) => sum + assetEffect(asset, "hillValue"), 0)
      : venueValue(state.buildings),
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
  const founder = founderById(state.founderId);
  const openLifts = state.lifts.filter((l) => l.confirmed).length;
  const avgQueueMin = measuredWaitMin(state);
  const ctx = satisfactionContext(state);
  const stats = { ...state.dayStats, avgQueueMin };
  const recap = buildNightRecap({
    stats,
    fare: state.fare,
    snowQuality: state.snowQuality,
    snowTrouble: readSnow(snowCarriers(state.trails)).trouble,
    snowLabel: readSnow(snowCarriers(state.trails)).label,
    day: daySatisfaction(state.guests, ctx),
    arrivalMood: ctx.arrivalMood,
    openLiftCount: openLifts,
    founderFixedDelta: founder?.fixedCostDelta ?? 0,
    busiestLift: stats.byLift.reduce<{ label: string; min: number } | undefined>((busiest, record, i) => {
      const min = record.rides ? record.waitSumMin / record.rides : 0;
      const lift = state.lifts[i];
      return min > (busiest?.min ?? 0) && lift ? { min, label: `${LIFT_LABELS[lift.type]} ${i + 1}` } : busiest;
    }, undefined),
    venueUpkeep: state.assets.reduce((sum, asset) => sum + ASSET_CATALOG[asset.id].upkeep, 0),
  });
  const rawReputation = Math.round(
    state.reputation * 0.85 + recap.satisfaction * 0.15,
  );
  // The beat's +2 reputation lands here, so the recap and its previews open with final numbers.
  const reputationAfterBeat = (beat: string | null) => rawReputation + (beat ? BEAT_REPUTATION_BONUS : 0);
  const pendingBeat = readyStoryBeat({
    dayIndex: state.dayIndex,
    liftsOpen: openLifts,
    completedRuns: state.dayStats.completedRuns,
    arrivals: state.dayStats.arrivals,
    snowDepth: state.snowDepth,
    daysWithoutSnow: state.daysWithoutSnow,
    reputation: rawReputation,
    lessonsBooked: (stats.venueRevenue.ski_school ?? 0) > 0 || state.talentsOwned.includes("school_day"),
    completedBeats: state.completedBeats,
  });
  return {
    ...state,
    phase: "night",
    paused: true,
    nightRecap: recap,
    pendingFare: state.fare,
    pendingSnow: state.snow,
    reputation: reputationAfterBeat(pendingBeat),
    pendingBeat,
    beatAcknowledged: pendingBeat == null,
    dayStats: stats,
  };
}

/**
 * Minutes a guest finishing a run expects before the next one starts skiing:
 * the wait at the best open lift (counting their own turn) plus its ride time.
 */
function lapOverheadMin(lifts: GameState["lifts"], talentsOwned: string[]): number {
  const li = chooseLift(lifts, talentsOwned);
  if (li < 0) return Infinity;
  return lapOverheadForLift(lifts, talentsOwned, li);
}

/** Longest slice of game time simulated in one step, so coarse ticks still measure waits to within it. */
const MAX_STEP_MIN = 0.5;

export function tick(state: GameState, deltaMs: number): GameState {
  if (state.phase !== "day" || state.paused) return state;

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
  const venueRevenue = { ...state.dayStats.venueRevenue };
  const seats = state.assets.reduce((sum, asset) =>
    sum + ((asset.id === "cafe" || asset.id === "warming_hut") ? Math.floor(assetEffect(asset, "seats")) : 0), 0);
  const exposure = state.weather === "thaw" && clockMin + addMin >= THAW_START_MIN
    ? exposureFor(state)
    : [];
  for (let k = 0; k < steps; k++) {
    clockMin += stepMin;
    const moved = tickGuests(guests, {
      now: clockMin,
      snowQuality: state.snowQuality,
      snowByTrail: trails.map((t) => experiencedSnow(t.snow)),
      trails,
      lifts,
      talentsOwned: state.talentsOwned,
      lapOverheadMin: lapOverheadMin(lifts, state.talentsOwned),
      assets: state.assets,
    });
    const runsByTrail = trails.map(() => 0);
    let occupiedSeats = 0;
    moved.forEach((g, i) => {
      const was = guests[i];
      completedRuns += g.runs - was.runs;
      if (g.runs > was.runs) {
        const ti = was.trailIndex ?? was.liftIndex ?? 0;
        if (ti < runsByTrail.length) {
          runsByTrail[ti] += g.runs - was.runs;
          totalRunsByTrail[ti] += g.runs - was.runs;
        }
      }
      const asset = g.state === "refuel" ? state.assets[g.venueIndex ?? -1] : undefined;
      if (asset?.id === "cafe" || asset?.id === "warming_hut") occupiedSeats += 1;
      if (asset && (was.state !== "refuel" || g.stateSinceMin !== was.stateSinceMin)) {
        const rate = assetRevenue(asset);
        venueRevenue[asset.id] = (venueRevenue[asset.id] ?? 0) + rate;
        if (asset.id === "cafe" || asset.id === "warming_hut") {
          if ((g.balks ?? 0) > (was.balks ?? 0)) balked += 1;
          else refuels += 1;
          const shop = state.assets.find((item) => item.id === "shop");
          if (shop && !was.refuelled && g.refuelled) {
            venueRevenue.shop = (venueRevenue.shop ?? 0) + assetRevenue(shop);
          }
        }
      }
      if (was.state === "pending" && g.state !== "pending") guestsArrived += 1;
      // Sent home from the line at closing before a single ride.
      if (was.state === "queue" && g.state === "depart" && g.runs === 0) turnedAway += 1;
    });
    if (seats > 0 && occupiedSeats >= seats) {
      seatsFullMin += stepMin;
    }
    // Traffic scrapes the trail of the lift each run came down; thaw afternoons soften the low end.
    const thawing = state.weather === "thaw" && clockMin >= THAW_START_MIN;
    trails = trails.map((t, ti) => {
      let snow = wearTrail(t.snow, runsByTrail[ti]);
      if (thawing) snow = softenTrail(snow, stepMin, t.elevations, exposure[ti]);
      return snow === t.snow ? t : { ...t, snow };
    });
    const step = stepLifts(moved, lifts, trails, state.talentsOwned, clockMin, stepMin);
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
    },
  };
  return clockMin >= DAY_END_MIN
    ? openNight({ ...next, clockMin: DAY_END_MIN })
    : next;
}

export function togglePause(state: GameState): GameState {
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
  if (state.phase !== "day") return state;
  const STEP_MIN = 4;
  let s: GameState = { ...state, paused: false };
  while (s.phase === "day") {
    s = tick(s, STEP_MIN * MS_PER_GAME_MINUTE);
  }
  return s;
}

export function setPendingFare(state: GameState, fare: FarePreset): GameState {
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
  Partial<Pick<GameState, "assets" | "lodgeTier">>;

/** Terrain, buildings, lift count, spacing, crossing and cash checks. */
export function checkPlacement(
  state: LiftPlacementState,
  type: LiftType,
  line: LiftLine,
): PlacementCheck {
  line = { bottom: roundXZ(line.bottom), top: roundXZ(line.top) };
  const open = state.lifts.filter((l) => l.confirmed);
  if (type === "chair" && state.lodgeTier === 1) return { ok: false, reason: "lodge_tier" };
  if (open.length >= MAX_LIFTS || state.lifts.length >= 12) return { ok: false, reason: "max_lifts" };
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
  const cost = liftCost(type, line);
  if (state.cash < cost) return { ok: false, reason: "cash", need: cost - state.cash };
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
  if (state.phase !== "day") return state;
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
    paid: check.cost,
  };
  const idx = state.lifts.length;
  const snow = averageTrail(state.trails.filter((t) => t.open).map((t) => t.snow));
  const run = fallLineTrailForLift(idx, lift, snow);
  return {
    ...state,
    lifts: [...state.lifts, lift],
    trails: [...state.trails, run],
    cash: state.cash - check.cost,
    buildMode: false,
  };
}

/** The last lift while it can still be taken back: same day, clock unmoved. Else -1; the default lift never qualifies. */
export function undoableLiftIndex(
  state: Pick<GameState, "lifts" | "dayIndex" | "clockMin" | "phase">,
): number {
  const i = state.lifts.length - 1;
  const last = state.lifts[i];
  if (i < 1 || !last?.confirmed || last.closing || state.phase !== "day" ||
      state.lifts.filter((lift) => lift.confirmed && !lift.closing).length <= 1) return -1;
  return last.builtDay === state.dayIndex && last.builtAtMin === state.clockMin ? i : -1;
}

export function undoLift(state: GameState): GameState {
  const i = undoableLiftIndex(state);
  if (i < 0) return state;
  return {
    ...state,
    lifts: state.lifts.slice(0, i),
    trails: state.trails.filter((t) => t.liftIndex !== i),
    cash: state.cash + (state.lifts[i].paid ?? 0),
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

export function closeLift(state: GameState, index: number): GameState {
  const lift = state.lifts[index];
  if (state.phase !== "day" || !lift?.confirmed || lift.closing ||
      state.lifts.filter((item) => item.confirmed && !item.closing).length <= 1) return state;
  if (state.clockMin === DAY_START_MIN && !state.guests.some(isOnHill)) {
    const next = closeLiftsNow(state, new Set([index]));
    return { ...next, ...deriveSnow(snowCarriers(next.trails)) };
  }
  return { ...state, lifts: state.lifts.map((item, i) => i === index ? { ...item, closing: true } : item) };
}

export function checkPaint(state: GameState, strokes: readonly PaintStroke[]) {
  const preview = previewPaintedTrail(state, strokes);
  const cleared = preview.path.length < 2 || preview.deleteTrail
    ? { newCells: [], acres: 0, cost: 0 }
    : clearingQuote(preview.path, preview.widths, clearedLand(state));
  // The prepared trail costs money even when no new trees need to come out.
  const preparation = preview.trailIndex == null && preview.path.length >= 2 ? 150 : 0;
  const cost = preview.deleteTrail ? 0 : preparation + cleared.cost;
  const reason = preview.reason ?? (state.phase !== "day" ? "Build during the day."
    : state.cash < cost ? "Not enough cash." : null);
  return { ...preview, cost, reason, cleared };
}

export function commitPaint(state: GameState, strokes: readonly PaintStroke[]): GameState {
  const preview = checkPaint(state, strokes);
  if (preview.reason || preview.liftIndex == null || preview.liftIndex < 0) return state;
  const original = preview.trailIndex == null ? undefined : state.trails[preview.trailIndex];
  const snow = original?.snow ?? averageTrail(state.trails.filter((trail) => trail.open).map((trail) => trail.snow));
  const undoable = original?.paid !== undefined &&
    original.builtDay === state.dayIndex && original.builtAtMin === state.clockMin;
  const trail: TrailRun = {
    liftIndex: preview.liftIndex,
    name: original?.name ?? `Painted trail ${state.trails.length + 1}`,
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
    clearedCells: [...state.clearedCells, ...preview.cleared.newCells].sort(),
    buildMode: false,
  };
}

export type TrailOffer = RouteOption & { cost: number };

export function trailOptions(
  state: Pick<GameState, "lifts" | "trails"> & Partial<Pick<GameState, "clearedCells">>,
  liftIndex: number,
  terrain: Terrain = TERRAIN,
): TrailOffer[] {
  const lift = state.lifts[liftIndex];
  if (!lift?.confirmed) return [];
  const existing = trailsOnLift(state.trails, liftIndex).map(({ trail }) => trail.path);
  return routeOptions(lift.anchor, existing, terrain).map((opt) => ({
    ...opt,
    cost: state.clearedCells
      ? 150 + clearingQuote(opt.path, opt.path.map(() => STANDARD_BRUSH_WIDTH), clearedLand(state), terrain).cost
      : trailCost(opt.lengthFt),
  }));
}

export function cutTrail(
  state: GameState,
  liftIndex: number,
  optionIndex: number,
  terrain: Terrain = TERRAIN,
): GameState {
  if (state.phase !== "day") return state;
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
  };
}

export function checkAssetPlacement(state: GameState, id: AssetId, at: XZ) {
  if (state.phase !== "day") return { ok: false as const, reason: "Build during the day." };
  if (id === "snow_guns") return { ok: false as const, reason: "Place snow guns from the Snow section." };
  const terminals = state.lifts.flatMap((lift) => {
    if (!lift.confirmed) return [];
    const { bottom, top } = liftLineOf(lift);
    return [bottom, top];
  });
  const preview = previewAssetPlacement(id, at, state.lodgeTier, state.assets, { terminals });
  if (preview.ok && preview.cost > state.cash) return { ok: false as const, reason: "Not enough cash." };
  return preview;
}

export function placeAsset(state: GameState, id: AssetId, at: XZ): GameState {
  const preview = checkAssetPlacement(state, id, at);
  if (!preview.ok) return state;
  const buildings = id === "cafe" || id === "shop" || id === "warming_hut"
    ? Array.from(new Set([...state.buildings, id])) : state.buildings;
  return { ...state, cash: state.cash - preview.cost, buildings, assets: [...state.assets, preview.placement] };
}

/** Keep the seeded balance strategy's fixed village coordinates. The player builds on the map. */
export function buyBuilding(state: GameState, id: BuildingId | "lodge"): GameState {
  if (id === "lodge" || id === "snow_guns" || id === "warming_hut" || state.buildings.includes(id)) return state;
  const at = id === "shop" ? { x: 12.5, z: 15.5 } : placedAssetsFromLegacy([id])[0]?.at;
  return at ? placeAsset(state, id, at) : state;
}

export function beginLodgeUpgrade(state: GameState): GameState {
  const tier = nextLodgeTier(state.lodgeTier);
  if (state.phase !== "day" || state.lodgeUpgrade || tier == null) return state;
  const cost = LODGE_TIERS[tier].cost;
  if (state.cash < cost) return state;
  return { ...state, cash: state.cash - cost, lodgeUpgrade: { toTier: tier, nightsRemaining: 2 } };
}

export function checkGunPlacement(state: GameState, at: XZ) {
  const point = roundXZ(at);
  const reason = state.phase !== "day" ? "Build during the day."
    : state.lodgeTier < 2 ? "Requires Lodge Tier 2."
    : gunPlacementReason(point, state.guns) ?? (state.cash < GUN_COST ? "Not enough cash." : null);
  if (reason) return { ok: false as const, reason };
  return {
    ok: true as const, cost: GUN_COST, acres: 0, attached: false,
    placement: { at: point, builtDay: state.dayIndex, paid: GUN_COST },
  };
}

export function placeGun(state: GameState, at: XZ): GameState {
  const preview = checkGunPlacement(state, at);
  return preview.ok
    ? { ...state, cash: state.cash - preview.cost, guns: [...state.guns, preview.placement] }
    : state;
}

export function pickFounder(state: GameState, id: FounderId): GameState {
  if (!FOUNDERS.some((f) => f.id === id)) return state;
  const rng = createRng(state.rngState);
  const rand = () => rng.next();
  const arrivals = planArrivals({
    dayIndex: 1,
    fare: "balanced",
    snowQuality: 0.55,
    weather: "clear",
    buildings: ["warming_hut"],
    talentsOwned: [],
    founderId: id,
    rand,
  });
  return {
    ...state,
    founderId: id,
    phase: "day",
    paused: true,
    guests: createInitialGuests(arrivals, rand, false),
    dayStats: { ...emptyDayStats(), arrivals },
    lifts: resetLiftQueues(state.lifts),
    morningHeadline: `${founderById(id)?.name ?? "Founder"} takes the keys to Dutch Hill.`,
    talentToast: `Crew will learn overnight: ${nextTalentName([]) ?? "—"}`,
    rngState: rng.state(),
  };
}

export function acknowledgeBeat(state: GameState): GameState {
  if (!state.pendingBeat) {
    return state.beatAcknowledged ? state : { ...state, beatAcknowledged: true };
  }
  return {
    ...state,
    completedBeats: [...state.completedBeats, state.pendingBeat],
    pendingBeat: null,
    beatAcknowledged: true,
  };
}

/** One night's overnight result and the crew talents owned in the morning (the learned talent counts). */
function nightFor(state: GameState, snow: SnowPreset, cash: number) {
  const closing = new Set(state.lifts.flatMap((lift, i) => lift.closing ? [i] : []));
  state = closeLiftsNow(state, closing);
  const overnight = applyOvernight({
    snow,
    cash,
    trails: state.trails.map((t) => t.snow),
    openTrails: state.trails.map((t) => t.open),
    gunCoverage: state.trails.map((t) => t.open ? gunCoverage(t, state.guns, state.talentsOwned) : []),
    groomCoverage: groomCoverage(state.trails, state.dayStats.runsByTrail, snow, state.talentsOwned),
    exposure: exposureFor(state),
    hasPlacedGuns: state.guns.length > 0,
    trailElevations: state.trails.map((t) => t.elevations),
    dayIndex: state.dayIndex,
    buildings: state.buildings,
    talentsOwned: state.talentsOwned,
    daysWithoutSnow: state.daysWithoutSnow,
  });
  const learned = CREW_TALENTS.find((x) => x.name === overnight.talentLearned);
  const talentsOwned = learned ? [...state.talentsOwned, learned.id] : state.talentsOwned;
  return { overnight, talentsOwned };
}

export type OvernightPreview = {
  /** Conditions board word for the worst segment tomorrow morning ("Icy bottom", "Good cover", "Fresh corduroy"). */
  label: string;
  tone: SnowTone;
  /** Mean snow quality over every open segment, 0–1. */
  meanQuality: number;
  cost: number;
  /** Tomorrow's weather as the sim rolls it (a formula today, so the preview is exact). */
  weather: WeatherKind;
};

/** Tomorrow morning's snow if the crew works the night at `snow`. Pure: no RNG, no state change. */
export function previewOvernight(state: GameState, snow: SnowPreset): OvernightPreview {
  const { overnight } = nightFor(state, snow, state.cash);
  const carriers = state.trails.map((t, i) => ({
    confirmed: t.open && !state.lifts[t.liftIndex]?.closing,
    trail: overnight.trails[i] ?? t.snow,
    elevations: t.elevations,
  }));
  const reading = readSnow(carriers);
  return {
    label: reading.label,
    tone: reading.tone,
    meanQuality: overnight.snowQuality,
    cost: SNOW_NIGHT_COST[snow],
    weather: overnight.weather,
  };
}

/** Mean arrivals tomorrow at `fare` (and the snow chosen tonight). Pure: the day-to-day noise is replaced by its mean. */
export function expectedArrivals(
  state: GameState,
  fare: FarePreset,
  snow: SnowPreset = state.pendingSnow,
): number {
  const { overnight, talentsOwned } = nightFor(state, snow, state.cash);
  return meanArrivals({
    dayIndex: state.dayIndex + 1,
    fare,
    snowQuality: overnight.snowQuality,
    weather: overnight.weather,
    buildings: state.buildings,
    talentsOwned,
    founderId: state.founderId,
    reputation: state.reputation,
  });
}

export function sleep(state: GameState): GameState {
  if (state.phase !== "night" || !state.nightRecap) return state;
  if (state.pendingBeat && !state.beatAcknowledged) return state;

  const recap = state.nightRecap;
  state = closeLiftsNow(state, new Set(state.lifts.flatMap((lift, i) => lift.closing ? [i] : [])));
  const upgrade = state.lodgeUpgrade && advanceLodgeUpgrade(state.lodgeUpgrade);
  const completedTier = state.lodgeUpgrade && !upgrade ? state.lodgeUpgrade.toTier : null;
  const { overnight, talentsOwned } = nightFor(
    state,
    state.pendingSnow,
    state.cash + recap.cashDelta,
  );
  const carried: GameState = {
    ...state,
    lodgeUpgrade: upgrade,
    lodgeTier: completedTier ?? state.lodgeTier,
    lastDay: {
      arrivals: recap.arrivals,
      satisfaction: recap.satisfaction,
      cashDelta: recap.cashDelta,
      avgWaitMin: recap.facts.avgWaitMin,
      fare: state.fare,
      snow: state.snow,
    },
    paused: true,
    cash: overnight.cash,
    fare: state.pendingFare,
    snow: state.pendingSnow,
    trails: state.trails.map((t, i) => ({
      ...t,
      snow: overnight.trails[i] ?? t.snow,
      gunCovered: overnight.gunCoverage?.[i],
      groomed: overnight.groomCoverage?.[i],
    })),
    snowQuality: overnight.snowQuality,
    snowDepth: overnight.snowDepth,
    gunReach: overnight.gunReach,
    groomVisible: overnight.groomVisible,
    weather: overnight.weather,
    morningHeadline: completedTier
      ? `Route 100 Radio: Lodge Tier ${completedTier} is open. ${overnight.morningHeadline}`
      : overnight.morningHeadline,
    daysWithoutSnow: overnight.daysWithoutSnow,
    talentsOwned,
    nightRecap: null,
    pendingBeat: null,
  };

  const nextDay = state.dayIndex + 1;
  if (nextDay > state.seasonLength) {
    return {
      ...carried,
      phase: "winter_review",
      gunsVisible: overnight.gunsFired,
      talentToast: overnight.talentLearned
        ? `Crew learned: ${overnight.talentLearned}`
        : null,
      completedBeats: state.completedBeats.includes("winter_review")
        ? state.completedBeats
        : [...state.completedBeats, "winter_review"],
    };
  }

  // Roll next-day arrivals at sleep (fare and weather apply).
  const rng = createRng(state.rngState);
  const rand = () => rng.next();
  const arrivals = planArrivals({
    dayIndex: nextDay,
    fare: state.pendingFare,
    snowQuality: overnight.snowQuality,
    weather: overnight.weather,
    buildings: state.buildings,
    talentsOwned,
    founderId: state.founderId,
    reputation: state.reputation,
    rand,
  });
  return {
    ...carried,
    phase: "day",
    gunsVisible: overnight.gunsFired,
    talentToast: overnight.talentLearned
      ? `Crew learned: ${overnight.talentLearned}. Next: ${overnight.nextTalentHint ?? "—"}`
      : overnight.nextTalentHint
        ? `Tomorrow the crew learns: ${overnight.nextTalentHint}`
        : null,
    clockMin: DAY_START_MIN,
    dayIndex: nextDay,
    beatAcknowledged: true,
    guests: createInitialGuests(arrivals, rand, isWeekend(nextDay)),
    dayStats: { ...emptyDayStats(), arrivals },
    lifts: resetLiftQueues(carried.lifts),
    rngState: rng.state(),
  };
}

export function finishWinterReview(state: GameState): GameState {
  return { ...state, phase: "mountain2" };
}

export function startNewSeason(state: GameState): GameState {
  const rng = createRng(state.rngState);
  const rand = () => rng.next();
  const founderId = state.founderId ?? "elena";
  const arrivals = planArrivals({
    dayIndex: 1,
    fare: "balanced",
    snowQuality: 0.55,
    weather: "clear",
    buildings: ["warming_hut"],
    talentsOwned: [],
    founderId,
    rand,
  });
  return {
    ...state,
    dayIndex: 1,
    clockMin: DAY_START_MIN,
    phase: "day",
    paused: true,
    cash: 12000,
    fare: "balanced",
    snow: "mid",
    snowQuality: 0.55,
    snowDepth: 0.45,
    gunReach: 0,
    lifts: defaultLifts(),
    trails: defaultTrails(),
    buildings: ["warming_hut"],
    lodgeTier: DUTCH_HILL_SITE.buildings.lodge.startingTier,
    lodgeUpgrade: null,
    assets: placedAssetsFromLegacy(["warming_hut"]),
    guns: [],
    clearedCells: defaultTrails().flatMap((trail) =>
      clearingCells(trail.path, trail.path.map(() => STANDARD_BRUSH_WIDTH))),
    talentsOwned: [],
    completedBeats: [],
    pendingBeat: null,
    beatAcknowledged: true,
    weather: "clear",
    morningHeadline: "New winter — Dutch Hill again.",
    daysWithoutSnow: 0,
    reputation: 40,
    gunsVisible: false,
    groomVisible: false,
    nightRecap: null,
    lastDay: null,
    founderId,
    guests: createInitialGuests(arrivals, rand, false),
    dayStats: { ...emptyDayStats(), arrivals },
    talentToast: null,
    rngState: rng.state(),
  };
}

export function nextTalentHint(state: GameState): string | null {
  return nextTalentName(state.talentsOwned);
}
