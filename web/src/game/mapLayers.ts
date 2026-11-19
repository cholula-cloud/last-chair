import {
  groomCoverage,
  gunCoverage,
  GUN_RADIUS_DESIGN,
  sampleSnowPath,
} from "./guns";
import { onLease } from "./lease";
import { PERSONAS } from "./personas";
import { previewOvernight, skipToClose } from "./rules";
import {
  BARE_COVERAGE,
  COVER_MIN,
  THIN_COVERAGE,
  THAW_START_MIN,
  GUN_DEPTH,
  GROOM_PUSH,
  WEAR_PER_RUN,
  type Segment,
} from "./snow";
import type { GameState } from "./state";
import { TALENT } from "./talents";
import { TERRAIN, type XZ } from "./terrain";
import {
  isOverSkill,
  STANDARD_TRAIL_WIDTH_FT,
  type TrailRun,
} from "./trails";
import { DAY_START_MIN, type SnowPreset, type WeatherKind } from "./types";
import { isWindHeld, weatherForDay, WEATHER_KINDS } from "./weather";

export const LAYERS = {
  slope: "Slope",
  depth: "Snow depth",
  guns: "Snow-making",
  conditions: "Conditions",
} as const;
export type MapLayer = keyof typeof LAYERS;
export type SnowLayer = Exclude<MapLayer,"slope">;
export type MapTime = "Now" | "Close" | "Tomorrow";
export type GunView = "Last night" | "Mid" | "High";
export type Mark = { name: string; color: string; glyph: string };
export const MARKS = {
  neutral: { name: "Not simulated", color: "#aeb3b2", glyph: "–" },
  bare: { name: "Bare · closed", color: "#b18b66", glyph: "×" },
  shallow: { name: "Shallow", color: "#bbbdab", glyph: "·" },
  covered: { name: "Covered", color: "#9bd1df", glyph: "≈" },
  deep: { name: "Deep", color: "#e1edf7", glyph: "≋" },
  last: { name: "Reached last night", color: "#76b4bd", glyph: "◎" },
  groom: { name: "Groomer only", color: "#c7c3da", glyph: "╳" },
  both: { name: "Gun and groomer", color: "#57a918", glyph: "✣" },
  reach: { name: "Gun only", color: "#c0e3d0", glyph: "+" },
  out: { name: "Out of reach", color: "#a3978f", glyph: "╱" },
  fresh: { name: "Fresh corduroy", color: "#def1fc", glyph: "≡" },
  powder: { name: "Packed powder", color: "#edf4ee", glyph: "○" },
  worn: { name: "Worn", color: "#abaebf", glyph: "∴" },
  slush: { name: "Slush", color: "#7abfb3", glyph: "∿" },
  ice: { name: "Ice", color: "#9fc8e3", glyph: "▧" },
  thin: { name: "Thin", color: "#c6ae8b", glyph: "▦" },
  hold: { name: "Wind hold", color: "#d7b5d4", glyph: "↝" },
  wear: { name: "1–99 runs", color: "#d4bd99", glyph: "·" },
  heavyWear: { name: "100+ runs", color: "#ae728a", glyph: "⋮" },
  noWear: { name: "No runs", color: "#d7e0d3", glyph: "○" },
  breakup: { name: "Broken cover", color: "#b18b66", glyph: "×" },
} satisfies Record<string, Mark>;
export type MarkId = keyof typeof MARKS;
export const LEGENDS: Record<SnowLayer, MarkId[]> = {
  depth: ["breakup", "shallow", "covered", "deep", "neutral"],
  guns: ["last", "reach", "out", "neutral"],
  conditions: [
    "fresh",
    "powder",
    "worn",
    "slush",
    "ice",
    "thin",
    "bare",
    "hold",
    "neutral",
  ],
};

export function segmentCondition(
  s: Segment,
  groomed: boolean,
  weather: WeatherKind,
  clock: number,
  elevation: number,
  runs: number,
): MarkId {
  if (s.coverage < BARE_COVERAGE) return "bare";
  if (s.coverage < THIN_COVERAGE) return "thin";
  if (weather === "thaw" && clock >= THAW_START_MIN && elevation < 0.5)
    return "slush";
  if (s.quality < 0.35) return "ice";
  if (groomed && s.quality >= 0.65) return "fresh";
  if (runs > 0 && s.quality < 0.55) return "worn";
  return "powder";
}
export function gunRadius(owned: string[]) {
  return (
    GUN_RADIUS_DESIGN *
    TERRAIN.scale.horizontal *
    (TALENT.trailGuns.learned(owned) ? 1 + TALENT.trailGuns.extraReach : 1)
  );
}

