import { describe, expect, it } from "vitest";
import { createBuiltHill } from "./__fixtures__/built-hill";
import { CREW_TALENTS, talentDescription } from "./content";
import { operatingCosts } from "./economy";
import { liftCapacityPerHour } from "./lifts";
import { acknowledgeBeat, openNight, pickFounder, previewOvernight, satisfactionContext, sleep } from "./rules";
import { expectedHillValue, guestTerms } from "./satisfaction";
import { applyOvernight, makeGuest, meanArrivals, tickGuests } from "./sim";
import { freshTrail } from "./snow";
import { migrate } from "./migrations";
import { SAVE_VERSION, toPersisted, type GameState } from "./state";
import { LIFT_CLOSE_MIN, type WeatherKind } from "./types";
import { isWindHeld } from "./weather";

const hill = pickFounder(createBuiltHill(42), "elena");
const withTalent = (id: string, state = hill): GameState => ({ ...state, talentsOwned: [id] });
const mood = (dayIndex: number, talent = "") => satisfactionContext({ ...withTalent(talent), dayIndex }).arrivalMood;
const overnight = (talentsOwned: string[], weather: WeatherKind = "clear") => applyOvernight({
  ...hill, talentsOwned, trails: [freshTrail(0.6, 0.4)], snow: "mid", weatherTomorrow: { kind: weather, wind: "calm" },
}).trails[0];

