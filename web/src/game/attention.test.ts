import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { needsAttention } from "./attention";
import { REFERENCE_TOPS } from "./descent";
import { pickFounder } from "./rules";
import { makeGuest } from "./sim";
import type { GameState } from "./state";
import { TERRAIN } from "./terrain";

const day = (): GameState => pickFounder(createBuiltHill(7), "elena");

/** Six guests who have waited ten minutes a ride, enough for a "Guests want" line about lift lines. */
function withLongLines(state: GameState): GameState {
  const guests = Array.from({ length: 6 }, (_, i) =>
    makeGuest({ id: `q${i}`, state: "ski", waitMin: 60, waitCount: 6, runs: 6 }));
  return {
    ...state,
    guests,
    dayStats: { ...state.dayStats, byLift: [{ rides: 6, waitSumMin: 60 }], dispatched: 6, waitSumMin: 60 },
  };
}

const bareTrails = (state: GameState) =>
  state.trails.map((t) => ({ ...t, snow: t.snow.map((s) => ({ ...s, depth: 0, coverage: 0, quality: 0.2 })) }));

describe("needsAttention", () => {
  it("is empty on a healthy hill", () => {
    expect(needsAttention(day())).toEqual([]);
  });

  it("flags cash below zero first, as one full sentence", () => {
    const items = needsAttention({ ...day(), cash: -400 });
    expect(items[0]).toEqual({
      id: "cash-negative",
      text: "Cash is −$400. 3 mornings in a row below zero and the bank closes the book on your winter.",
    });
  });

  it("flags low cash, but not at the threshold", () => {
    const low = needsAttention({ ...day(), cash: 900 });
    expect(low).toEqual([{ id: "cash-low", text: "Cash is down to $900. Hold off on building until the ticket window catches up." }]);
    expect(needsAttention({ ...day(), cash: 1500 })).toEqual([]);
  });

  it("names a built lift that has no open trail and frames it", () => {
    const base = day();
    const second = { ...base.lifts[0], anchor: { x: REFERENCE_TOPS[0].x + 5, z: REFERENCE_TOPS[0].z + 5 } };
    const items = needsAttention({ ...base, lifts: [...base.lifts, second] });
    expect(items).toEqual([{
      id: "lift-no-trail-1",
      text: "Surface lift 2 has no open trail yet. Paint one from the top so guests have somewhere to go.",
      focus: [TERRAIN.base, second.anchor],
    }]);
  });

  it("ignores a lift that is still a draft", () => {
    const base = day();
    expect(needsAttention({ ...base, lifts: [...base.lifts, { ...base.lifts[0], confirmed: false }] })).toEqual([]);
  });

  it("reports a wind hold only inside the hold window", () => {
    const base = day();
    const chair = { ...base.lifts[0], type: "chair" as const };
    const gusty = base.weatherDays.map((w, i) => (i === base.dayIndex - 1 ? { ...w, wind: "gusty" as const } : w));
    const windy = { ...base, lifts: [chair], weatherDays: gusty };
    expect(needsAttention({ ...windy, clockMin: 11 * 60 }).map((i) => i.text))
      .toEqual(["Double chair 1 is on wind hold until 1:00 PM. Dana says nobody is happy and everybody is safe."]);
    expect(needsAttention({ ...windy, clockMin: 14 * 60 })).toEqual([]);
  });

  it("turns the recap's Guests want logic into an item once enough guests have arrived", () => {
    expect(needsAttention(withLongLines(day()))).toEqual([
      { id: "guests-want", text: "The lift line got long enough to need its own zip code. It ran over 10 minutes, so guests want a second lift." },
    ]);
  });

  it("waits for five arrivals before trusting a Guests want line", () => {
    const crowded = withLongLines(day());
    expect(needsAttention({ ...crowded, guests: crowded.guests.slice(0, 4) })).toEqual([]);
  });

  it("flags bad snow with the trouble phrase and a next step", () => {
    const base = day();
    const items = needsAttention({ ...base, trails: bareTrails(base) });
    expect(items.map((i) => i.id)).toEqual(["snow"]);
    expect(items[0].text).toMatch(/^.+\. Pick more snow and service tonight at closing\.$/);
  });

  it("does not list bad snow twice when Guests want already asks for better snow", () => {
    const base = day();
    const guests = Array.from({ length: 6 }, (_, i) =>
      makeGuest({ id: `s${i}`, state: "ski", runs: 3, snowSum: 0.6 }));
    const items = needsAttention({ ...base, trails: bareTrails(base), guests, snowQuality: 0.2 });
    const ids = items.map((i) => i.id);
    expect(ids.filter((id) => id === "snow" || id === "guests-want")).toHaveLength(1);
  });

  it("writes every item as a sentence with no em dash or middle dot", () => {
    const items = needsAttention(withLongLines({ ...day(), cash: -50 }));
    expect(items.length).toBeGreaterThan(1);
    for (const item of items) {
      expect(item.text).toMatch(/\.$/);
      expect(item.text).not.toMatch(/—|·/);
    }
  });

  it("does not change the state it reads", () => {
    const base = withLongLines(day());
    const before = structuredClone(base);
    needsAttention(base);
    expect(base).toEqual(before);
  });
});
