import { clearingCells } from "./clearing";
import { migrateLegacyGuns } from "./guns";
import { createInitialState, SAVE_VERSION, toPersisted, type LiftSlot, type PersistedState } from "./state";
import type { XZ } from "./terrain";
import { buildTrailRun, fallLineTrailForLift, segmentElevationsForPath, type TrailRun } from "./trails";
import type { Trail } from "./snow";
import type { DayStats } from "./types";
import { validateSave } from "./saveValidation";

export { validateSave } from "./saveValidation";

export type Raw = Record<string, unknown>;
export type Migration = { to: number; note: string; up: (p: Raw) => Raw };

// These defaults describe the legacy Dutch Hill schema. New game defaults can
// change independently. Retain the old route and clearing geometry for replay.
const DAY_START = 450;
const DEPTH = 0.45;
const QUALITY = 0.55;
const WIDTH = 60;
const FARE = { cheap: 35, balanced: 48, expensive: 62 } as const;
const ZERO_STATS = {
  arrivals: 0, guestsArrived: 0, completedRuns: 0, runsPerGuest: 0, turnedAway: 0, peakOnHill: 0,
  avgQueueMin: 0, dispatched: 0, waitSumMin: 0, maxQueueLength: 0, peakWaitMin: 0,
};
type LegacyLift = LiftSlot & { trail?: Trail };
const RIDGE = { x: -7.2, z: 1.2, label: "Ridge" };
const legacyLift = (): LegacyLift => ({
  type: "surface", anchor: { ...RIDGE },
  confirmed: true, queue: [], dispatchCredit: 0,
});
const LEGACY_VENUES = {
  warming_hut: { x: 3.6, z: 14.5 },
  cafe: { x: 7.7, z: 14.7 },
  shop: { x: 8.9, z: 15.9 },
} as const;

// Migrations read only the fields of the older schema that they transform.
// The finished object is always checked before the type reaches gameplay.
type Legacy = Partial<Omit<PersistedState, "buildings" | "lifts">> & {
  buildings?: (PersistedState["buildings"][number] | "lodge")[];
  lifts?: LegacyLift[];
  selectedSlotIndex?: number;
};
const step = (to: number, note: string, update: (p: Legacy) => void): Migration => ({
  to, note,
  up: (p) => {
    const next = { ...p };
    update(next as Legacy);
    return next;
  },
});

function legacySnow(depth = DEPTH, quality = QUALITY): Trail {
  const clamp = (v: number) => Math.max(0, Math.min(v, 1));
  return Array.from({ length: 6 }, () => ({
    depth: clamp(depth), quality: clamp(quality), coverage: clamp(depth / 0.15),
  }));
}

function keepUsableLifts(p: Legacy) {
  const point = (at: XZ | undefined) => !!at && Number.isFinite(at.x) && Number.isFinite(at.z);
  if (Array.isArray(p.lifts) && p.lifts.length > 0 && p.lifts.length <= 3 &&
    p.lifts.every((lift) => point(lift?.anchor) && (lift.bottom === undefined || point(lift.bottom)))) return;
  p.lifts = [legacyLift()];
  p.guests = p.guests?.map((guest) => ({ ...guest, liftIndex: undefined }));
}

