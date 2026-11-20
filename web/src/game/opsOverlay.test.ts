import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { pickFounder } from "./rules";
import { crowdMarkers, demandPin, opsReadout, revenueMarkers } from "./opsOverlay";

describe("opsOverlay", () => {
  const state = pickFounder(createBuiltHill(88), "elena");

  it("lists a crowd marker per confirmed lift", () => {
    const markers = crowdMarkers(state);
    expect(markers.length).toBe(state.lifts.filter((l) => l.confirmed).length);
    expect(markers[0]).toMatchObject({ queue: expect.any(Number), band: expect.any(String) });
  });

  it("returns revenue markers only for revenue assets", () => {
    const withCafe = {
      ...state,
      assets: [{ id: "cafe" as const, at: { x: 1, z: 2 }, styleId: "1950s-timber" }],
      dayStats: { ...state.dayStats, venueRevenue: { cafe: 18 } },
    };
    const markers = revenueMarkers(withCafe);
    expect(markers).toHaveLength(1);
    expect(markers[0].today).toBe(18);
  });

  it("reads ops layers at a lift bottom", () => {
    const markers = crowdMarkers(state);
    const r = opsReadout("crowds", state, markers[0].at);
    expect(r.headline).toBeTruthy();
    expect(r.chips[0]).toMatch(/waiting/);
  });

  it("omits demand pin before any settled day", () => {
    expect(demandPin(state)).toBeNull();
  });
});