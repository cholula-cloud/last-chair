import { TALENT } from "./talents";
import type { SnowPreset, WeatherKind } from "./types";

/**
 * Snow lives on each lift's trail as segments from the top (index 0) to the
 * bottom. Each segment has three scalars in 0-1 (see SIMULATION_SPEC, Snow).
 * The global `snowQuality` / `snowDepth` in game state are derived: the means
 * over every segment of every open lift (`deriveSnow`).
 */
export type Segment = {
  /** Keeps the run open. */
  depth: number;
  /** Corduroy / fresh (high) to scraped / ice (low). */
  quality: number;
  /** Fraction of the segment that is skiable; low means bare patches. */
  coverage: number;
};

export type Trail = Segment[];

export const TRAIL_SEGMENTS = 6;
/** Segment depth below which the cover breaks up (SIMULATION_SPEC minDepth). */
export const COVER_MIN = 0.15;
/** A segment under this coverage makes the trail "thin". */
export const THIN_COVERAGE = 0.3;
/** A bottom segment under this coverage is bare: guests ski it but complain. */
export const BARE_COVERAGE = 0.1;

export const START_DEPTH = 0.45;
export const START_QUALITY = 0.55;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** 1 at the top of the trail, 0 at the bottom (index-based fallback). */
export function segmentElevation(i: number, n: number = TRAIL_SEGMENTS): number {
  return n <= 1 ? 0.5 : 1 - i / (n - 1);
}

export function elevationAt(
  i: number,
  n: number,
  elevations?: readonly number[],
): number {
  const e = elevations?.[i];
  if (e !== undefined) return clamp01(e);
  return segmentElevation(i, n);
}

export function freshTrail(
  depth: number = START_DEPTH,
  quality: number = START_QUALITY,
  n: number = TRAIL_SEGMENTS,
): Trail {
  return Array.from({ length: n }, () => ({
    depth,
    quality,
    coverage: coverageFromDepth(depth),
  }));
}

/** Coverage implied by depth alone (full above COVER_MIN, shrinking below it). */
export function coverageFromDepth(depth: number): number {
  return clamp01(depth / COVER_MIN);
}

/** A trail with the same value on every segment (old saves had one global depth and quality). */
export function trailFromGlobals(depth: number, quality: number): Trail {
  return freshTrail(clamp01(depth), clamp01(quality));
}

type HasTrail = { confirmed: boolean; trail: Trail; elevations?: readonly number[] };

function openCarriers(lifts: readonly HasTrail[]): HasTrail[] {
  const open = lifts.filter((l) => l.confirmed);
  return open.length > 0 ? open : [...lifts];
}

function openTrails(lifts: readonly HasTrail[]): Trail[] {
  return openCarriers(lifts).map((l) => l.trail);
}

function meanOf(trails: readonly Trail[], key: keyof Segment): number {
  let sum = 0;
  let n = 0;
  for (const t of trails) {
    for (const s of t) {
      sum += s[key];
      n += 1;
    }
  }
  return n > 0 ? sum / n : 0;
}

/** Hill-wide means used by the HUD, arrivals and story beats. Derived: never set them by hand. */
export function deriveSnow(lifts: readonly HasTrail[]): { snowQuality: number; snowDepth: number } {
  const trails = openTrails(lifts);
  return { snowQuality: meanOf(trails, "quality"), snowDepth: meanOf(trails, "depth") };
}

/** Per-segment mean of several trails: the starting trail of a newly built lift. */
export function averageTrail(trails: readonly Trail[]): Trail {
  if (trails.length === 0) return freshTrail();
  const n = trails[0].length;
  return Array.from({ length: n }, (_, i) => ({
    depth: trails.reduce((a, t) => a + (t[i]?.depth ?? 0), 0) / trails.length,
    quality: trails.reduce((a, t) => a + (t[i]?.quality ?? 0), 0) / trails.length,
    coverage: trails.reduce((a, t) => a + (t[i]?.coverage ?? 1), 0) / trails.length,
  }));
}

// --- What a guest feels -----------------------------------------------------