describe("crew order and operations", () => {
  it("learns all twenty in fixed order and explains missing facilities", () => {
    expect(new Set(CREW_TALENTS.map(talent => talent.id)).size).toBe(20);
    let state = { ...hill, cash: 100_000 };
    for (const talent of CREW_TALENTS) {
      state = sleep(acknowledgeBeat(openNight(state)));
      expect(state.crewPoints).toBe(0);
      expect(state.talentsOwned.at(-1)).toBe(talent.id);
    }
    expect(state.dayIndex).toBe(21);
    while (state.phase === "day") state = sleep(acknowledgeBeat(openNight(state)));
    expect(state.phase).toBe("winter_review");
    expect(state.talentsOwned).toEqual(CREW_TALENTS.map(talent => talent.id));
    expect(talentDescription("Wind Hold", state)).toContain("Waits for a chair");
  });
  it("resumes the fixed learning order after loading an earlier sequence", () => {
    const owned = ["rope_tow", "trail_guns", "house_band", "groom_pass"];
    const saved = toPersisted({ ...hill, talentsOwned: owned });
    const loaded = migrate(JSON.parse(JSON.stringify(saved)), SAVE_VERSION);
    expect(loaded.reset).toBe(false);
    expect(loaded.state.talentsOwned).toEqual(owned);
    const morning = sleep(acknowledgeBeat(openNight({ ...hill, ...loaded.state, crewPoints: 0 })));
    expect(morning.talentsOwned).toEqual([...owned, "ticket_booth"]);
  });
  it("rope tow saves $40 per open surface lift", () => {
    expect(operatingCosts(withTalent("rope_tow")).liftOps).toBe(operatingCosts(hill).liftOps - 40);
  });
  it("trail guns reach farther when a gun is installed", () => {
    const run = (talentsOwned: string[]) => applyOvernight({ ...hill, talentsOwned, trails: [freshTrail()],
      snow: "mid", buildings: ["snow_guns"], weatherTomorrow: { kind: "clear", wind: "calm" } });
    expect(run(["trail_guns"]).gunReach).toBeGreaterThan(run([]).gunReach);
  });
  it("groom pass raises groom quality seven points", () => {
    expect(overnight(["groom_pass"])[0].quality - overnight([])[0].quality).toBeCloseTo(0.07);
  });
  it.each([6, 22])("ticket booth adds one visitor on day %i", dayIndex => {
    expect(meanArrivals({ ...withTalent("ticket_booth"), dayIndex })).toBe(meanArrivals({ ...hill, dayIndex }) + 1);
  });
  it("ticket booth leaves weekday demand alone", () => {
    expect(meanArrivals({ ...withTalent("ticket_booth"), dayIndex: 2 })).toBe(meanArrivals({ ...hill, dayIndex: 2 }));
  });
  it("patrol radio increases capacity by five percent", () => {
    expect(liftCapacityPerHour("surface", ["patrol_radio"])).toBeCloseTo(liftCapacityPerHour("surface", []) * 1.05);
  });
  it("school day brings two extra weekday arrivals", () => {
    expect(meanArrivals(withTalent("school_day"))).toBe(meanArrivals(hill) + 2);
  });
  it("house band plays Friday through Sunday and holidays", () => {
    for (const day of [5, 6, 7, 22]) expect(mood(day, "house_band") - mood(day)).toBeCloseTo(0.03);
    expect(mood(2, "house_band")).toBe(mood(2));
  });
  it("café shift needs a café to add two dollars of value", () => {
    const state = withTalent("cafe_shift");
    expect(satisfactionContext(state).venueValue).toBe(satisfactionContext(hill).venueValue);
    expect(satisfactionContext({ ...state, buildings: ["cafe"] }).venueValue).toBe(satisfactionContext(hill).venueValue + 2);
  });
  it("wind hold reopens chairs at 12:15", () => {
    expect(isWindHeld("chair", "gusty", 735)).toBe(true);
    expect(isWindHeld("chair", "gusty", 735, ["wind_hold"])).toBe(false);
  });
  it("corduroy stacks with groom pass", () => {
    expect(overnight(["groom_pass", "corduroy"])[0].quality - overnight(["groom_pass"])[0].quality).toBeCloseTo(0.03);
  });
  it("snow fences protect the last two trail segments from thaw", () => {
    const plain = overnight([], "thaw");
    const fenced = overnight(["snow_fences"], "thaw");
    expect(fenced.slice(0, -2)).toEqual(plain.slice(0, -2));
    expect(fenced.at(-1)!.depth - plain.at(-1)!.depth).toBeCloseTo(0.14 * 0.3);
  });
  it("heritage sign earns reputation on Sunday", () => {
    const close = (dayIndex: number, talent = "") => openNight({ ...withTalent(talent), dayIndex }).reputation;
    expect(close(7, "heritage_sign")).toBe(close(7) + 2);
    expect(close(8, "heritage_sign")).toBe(close(8));
  });
  it("bull wheel stacks only on chairs", () => {
    expect(liftCapacityPerHour("chair", ["patrol_radio", "bull_wheel"])).toBeCloseTo(liftCapacityPerHour("chair", []) * 1.05 ** 2);
    expect(liftCapacityPerHour("surface", ["bull_wheel"])).toBe(liftCapacityPerHour("surface", []));
  });
  it("ski school improves the first-timer welcome by two satisfaction points", () => {
    const terms = (persona: "first_timer" | "regular", id = "") =>
      guestTerms(makeGuest({ persona }), satisfactionContext(withTalent(id))).arrivalMood;
    expect(terms("first_timer", "ski_school") - terms("first_timer")).toBeCloseTo(2);
    expect(terms("regular", "ski_school")).toBe(terms("regular"));
  });
  it("early plow recovers three storm-day arrivals", () => {
    const storm = { ...hill, weather: "storm" as const };
    expect(meanArrivals(withTalent("early_plow", storm))).toBe(meanArrivals(storm) + 3);
  });
  it("volunteer patrol reduces fixed costs", () => {
    expect(operatingCosts(withTalent("volunteer_patrol")).fixed).toBe(operatingCosts(hill).fixed - 50);
  });
  it("night lights keep the lift queue open ten more minutes", () => {
    const at = (now: number, talentsOwned: string[]) => tickGuests([makeGuest({ state: "queue" })], {
      ...hill, talentsOwned, lapOverheadMin: 3, now,
    })[0].state;
    expect(at(LIFT_CLOSE_MIN, [])).toBe("depart");
    expect(at(LIFT_CLOSE_MIN + 9, ["night_lights"])).toBe("queue");
    expect(at(LIFT_CLOSE_MIN + 10, ["night_lights"])).toBe("depart");
  });
  it("groomer rebuild lowers the preview and actual service charge", () => {
    const state = acknowledgeBeat(openNight(withTalent("groomer_rebuild")));
    for (const [snow, cost] of [["mid", 120], ["high", 300]] as const) {
      expect(previewOvernight(state, snow).cost).toBe(cost);
      expect(sleep({ ...state, pendingSnow: snow }).lastDay?.snowNightCost).toBe(cost);
    }
  });
  it("first aid hut softens negative snow terms only", () => {
    const snow = (snowSum: number, id = "") => guestTerms(makeGuest({ runs: 1, snowSum }), satisfactionContext(withTalent(id))).snow;
    expect(snow(0.2, "first_aid_hut")).toBeCloseTo(snow(0.2) * 0.85);
    expect(snow(0.8, "first_aid_hut")).toBe(snow(0.8));
  });
  it("billboard raises expected value by two dollars", () => {
    expect(expectedHillValue(40, [], ["route100_billboard"])).toBe(expectedHillValue(40, []) + 2);
  });
});
