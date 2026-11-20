import { ASSET_CATALOG, type AssetId } from "./base";
import { liftLineOf } from "./rules";
import { currentWaitMin } from "./sim";
import type { GameState } from "./state";
import type { XZ } from "./terrain";
import { demandContext, topGuestDemand } from "./guestsWant";
import type { NightRecap } from "./sim";
import { onLease } from "./lease";
import { DUTCH_HILL_SITE } from "./mountains/dutchHill.site";

export type OpsLayer = "crowds" | "revenue" | "demand";

export type CrowdBand = "light" | "busy" | "packed";

export type CrowdMarker = {
  liftIndex: number;
  at: XZ;
  queue: number;
  waitMin: number;
  onHill: number;
  band: CrowdBand;
};

export type RevenueMarker = {
  assetId: AssetId;
  label: string;
  at: XZ;
  today: number;
};

export type DemandPin = {
  at: XZ;
  line: string;
  key: string;
};

export function crowdBand(queue: number, waitMin: number, onHill: number): CrowdBand {
  const score = queue + onHill * 0.35 + waitMin / 2;
  if (score < 4) return "light";
  if (score < 10) return "busy";
  return "packed";
}

export function crowdMarkers(state: GameState): CrowdMarker[] {
  return state.lifts
    .map((lift, liftIndex) => {
      if (!lift.confirmed) return null;
      const line = liftLineOf(lift);
      const queue = lift.queue.length;
      const onHill = state.guests.filter(
        (g) =>
          (g.state === "queue" && g.liftIndex === liftIndex) ||
          (g.state === "ride" && g.liftIndex === liftIndex) ||
          (g.state === "ski" && g.liftIndex === liftIndex),
      ).length;
      const waitMin = state.dayStats.byLift[liftIndex]
        ? state.dayStats.byLift[liftIndex].waitSumMin / Math.max(1, state.dayStats.byLift[liftIndex].rides)
        : currentWaitMin(state);
      return {
        liftIndex,
        at: { x: line.bottom.x, z: line.bottom.z },
        queue,
        waitMin: Math.round(waitMin * 10) / 10,
        onHill,
        band: crowdBand(queue, waitMin, onHill),
      };
    })
    .filter((m): m is CrowdMarker => m != null);
}

export function revenueMarkers(state: GameState): RevenueMarker[] {
  const revenue = state.dayStats.venueRevenue ?? {};
  return state.assets
    .map((asset) => {
      const cat = ASSET_CATALOG[asset.id];
      if (!cat.revenuePerUse) return null;
      return {
        assetId: asset.id,
        label: cat.label,
        at: asset.at,
        today: revenue[asset.id] ?? 0,
      };
    })
    .filter((m): m is RevenueMarker => m != null);
}

function recapForDemand(state: GameState): NightRecap | null {
  if (state.phase === "night" && state.nightRecap) return state.nightRecap;
  return state.dayHistory.at(-1)?.recap ?? null;
}

export function demandPin(state: GameState): DemandPin | null {
  const recap = recapForDemand(state);
  if (!recap) return null;
  const demand = topGuestDemand(recap, demandContext(state));
  if (!demand) return null;
  const lodge = DUTCH_HILL_SITE.buildings.lodge;
  let at: XZ = { x: lodge.x, z: lodge.z };
  if (demand.key === "lines") {
    let busiest = -1;
    let bestWait = 0;
    state.dayStats.byLift.forEach((row, i) => {
      const wait = row.rides ? row.waitSumMin / row.rides : 0;
      if (state.lifts[i]?.confirmed && wait > bestWait) {
        bestWait = wait;
        busiest = i;
      }
    });
    if (busiest >= 0) at = liftLineOf(state.lifts[busiest]).bottom;
  } else if (demand.key === "green") {
    const green = state.trails.find((t) => t.open && t.difficulty === "green");
    if (green?.path[0]) at = green.path[0];
  } else if (demand.key === "snow") {
    const trail = state.trails.find((t) => t.open);
    if (trail?.path[Math.floor(trail.path.length / 2)]) {
      at = trail.path[Math.floor(trail.path.length / 2)];
    }
  }
  return { at, line: demand.line, key: demand.key };
}

export function nearestCrowd(markers: CrowdMarker[], point: XZ): CrowdMarker | null {
  let best: { m: CrowdMarker; d: number } | null = null;
  for (const m of markers) {
    const d = Math.hypot(m.at.x - point.x, m.at.z - point.z);
    if (d <= 1.2 && (!best || d < best.d)) best = { m, d };
  }
  return best?.m ?? null;
}

export function nearestRevenue(markers: RevenueMarker[], point: XZ): RevenueMarker | null {
  let best: { m: RevenueMarker; d: number } | null = null;
  for (const m of markers) {
    const d = Math.hypot(m.at.x - point.x, m.at.z - point.z);
    if (d <= 1.4 && (!best || d < best.d)) best = { m, d };
  }
  return best?.m ?? null;
}

export function opsReadout(
  layer: OpsLayer,
  state: GameState,
  point: XZ,
): { headline: string; chips: string[] } {
  if (!onLease(point)) {
    return { headline: "Outside the lease. Crowds and revenue only show on the hill.", chips: [] };
  }
  if (layer === "crowds") {
    const hit = nearestCrowd(crowdMarkers(state), point);
    if (!hit) return { headline: "No lift queue here.", chips: ["Tap a lift bottom for queue length."] };
    return {
      headline:
        hit.band === "packed"
          ? "The line is stacked."
          : hit.band === "busy"
            ? "A steady crowd at the lift."
            : "The queue is short.",
      chips: [
        `${hit.queue} waiting`,
        `${hit.waitMin.toFixed(1)} min avg wait`,
        `${hit.onHill} on the hill for this lift`,
      ],
    };
  }
  if (layer === "revenue") {
    const hit = nearestRevenue(revenueMarkers(state), point);
    if (!hit) return { headline: "No venue here.", chips: ["Tap a café, shop, or lodge wing."] };
    return {
      headline: `${hit.label} earned ${hit.today > 0 ? "revenue today" : "nothing yet today"}.`,
      chips: [`$${hit.today} today`],
    };
  }
  const pin = demandPin(state);
  if (!pin) return { headline: "No pressing guest demand from the last close.", chips: [] };
  const here = Math.hypot(pin.at.x - point.x, pin.at.z - point.z) <= 2;
  return {
    headline: here ? "Guests want something here." : pin.line,
    chips: here ? [pin.line] : ["Tap the pin on the map for last night’s top demand."],
  };
}