/** Weight of the worst segment in the experienced snow (the rest is the mean): ice at the bottom ruins a run. */
export const WORST_WEIGHT = 0.5;
/** Points of quality docked while any segment is thin, and extra while the bottom is bare. */
export const THIN_PENALTY = 0.1;
export const BARE_PENALTY = 0.15;

/** Snow quality (0-1) a guest feels over a whole run down this trail. */
export function experiencedSnow(trail: Trail): number {
  if (trail.length === 0) return START_QUALITY;
  let sum = 0;
  let min = 1;
  for (const s of trail) {
    sum += s.quality;
    min = Math.min(min, s.quality);
  }
  let v = WORST_WEIGHT * min + (1 - WORST_WEIGHT) * (sum / trail.length);
  if (trail.some((s) => s.coverage < THIN_COVERAGE)) v -= THIN_PENALTY;
  if (trail[trail.length - 1].coverage < BARE_COVERAGE) v -= BARE_PENALTY;
  return clamp01(v);
}

// --- Overnight --------------------------------------------------------------

/** Quality a groomed night lifts every segment to at least (before talents). */
export const GROOM_TARGET: Record<SnowPreset, number> = { minimal: 0, mid: 0.6, high: 0.75 };
/** Extra crispness a fresh groom adds on top of the target. */
export const GROOM_CRISP: Record<SnowPreset, number> = { minimal: 0, mid: 0.03, high: 0.06 };
/** `groom_pass` / `corduroy` talents raise the groom target. */
export const GROOM_TALENT_BONUS = TALENT.groomPass.quality;
export const QUALITY_CAP = 0.95;
/** Scraped snow drifts down on a Minimal night (no groom). */
export const MINIMAL_DRIFT = 0.04;
export const QUALITY_FLOOR = 0.2;
/** Depth the groomer pushes onto every segment (no guns). */
export const GROOM_PUSH: Record<SnowPreset, number> = { minimal: 0, mid: 0.04, high: 0.06 };
/** Depth the guns add on each segment they reach. */
export const GUN_DEPTH: Record<SnowPreset, number> = { minimal: 0, mid: 0.14, high: 0.2 };
/** Fraction of the trail, measured from the bottom, the guns reach. */
export const GUN_REACH: Record<SnowPreset, number> = { minimal: 0, mid: 0.5, high: 1 };
export const TRAIL_GUNS_EXTRA_REACH = TALENT.trailGuns.extraReach;
/** Coverage a Mid groom wins back where depth allows. High restores it fully. */
export const MID_COVERAGE_RECOVERY = 0.3;

export type NightInputs = {
  snow: SnowPreset;
  weather: WeatherKind;
  hasGuns: boolean;
  hasTrailGuns: boolean;
  hasGroom: boolean;
  corduroy?: boolean;
  snowFences?: boolean;
};

/** Fraction of the trail from the bottom that the guns cover tonight (0 when they do not fire). */
export function gunReach(o: Pick<NightInputs, "snow" | "hasGuns" | "hasTrailGuns">): number {
  const fires = o.snow !== "minimal" && o.hasGuns;
  if (!fires) return 0;
  const extra = o.hasGuns && o.hasTrailGuns ? TRAIL_GUNS_EXTRA_REACH : 0;
  return Math.min(1, GUN_REACH[o.snow] + extra);
}

/** Whether a segment is within a reach measured from the bottom of the trail. */
export function inReach(
  i: number,
  reach: number,
  n: number = TRAIL_SEGMENTS,
  elevations?: readonly number[],
): boolean {
  return elevationAt(i, n, elevations) <= reach + 1e-9;
}

function settleCoverage(s: Segment): Segment {
  return s.depth < COVER_MIN
    ? { ...s, coverage: Math.min(s.coverage, coverageFromDepth(s.depth)) }
    : s;
}