export function overlayModel(
  state: GameState,
  time: MapTime,
  preset: SnowPreset,
) {
  const close = time === "Now" ? state : skipToClose(state);
  const forecast = time === "Tomorrow" ? previewOvernight(close, preset) : null;
  const probable = forecast?.results[forecast.weather].overnight;
  const weather = forecast?.weather ?? state.weather;
  const clock = time === "Tomorrow" ? DAY_START_MIN : close.clockMin;
  const serviceTrails = close.trails.map((t) =>
    close.lifts[t.liftIndex]?.closing ? { ...t, open: false } : t,
  );
  const service = (snow: SnowPreset) =>
    groomCoverage(
      serviceTrails,
      close.dayStats.runsByTrail,
      snow,
      state.talentsOwned,
    );
  const mid = service("mid"),
    high = service("high");
  const trails = close.trails.map((trail, i) => {
    const runs = time === "Tomorrow" ? 0 : (close.dayStats.runsByTrail[i] ?? 0);
    const reach = gunCoverage(trail, state.guns, state.talentsOwned);
    const byGun = state.guns.map((gun) =>
      gunCoverage(trail, [gun], state.talentsOwned),
    );
    const hold =
      time !== "Tomorrow" &&
      isWindHeld(
        close.lifts[trail.liftIndex]?.type ?? "surface",
        weatherForDay(close).wind,
        clock,
        close.talentsOwned,
      );
    return trail.snow.map((present, j) => {
      let snow = probable?.trails[i]?.[j] ?? present;
      if (forecast?.outlook) {
        const mean = { quality: 0, depth: 0, coverage: 0 };
        for (const kind of WEATHER_KINDS) {
          const next =
            forecast.results[kind].overnight.trails[i]?.[j] ?? present;
          for (const key of ["quality", "depth", "coverage"] as const)
            mean[key] += next[key] * forecast.outlook[kind];
        }
        snow = mean;
      }
      const groomed =
        (probable?.groomCoverage?.[i] ?? trail.groomed)?.[j] ?? false;
      const condition = segmentCondition(
        snow,
        groomed,
        weather,
        clock,
        trail.elevations[j],
        runs,
      );
      return {
        snow,
        condition,
        hold,
        runs,
        groomed,
        weather,
        elevation: trail.elevations[j],
        yesterday: trail.previousRuns,
        reached: !!trail.gunCovered?.[j],
        reach: serviceTrails[i].open && reach[j],
        midGroom: mid[i][j],
        highGroom: high[i][j],
        guns: byGun.flatMap((row, index) =>
          row[j]
            ? [{ number: index + 1, count: row.filter(Boolean).length }]
            : [],
        ),
      };
    });
  });
  return { trails, forecast: forecast?.outlook ?? null, weather, clock };
}
export type OverlayModel = ReturnType<typeof overlayModel>;
type Cell = OverlayModel["trails"][number][number];
export function cellMark(
  layer: SnowLayer,
  cell: Cell,
  wear = false,
  gunView: GunView = "Last night",
): MarkId {
  if (layer === "conditions") {
    if (!wear) return cell.condition;
    if (cell.yesterday === undefined) return "neutral";
    if (!cell.yesterday) return "noWear";
    return cell.yesterday >= 100 ? "heavyWear" : "wear";
  }
  if (layer === "guns") {
    if (gunView === "Last night") return cell.reached ? "last" : "out";
    const groomed = gunView === "High" ? cell.highGroom : cell.midGroom;
    if (cell.reach) return groomed ? "both" : "reach";
    return groomed ? "groom" : "out";
  }
  return cell.snow.depth < COVER_MIN
    ? "breakup"
    : cell.snow.depth < 0.3
      ? "shallow"
      : cell.snow.depth < 0.65
        ? "covered"
        : "deep";
}

