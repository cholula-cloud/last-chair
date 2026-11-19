import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { assetRevenue, placedAssetsFromLegacy } from "./base";
import { REFERENCE_TOPS } from "./descent";
import { operatingCosts } from "./economy";
import { arrivalMood, canDemolish, checkPlacement, openNight, pickFounder, replyToSummitLink, satisfactionContext, takeLoan } from "./rules";
import { makeGuest, meanArrivals } from "./sim";
import { TERRAIN } from "./terrain";
import type { FounderId, WeatherKind } from "./types";
import { outlookFor } from "./weather";

const hill = (id: FounderId) => pickFounder(createBuiltHill(42), id);

describe("founder bonuses and constraints", () => {
  it("Elena welcomes families and draws two extra visitors", () => {
    expect(arrivalMood(["warming_hut"], "elena")).toBeCloseTo(0.78);
    const state = hill("elena");
    expect(meanArrivals(state)).toBe(meanArrivals({ ...state, founderId: "tom" }) + 2);
  });
  it("Elena retains the original warming hut", () => {
    expect(canDemolish(hill("elena"), "warming_hut")).toBe(false);
    expect(canDemolish(hill("riley"), "warming_hut")).toBe(true);
  });
  it("Tom pays 7% across the season", () => {
    const state = hill("tom");
    const loan = takeLoan(openNight({ ...state, cash: -5000 })).loan!;
    expect(loan.ratePerDay * state.seasonLength).toBeCloseTo(0.07);
  });
  it("Tom loses three welcome points only on repeated thaw days", () => {
    const mood = (kinds: WeatherKind[]) => satisfactionContext({ ...hill("tom"), dayIndex: kinds.length,
      weather: kinds.at(-1)!, weatherDays: kinds.map(kind => ({ kind, wind: "calm" })) }).arrivalMood;
    expect((mood(["clear", "thaw", "thaw"]) - mood(["thaw", "thaw", "thaw"])) * 40).toBeCloseTo(3);
    expect(mood(["thaw", "clear", "clear", "clear", "clear", "clear", "thaw", "thaw"])).toBe(mood(["thaw", "thaw"]));
  });
  it("Riley saves 15% on lift operations", () => {
    expect(operatingCosts(hill("riley")).liftOps).toBe(153);
  });
  it("Riley must decline Vivian’s deal", () => {
    const offer = { ...openNight(hill("riley")), pendingBeat: "summit_link" as const };
    expect(replyToSummitLink(offer, "accepted")).toBe(offer);
    expect(replyToSummitLink(offer, "declined").summitLinkDecision).toBe("declined");
  });
  it("Amira sees two days ahead and gets a sharper tomorrow", () => {
    const state = hill("amira");
    expect(outlookFor(state, 2)).toBeTruthy();
    expect(outlookFor(hill("tom"), 2)).toBeNull();
    expect(outlookFor(state, 1)![state.weatherDays[1].kind]).toBeGreaterThanOrEqual(0.7);
  });
  it("Amira expects five more points of snow quality", () => {
    expect(satisfactionContext(hill("amira")).snowExpectation - satisfactionContext(hill("tom")).snowExpectation).toBeCloseTo(0.05);
  });
  it("Juniper gains a half point before rounding daily reputation", () => {
    const state = { ...hill("juniper"), reputation: 40, guests: [makeGuest({ state: "gone" })] };
    const night = openNight(state);
    expect(night.reputation).toBe(Math.round(40 * 0.85 + night.nightRecap!.satisfaction * 0.15 + 0.5));
  });
  it("Juniper pays 15% more for a lift corridor rounded to $50", () => {
    const line = { bottom: TERRAIN.base, top: REFERENCE_TOPS[1] };
    const quote = (id: FounderId) => checkPlacement({ ...hill(id), lodgeTier: 2 }, "chair", line);
    expect(quote("juniper")).toMatchObject({ ok: true, cost: 2900 });
    expect(quote("tom")).toMatchObject({ ok: true, cost: 2500 });
  });
  it("Marco receives an extra 10% at the café", () => {
    const cafe = placedAssetsFromLegacy(["cafe"])[0];
    expect(assetRevenue(cafe, "marco")).toBeCloseTo(assetRevenue(cafe) * 1.1);
  });
  it("Marco’s programming costs $80 each operating day", () => {
    expect(operatingCosts(hill("marco")).founder).toBe(80);
  });
});
