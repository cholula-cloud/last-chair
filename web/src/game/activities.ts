import { ASSET_CATALOG, assetRevenue, type AssetId, type PlacedAsset } from "./base";
import type { GameState } from "./state";
import { weekdayForDay, seasonCalendar } from "./calendar";

/** Share of arriving guests who buy a tubing ticket when the hill is built. */
const TUBING_PARTICIPATION = 0.22;
/** Share of guests who pay for public skate when the rink is open. */
const RINK_PARTICIPATION = 0.18;

export function activityTicketRevenue(state: Pick<GameState, "assets" | "dayStats" | "founderId">): Partial<
  Record<AssetId, number>
> {
  const guests = state.dayStats.guestsArrived;
  if (guests <= 0) return {};
  const out: Partial<Record<AssetId, number>> = {};
  for (const placed of state.assets) {
    if (placed.id === "tubing_hill") {
      const uses = Math.round(guests * TUBING_PARTICIPATION);
      if (uses > 0) out.tubing_hill = uses * assetRevenue(placed, state.founderId);
    }
    if (placed.id === "ice_rink") {
      const uses = Math.round(guests * RINK_PARTICIPATION);
      if (uses > 0) out.ice_rink = uses * assetRevenue(placed, state.founderId);
    }
  }
  return out;
}

/** Saturday night carnival when tubing and the rink are both on the hill (A5). */
export function winterCarnivalBonus(state: GameState): number {
  const calendar = seasonCalendar(state);
  if (weekdayForDay(calendar, state.dayIndex) !== "Sat") return 0;
  const ids = new Set(state.assets.map((a) => a.id));
  if (!ids.has("tubing_hill") || !ids.has("ice_rink")) return 0;
  return 120 + Math.round(state.dayStats.guestsArrived * 1.5);
}

export function applyActivityEconomy(state: GameState): GameState {
  const tickets = activityTicketRevenue(state);
  const carnival = winterCarnivalBonus(state);
  const keys = Object.keys(tickets) as AssetId[];
  if (keys.length === 0 && carnival === 0) return state;
  const venueRevenue = { ...state.dayStats.venueRevenue };
  let cash = state.cash;
  for (const id of keys) {
    const amount = tickets[id] ?? 0;
    if (amount <= 0) continue;
    venueRevenue[id] = (venueRevenue[id] ?? 0) + amount;
    cash += amount;
  }
  if (carnival > 0) {
    venueRevenue.tubing_hill = (venueRevenue.tubing_hill ?? 0) + Math.round(carnival * 0.55);
    venueRevenue.ice_rink = (venueRevenue.ice_rink ?? 0) + carnival - Math.round(carnival * 0.55);
    cash += carnival;
  }
  return {
    ...state,
    cash,
    dayStats: { ...state.dayStats, venueRevenue, intradayRevenue: true },
  };
}

export function kitForAsset(id: AssetId): string | undefined {
  const map: Partial<Record<AssetId, string>> = {
    tubing_hill: "tubing-hut",
    ice_rink: "ice-rink",
    apres_bar: "apres-bar",
    fire_pit: "fire-pit",
    string_lights: "string-lights",
    cafe: "cafe",
    shop: "ski-shop",
    warming_hut: "warming-hut",
    rentals: "ski-shop",
    ski_school: "warming-hut",
  };
  return map[id];
}

export function placedActivityKits(assets: readonly PlacedAsset[]): { id: AssetId; at: import("./terrain").XZ; kit: string }[] {
  return assets.flatMap((asset) => {
    const kit = kitForAsset(asset.id);
    return kit ? [{ id: asset.id, at: asset.at, kit }] : [];
  });
}