/** One night on one trail: the player's preset first, then the weather. Pure. */
export function overnightTrail(
  trail: Trail,
  o: NightInputs,
  elevations?: readonly number[],
  gunCoverage?: readonly boolean[],
  groomCoverage?: readonly boolean[],
  exposure?: readonly number[],
): Trail {
  const n = trail.length;
  const reach = gunCoverage ? 0 : gunReach(o);
  const target = GROOM_TARGET[o.snow] + (o.hasGroom ? GROOM_TALENT_BONUS : 0) + (o.corduroy ? TALENT.corduroy.quality : 0);

  return trail.map((seg, i) => {
    const e = elevationAt(i, n, elevations);
    let { depth, quality, coverage } = seg;

    // Gun coverage and grooming use separate segment budgets.
    const guns = gunCoverage ? gunCoverage[i] : reach > 0 && inReach(i, reach, n, elevations);
    if (guns) depth += GUN_DEPTH[o.snow];
    if (groomCoverage ? groomCoverage[i] : o.snow !== "minimal") {
      depth += GROOM_PUSH[o.snow];
      quality = Math.min(QUALITY_CAP, Math.max(quality, target) + GROOM_CRISP[o.snow]);
      if (depth >= COVER_MIN) {
        coverage = o.snow === "high" ? 1 : Math.min(1, coverage + MID_COVERAGE_RECOVERY);
      }
    } else {
      quality = Math.max(QUALITY_FLOOR, quality - MINIMAL_DRIFT);
    }
    depth = clamp01(depth);

    // Weather.
    const low = (1 - e) * (1 - e);
    const exposed = 1 + 0.3 * (exposure?.[i] ?? 0);
    if (o.weather === "snow") {
      depth = clamp01(depth + 0.12 + 0.08 * e);
      quality = Math.min(QUALITY_CAP + 0.02, quality + 0.06 + 0.04 * e);
      if (depth >= COVER_MIN) coverage = 1;
    } else if (o.weather === "storm") {
      depth = clamp01(depth + 0.22 + 0.10 * e);
      quality = Math.min(QUALITY_CAP + 0.02, quality + 0.10);
      if (depth >= COVER_MIN) coverage = 1;
    } else if (o.weather === "thaw") {
      depth = Math.max(0.02, depth - (0.02 + 0.12 * low) * exposed * (o.snowFences && i >= n - TALENT.snowFences.segments ? TALENT.snowFences.depthLoss : 1));
      quality = Math.max(0.1, quality - (0.04 + 0.16 * low) * exposed);
    } else {
      depth = Math.max(0.02, depth - 0.01 * exposed);
      quality = Math.max(0.1, quality - 0.02);
    }
    return settleCoverage({ depth, quality, coverage });
  });
}

// --- Daytime ----------------------------------------------------------------

/** Quality a segment loses per finished run down the trail (traffic scrapes it). */
export const WEAR_PER_RUN = 0.0006;
/** Thaw days soften low segments from this clock minute (11:00). */
export const THAW_START_MIN = 11 * 60;
/** Quality lost per game minute at the bottom of the trail on a thaw afternoon. */
export const THAW_PER_MIN = 0.0007;

/** Traffic wear from `runs` finished runs. Returns the same trail when nothing changed. */
export function wearTrail(trail: Trail, runs: number): Trail {
  if (runs <= 0) return trail;
  const loss = WEAR_PER_RUN * runs;
  return trail.map((s) => ({ ...s, quality: Math.max(QUALITY_FLOOR / 2, s.quality - loss) }));
}

/** Thaw softening over `minutes` of afternoon: the bottom loses most. Same trail when nothing changed. */
export function softenTrail(
  trail: Trail,
  minutes: number,
  elevations?: readonly number[],
  exposure?: readonly number[],
): Trail {
  if (minutes <= 0) return trail;
  const n = trail.length;
  return trail.map((s, i) => {
    const low = (1 - elevationAt(i, n, elevations)) ** 2;
    return { ...s, quality: Math.max(0.1, s.quality - THAW_PER_MIN * minutes * (0.15 + low) * (1 + 0.3 * (exposure?.[i] ?? 0))) };
  });
}

// --- Reading the trail in words ---------------------------------------------

export type SnowTone = "good" | "watch" | "bad";