export const MIGRATIONS: readonly Migration[] = [
  step(1, "Store RNG state and night recap. A night without a recap resumes as a day.", (p) => {
    if (p.phase === "night" && !p.nightRecap) {
      p.phase = "day";
      p.pendingBeat = null;
      p.beatAcknowledged = true;
    }
    // The unseeded v0 format is the lone exception to deterministic migrations.
    p.rngState ??= Math.floor(Math.random() * 0x100000000);
    p.nightRecap ??= null;
  }),
  step(2, "Add lift queues and queue statistics.", (p) => {
    p.lifts = (p.lifts ?? [legacyLift()]).map((lift) => ({
      ...lift, queue: lift.queue ?? [], dispatchCredit: lift.dispatchCredit ?? 0,
    }));
    p.dayStats = { ...ZERO_STATS, ...p.dayStats, avgQueueMin: 0 } as DayStats;
  }),
  step(3, "Give old guests the Regular persona and convert old departed guests.", (p) => {
    p.guests = (p.guests ?? []).map((guest) => guest.persona ? guest : Object.assign(
      { id: "g", label: "Guest", mood: 0.8, progress: 0, persona: "regular", energy: 1, runs: 0, targetRuns: 13 },
      guest,
      {
        state: guest.state === "depart" ? "gone" as const : guest.state,
        arriveAtMin: DAY_START, stateSinceMin: (p.clockMin ?? DAY_START) - (guest.progress ?? 0) * 8,
      },
    ));
    const arrived = p.guests.filter((guest) => guest.state !== "pending").length;
    const stats = { ...ZERO_STATS, ...p.dayStats } as DayStats;
    p.dayStats = {
      ...stats,
      guestsArrived: p.dayStats?.guestsArrived ?? arrived,
      runsPerGuest: arrived > 0 ? stats.completedRuns / arrived : 0,
    };
  }),
  step(4, "Start per-guest wait and snow tallies and add recap satisfaction terms.", (p) => {
    p.guests = (p.guests ?? []).map((guest) => ({
      ...guest, waitMin: guest.waitMin ?? 0, waitCount: guest.waitCount ?? 0, snowSum: guest.snowSum ?? 0,
    }));
    if (p.nightRecap && !p.nightRecap.breakdown) {
      p.nightRecap = { ...p.nightRecap, breakdown: { arrivalMood: 0, queue: 0, snow: 0, value: 0, runs: 0 } };
    }
  }),
  step(5, "Convert global snow depth and quality to per-lift trail segments.", (p) => {
    const depth = p.snowDepth ?? DEPTH;
    const quality = p.snowQuality ?? QUALITY;
    p.lifts = (p.lifts ?? [legacyLift()]).map((lift) => ({ ...lift, trail: lift.trail ?? legacySnow(depth, quality) }));
    const open = p.lifts.filter((lift) => lift.confirmed);
    const segments = (open.length ? open : p.lifts).flatMap((lift) => lift.trail ?? []);
    p.snowDepth = segments.reduce((sum, segment) => sum + segment.depth, 0) / (segments.length || 1);
    p.snowQuality = segments.reduce((sum, segment) => sum + segment.quality, 0) / (segments.length || 1);
    p.gunReach ??= 0;
  }),
  step(6, "Store the previous day and reconstruct facts on old night recaps.", (p) => {
    p.lastDay ??= null;
    if (p.nightRecap && !p.nightRecap.facts) {
      const stats = { ...ZERO_STATS, ...p.dayStats };
      p.nightRecap = {
        ...p.nightRecap,
        facts: {
          avgWaitMin: stats.avgQueueMin, snowQuality: p.snowQuality ?? QUALITY, snowLabel: "Good cover",
          farePrice: FARE[p.fare ?? "balanced"], hillValue: 45, runsPerGuest: stats.runsPerGuest,
          turnedAway: stats.turnedAway, arrivalMood: 0.7,
        },
      };
    }
  }),
  step(7, "Remove the selected slot and replace unusable legacy lifts.", (p) => {
    delete p.selectedSlotIndex;
    keepUsableLifts(p);
  }),
  step(8, "Scale Dutch Hill lift terminals from design units to world units.", (p) => {
    keepUsableLifts(p);
    const scale = (n: number) => Math.round(n * 6 * 1e6) / 1e6;
    const point = ({ x, z }: XZ) => ({ x: scale(x), z: scale(z) });
    const starter = p.lifts?.[0]?.anchor;
    // The repair above uses a world-space starter. Real v0–7 saves store the design-space starter.
    if (starter?.x === RIDGE.x && starter.z === RIDGE.z) return;
    p.lifts = p.lifts?.map((lift) => ({
      ...lift, anchor: point(lift.anchor), ...(lift.bottom ? { bottom: point(lift.bottom) } : {}),
    }));
  }),
  step(9, "Move per-lift snow onto independent trail runs.", (p) => {
    const lifts = p.lifts ?? [legacyLift()];
    p.trails = lifts.map((lift, i) => {
      const snow = lift.trail ?? legacySnow();
      return i === 0
        ? buildTrailRun(0, lift.anchor, snow, { name: "Dutch Meadows", gentle: true, open: lift.confirmed })
        : fallLineTrailForLift(i, lift, snow);
    });
    p.lifts = lifts.map(({ trail, ...lift }) => {
      void trail;
      return lift;
    });
  }),
  step(10, "Add sampled elevations to every trail.", (p) => {
    p.trails = p.trails?.map((trail) => ({ ...trail, elevations: trail.elevations ?? segmentElevationsForPath(trail.path) }));
  }),
  step(11, "Give the hill a permanent tier-one lodge.", (p) => {
    p.lodgeTier ??= 1;
    delete p.assets;
    p.buildings = p.buildings?.filter((id) => id !== "lodge");
  }),
  step(12, "Give existing trails their original 60-foot brush width.", (p) => {
    p.trails = p.trails?.map((trail) => ({ ...trail, widths: trail.widths ?? trail.path.map(() => WIDTH) }));
  }),
  step(13, "Lay out legacy venues, convert snow guns, and initialize M2 day statistics.", (p) => {
    const buildings = p.buildings ?? ["warming_hut"];
    p.lodgeTier ??= 1;
    p.lodgeUpgrade ??= null;
    p.assets ??= [...new Set(buildings)].flatMap((id) => id === "warming_hut" || id === "cafe" || id === "shop"
      ? [{ id, at: { ...LEGACY_VENUES[id] }, styleId: "1950s-timber" }]
      : []);
    p.buildings = buildings.filter((id) => id !== "lodge" && id !== "snow_guns");
    p.dayStats = { ...ZERO_STATS, byLift: [], runsByTrail: [], venueRevenue: {}, refuels: 0, balked: 0, seatsFullMin: 0, ...p.dayStats };
    p.trails = p.trails?.map((trail) => ({ ...trail, widths: trail.widths ?? trail.path.map(() => WIDTH) }));
    p.guns = buildings.includes("snow_guns") ? migrateLegacyGuns(p.trails ?? [], p.dayIndex ?? 1) : [];
    p.gunsVisible = false;
  }),
  step(14, "Record existing trail clearing without charging again.", (p) => {
    p.clearedCells = [...new Set((p.trails ?? []).flatMap((trail: TrailRun) =>
      clearingCells(trail.path, trail.widths ?? trail.path.map(() => WIDTH)),
    ))].sort();
  }),
];

type MigrationResult =
  | { state: PersistedState; reset: false }
  | { state: PersistedState; reset: true; reason: string };

export function migrate(persisted: unknown, fromVersion: number): MigrationResult {
  const reset = (reason: string): MigrationResult => ({
    state: toPersisted(createInitialState()), reset: true, reason,
  });
  if (fromVersion > SAVE_VERSION) return reset("newer version");
  if (!Number.isInteger(fromVersion) || fromVersion < 0) return reset("invalid version");
  if (!persisted || typeof persisted !== "object" || Array.isArray(persisted)) return reset("invalid save");
  let raw = persisted as Raw;
  try {
    for (const migration of MIGRATIONS.slice(fromVersion)) raw = migration.up(raw);
  } catch {
    return reset("invalid legacy fields");
  }
  const errors = validateSave(raw);
  if (errors.length) return reset(errors.join(", "));
  return { state: toPersisted(raw as PersistedState), reset: false };
}