/** Distance along the nearest point of a painted corridor determines the simulated segment. */
export function segmentAt(trails: TrailRun[], point: XZ) {
  let best: { index: number; segment: number; distance: number } | null = null;
  trails.forEach((trail, index) => {
    let total = 0;
    let nearest = Infinity;
    let at = 0;
    for (let i = 1; i < trail.path.length; i++) {
      const a = trail.path[i - 1],
        b = trail.path[i];
      const dx = b.x - a.x,
        dz = b.z - a.z,
        length = Math.hypot(dx, dz);
      if (!length) continue;
      const t = Math.min(
        1,
        Math.max(
          0,
          ((point.x - a.x) * dx + (point.z - a.z) * dz) / (length * length),
        ),
      );
      const distance = Math.hypot(
        point.x - a.x - t * dx,
        point.z - a.z - t * dz,
      );
      const width =
        (trail.widths?.[i] ?? STANDARD_TRAIL_WIDTH_FT) /
        TERRAIN.horizontalFeetPerUnit;
      if (distance <= width / 2 && distance < nearest) {
        nearest = distance;
        at = total + t * length;
      }
      total += length;
    }
    if (total && Number.isFinite(nearest) && (!best || nearest < best.distance))
      best = {
        index,
        segment: Math.min(
          trail.snow.length - 1,
          Math.floor((trail.snow.length * at) / total),
        ),
        distance: nearest,
      };
  });
  return best as { index: number; segment: number; distance: number } | null;
}
export function readPoint(
  state: GameState,
  model: OverlayModel,
  layer: SnowLayer,
  point: XZ,
  wear: boolean,
  gunView: GunView = "Last night",
) {
  const result = {
    title: "Not simulated",
    detail: "The hill tracks snow on marked trails.",
    personas: [] as string[],
  };
  if (!onLease(point))
    return {
      ...result,
      title: "Outside the lease",
      detail: "Tap inside the lease to inspect the hill.",
    };
  const hit = segmentAt(state.trails, point);
  if (!hit) {
    if (layer === "guns") {
      const gun = state.guns.findIndex(
        (g) =>
          Math.hypot(g.at.x - point.x, g.at.z - point.z) <=
          gunRadius(state.talentsOwned),
      );
      if (gun >= 0)
        return {
          ...result,
          title: `Gun ${gun + 1}`,
          detail:
            "This point is within reach. Snow depth is tracked only on trails.",
        };
    }
    return result;
  }
  const trail = state.trails[hit.index],
    cell = model.trails[hit.index][hit.segment];
  result.title = `${trail.name} · segment ${hit.segment + 1} of ${trail.snow.length}`;
  if (layer === "depth")
    result.detail = `Depth is ${cell.snow.depth.toFixed(2)}. Cover breaks up below ${COVER_MIN}.`;
  if (layer === "guns") {
    const reach = cell.guns
      .map(
        (g) =>
          `Gun ${g.number} reaches ${g.count} of ${trail.snow.length} segments.`,
      )
      .join(" ");
    if (gunView === "Last night") {
      result.detail = cell.reached
        ? "Guns reached this segment last night."
        : "Guns did not reach this segment last night.";
    } else {
      const service = gunView === "High" ? "high" : "mid";
      const groomed = service === "high" ? cell.highGroom : cell.midGroom;
      const added =
        (cell.reach ? GUN_DEPTH[service] : 0) +
        (groomed ? GROOM_PUSH[service] : 0);
      result.detail =
        `${reach} ${gunView} service adds ${added.toFixed(2)} depth before weather and the depth limit.`.trim();
    }
  }
  if (layer === "conditions") {
    const cause: Partial<Record<MarkId, string>> = {
      fresh:
        "The crew groomed this segment and its snow quality is still high.",
      powder:
        "The snow has continuous cover and enough quality for packed powder.",
      worn: `${cell.runs} runs have worn down the surface.`,
      slush: "The afternoon thaw softened this lower segment.",
      ice: `Snow quality has fallen to ${Math.round(cell.snow.quality * 100)}%.`,
      thin: `Only ${Math.round(cell.snow.coverage * 100)}% of this segment has cover.`,
      bare: "Less than a tenth of this segment has cover.",
    };
    result.detail = wear
      ? cell.yesterday === undefined
        ? "Yesterday’s run count is unavailable."
        : `${cell.yesterday} runs wore this segment yesterday, costing up to ${(cell.yesterday * WEAR_PER_RUN).toFixed(2)} quality.`
      : `${MARKS[cell.condition].name}. ${cause[cell.condition]}${cell.hold ? " Its chair is on wind hold." : ""}`;
    result.personas = Object.values(PERSONAS).map((p) => {
      const suitable =
        trail.open &&
        !cell.hold &&
        cell.condition !== "bare" &&
        !isOverSkill(p.id, trail.difficulty) &&
        !(
          p.id === "first_timer" &&
          ["ice", "thin", "slush"].includes(cell.condition)
        );
      return `${p.label} · ${suitable ? "suitable" : "avoid"}`;
    });
  }
  return result;
}
export const segmentPath = (trail: TrailRun, j: number) =>
  sampleSnowPath(
    trail.path,
    Array.from({ length: 13 }, (_, i) => (j + i / 12) / trail.snow.length),
  );