export type SnowReading = {
  /** Words for the conditions board: "Icy bottom", "Thin snow", "Good cover", "Fresh corduroy". */
  label: string;
  tone: SnowTone;
  /** Where the worst segment is, or null when the trail is even. */
  where: "top" | "middle" | "bottom" | "even";
  /** Index of the worst segment (0 = top). */
  worstIndex: number;
  /** One phrase naming the trouble for a problem line, e.g. "Bare patches at the bottom of the trail". */
  trouble: string;
};

function whereOf(e: number): SnowReading["where"] {
  return e >= 0.7 ? "top" : e <= 0.3 ? "bottom" : "middle";
}

function segmentScore(s: Segment): number {
  return (
    s.quality - (s.coverage < THIN_COVERAGE ? 0.3 : 0) - (s.coverage < BARE_COVERAGE ? 0.2 : 0)
  );
}

/** The worst segment across every open trail, in words. */
export function readSnow(lifts: readonly HasTrail[]): SnowReading {
  let worst: Segment | null = null;
  let worstIndex = 0;
  let best = -Infinity;
  let n = TRAIL_SEGMENTS;
  let worstElevations: readonly number[] | undefined;
  for (const carrier of openCarriers(lifts)) {
    const trail = carrier.trail;
    trail.forEach((s, i) => {
      best = Math.max(best, segmentScore(s));
      if (worst === null || segmentScore(s) < segmentScore(worst)) {
        worst = s;
        worstIndex = i;
        n = trail.length;
        worstElevations = carrier.elevations;
      }
    });
  }
  const seg: Segment = worst ?? { depth: START_DEPTH, quality: START_QUALITY, coverage: 1 };
  const even = best - segmentScore(seg) < 0.08;
  const where = even ? "even" : whereOf(elevationAt(worstIndex, n, worstElevations));
  if (even && seg.coverage >= THIN_COVERAGE && seg.quality < 0.45) {
    return {
      label: "Icy trail",
      tone: seg.quality < 0.35 ? "bad" : "watch",
      where,
      worstIndex,
      trouble: "Thin, scraped snow across the trail",
    };
  }
  const at =
    where === "middle" ? "in the middle" : where === "top" ? "up top" : where === "even" ? "everywhere" : "at the bottom";
  if (seg.coverage < BARE_COVERAGE || seg.coverage < THIN_COVERAGE) {
    const bare = seg.coverage < BARE_COVERAGE;
    return {
      label: bare ? (where === "bottom" ? "Bare bottom" : "Bare patches") : "Thin snow",
      tone: bare ? "bad" : "watch",
      where,
      worstIndex,
      trouble: `Bare patches ${where === "middle" ? "in the middle of" : where === "even" ? "across" : `at the ${where} of`} the trail`,
    };
  }
  if (seg.quality < 0.45) {
    return {
      label: `Icy ${where}`,
      tone: seg.quality < 0.35 ? "bad" : "watch",
      where,
      worstIndex,
      trouble: `Icy ${at}`,
    };
  }
  if (seg.quality >= 0.75) {
    return { label: "Fresh corduroy", tone: "good", where, worstIndex, trouble: "Snow is fine" };
  }
  return {
    label: "Good cover",
    tone: seg.quality >= 0.6 ? "good" : "watch",
    where,
    worstIndex,
    trouble: `Scraped snow ${at}`,
  };
}

// --- Render keys ------------------------------------------------------------

const STEP = 20;
const q = (v: number) => Math.round(clamp01(v) * STEP) / STEP;

/** Trails snapped to 0.05, so the scene repaints only when the look changes. */
export function snowKey(lifts: readonly HasTrail[]): string {
  return JSON.stringify(
    lifts
      .filter((l) => l.confirmed)
      .map((l) => l.trail.map((s) => [q(s.depth), q(s.quality), q(s.coverage)])),
  );
}

export function decodeSnowKey(key: string): Trail[] {
  const raw = JSON.parse(key) as number[][][];
  return raw.map((t) => t.map(([depth, quality, coverage]) => ({ depth, quality, coverage })));
}
